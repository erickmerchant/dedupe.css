import {gray} from 'kleur/colors'
import path from 'path'
import fs from 'fs'
import stream from 'stream'
import {promisify} from 'util'
import postcss from 'postcss'
import csso from 'csso'
import selectorTokenizer from 'css-selector-tokenizer'
import chokidar from 'chokidar'
import shorthandLonghands from './lib/shorthand-longhands.js'
// import isEqualArray from './lib/is-equal-array.js'
import getClassNames from './lib/get-selectors.js'
import sqlite3 from 'sqlite3'

const finished = promisify(stream.finished)
const mkdir = promisify(fs.mkdir)
const createWriteStream = fs.createWriteStream
// const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
// const letterCount = letters.length

const buildData = async (dbinsert, name, node, pseudo = '', atruleId = 0) => {
  if (node.type === 'decl') {
    const prop = node.prop
    const value = node.value

    const valueId = await dbinsert(
      'INSERT INTO value (atrule_id, prop, value) VALUES (?, ?, ?) ON CONFLICT (atrule_id, prop, value) DO UPDATE SET count = count + 1',
      atruleId,
      prop,
      value
    )

    await dbinsert(
      'INSERT INTO decl (value_id, name, pseudo) VALUES (?, ?, ?)',
      valueId,
      name,
      pseudo
    )
  } else if (node.type === 'atrule') {
    const atruleName = `@${node.name} ${node.params}`

    const newAtruleId = await dbinsert(
      'INSERT INTO atrule (parent_atrule_id, name) VALUES (?, ?) ON CONFLICT (name, parent_atrule_id) DO NOTHING',
      atruleId,
      atruleName
    )

    await Promise.all(
      node.nodes.map((n) => buildData(dbinsert, name, n, pseudo, newAtruleId))
    )
  } else if (node.type === 'rule') {
    if (pseudo) throw Error('nested rule found')

    const parsed = selectorTokenizer.parse(node.selector)

    await Promise.all(
      parsed.nodes.map(async (n) => {
        for (const nn of n.nodes) {
          if (nn.type.startsWith('pseudo')) continue

          throw Error('non-pseudo selector found')
        }

        await buildData(
          dbinsert,
          name,
          n,
          selectorTokenizer.stringify(n).trim(),
          atruleId
        )
      })
    )
  }
}

const run = async (args) => {
  const dbinstance = new sqlite3.Database(':memory:')
  const dbexec = promisify(dbinstance.exec.bind(dbinstance))
  const dbselect = promisify(dbinstance.all.bind(dbinstance))
  const dbinsert = (sql, ...params) => {
    return new Promise((resolve, reject) => {
      const statement = dbinstance.prepare(sql)

      statement.bind(...params)

      statement.run((err) => {
        if (err != null) {
          reject(err)
        } else {
          resolve(statement.lastID)
        }
      })

      statement.finalize()
    })
  }

  await dbexec(`
      CREATE TABLE decl (
        id INTEGER PRIMARY KEY,
        value_id INTEGER,
        name TEXT,
        pseudo TEXT
      );

      CREATE TABLE value (
        id INTEGER PRIMARY KEY,
        atrule_id INTEGER,
        prop TEXT,
        value TEXT,
        count INTEGER DEFAULT 1
      );

      CREATE TABLE atrule (
        id INTEGER PRIMARY KEY,
        name TEXT,
        parent_atrule_id INTEGER
      );
    `)

  await dbexec(`
      CREATE INDEX decl_value ON decl(value_id);
      CREATE INDEX value_atrule ON value(atrule_id);
      CREATE INDEX atrule_atrule ON atrule(parent_atrule_id);
      CREATE UNIQUE INDEX unique_value ON value(atrule_id, prop, value);
      CREATE UNIQUE INDEX unique_atrule ON atrule(name, parent_atrule_id);
    `)

  // let id = 0
  const existingIds = []

  // const uniqueId = () => {
  //   let result = ''

  //   do {
  //     let i = id++
  //     result = ''

  //     let r

  //     do {
  //       r = i % letterCount
  //       i = (i - r) / letterCount

  //       result = letters[r] + result
  //     } while (i)
  //   } while (existingIds.includes(result))

  //   return result
  // }

  const cacheBustedInput = `${args.input}?${Date.now()}`

  const input = await import(cacheBustedInput)

  await mkdir(path.dirname(path.join(process.cwd(), args.output)), {
    recursive: true
  })

  const output = {
    css: createWriteStream(path.join(process.cwd(), `${args.output}.css`)),
    js: createWriteStream(path.join(process.cwd(), `${args.output}.js`))
  }

  let css = ''

  const map = {}

  if (input._start) {
    css += input._start

    postcss.parse(input._start).walkRules((rule) => {
      const parsed = selectorTokenizer.parse(rule.selector)

      existingIds.push(...getClassNames(parsed))
    })
  }

  if (input._end) {
    postcss.parse(input._end).walkRules((rule) => {
      const parsed = selectorTokenizer.parse(rule.selector)

      existingIds.push(...getClassNames(parsed))
    })
  }

  const proxiedStyles = new Proxy(input.styles, {
    get(target, prop, receiver) {
      if ({}.hasOwnProperty.call(target, prop)) {
        if (typeof target[prop] === 'function') {
          return target[prop](receiver)
        }

        return target[prop]
      }

      throw Error(`${prop} is undefined`)
    }
  })

  const promises = []

  for (const name of Object.keys(input.styles)) {
    const parsed = postcss.parse(proxiedStyles[name])

    for (const node of parsed.nodes) {
      promises.push(buildData(dbinsert, name, node))
    }
  }

  await Promise.all(promises)

  css += input._end ?? ''

  if (!args['--dev']) {
    css = csso.minify(css, {restructure: false}).css
  }

  output.css.end(css)

  for (const name of Object.keys(map)) {
    map[name] = map[name].join(' ')
  }

  const stringifiedMap = JSON.stringify(map, null, 2)

  if (args['--dev']) {
    output.js.end(`export const classes = new Proxy(${stringifiedMap}, {
      get(target, prop) {
        if ({}.hasOwnProperty.call(target, prop)) {
          return target[prop]
        }

        throw Error(\`\${prop} is undefined\`)
      }
    })`)
  } else {
    output.js.end(`export const classes = ${stringifiedMap}`)
  }

  const singles = await dbselect(
    'SELECT * FROM decl LEFT JOIN value ON decl.value_id = value.id WHERE value.count = 1 ORDER BY decl.name, decl.pseudo'
  )

  console.log(singles.length)

  const multis = await dbselect(
    'SELECT * FROM decl LEFT JOIN value ON decl.value_id = value.id WHERE value.count > 1 ORDER BY decl.name, decl.pseudo'
  )

  console.log(multis.length)

  await Promise.all(
    Object.entries(shorthandLonghands).map(async ([shorthand, longhands]) => {
      const rows = await dbselect(
        `SELECT decl1.name, value1.prop as short_prop, value2.prop as long_prop
          FROM value as value1
            INNER JOIN decl as decl1 ON value1.id = decl1.value_id
            INNER JOIN decl as decl2 ON decl1.name = decl2.name
            INNER JOIN value as value2 ON value2.id = decl2.value_id
          WHERE value1.prop = ?
            AND value2.prop IN (${[...longhands].fill('?').join(', ')})
        `,
        shorthand,
        ...longhands
      )

      for (const row of rows) {
        console.warn(
          `${row.short_prop} found with ${row.long_prop} for ${row.name}`
        )
      }
    })
  )

  dbinstance.close()

  return Promise.all([
    finished(output.css).then(() => {
      process.stdout.write(`${gray('[css]')} saved ${args.output}.css\n`)
    }),
    finished(output.js).then(() => {
      process.stdout.write(`${gray('[css]')} saved ${args.output}.js\n`)
    })
  ])
}

export default async (args) => {
  args.input = path.join(process.cwd(), args.input)

  if (!args['--watch']) {
    return run(args)
  }

  run(args)

  chokidar.watch(args.input, {ignoreInitial: true}).on('change', () => {
    run(args)
  })
}
