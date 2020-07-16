import {gray} from 'kleur/colors'
import path from 'path'
import fs from 'fs'
import stream from 'stream'
import {promisify} from 'util'
import postcss from 'postcss'
import csso from 'csso'
import selectorTokenizer from 'css-selector-tokenizer'
import chokidar from 'chokidar'
// import shorthandLonghands from './lib/shorthand-longhands.js'
// import isEqualArray from './lib/is-equal-array.js'
import getClassNames from './lib/get-selectors.js'
import sqlite3 from 'sqlite3'

const finished = promisify(stream.finished)
const mkdir = promisify(fs.mkdir)
const createWriteStream = fs.createWriteStream
// const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
// const letterCount = letters.length

const buildData = async (db, name, node, pseudo = '', atruleId = 0) => {
  if (node.type === 'decl') {
    const prop = node.prop
    const value = node.value

    await db.run(
      'INSERT INTO value (atrule_id, prop, value) VALUES (?, ?, ?) ON CONFLICT (atrule_id, prop, value) DO UPDATE SET count = count + 1',
      atruleId,
      prop,
      value
    )

    const row = await db.get(
      'SELECT id FROM value WHERE atrule_id = ? AND prop = ? AND value = ?',
      atruleId,
      prop,
      value
    )

    await db.run(
      'INSERT INTO decl (value_id, name, pseudo) VALUES (?, ?, ?)',
      row.id,
      name,
      pseudo
    )
  } else if (node.type === 'atrule') {
    const atruleName = `@${node.name} ${node.params}`

    await db.run(
      'INSERT INTO atrule (parent_atrule_id, name) VALUES (?, ?) ON CONFLICT (name, parent_atrule_id) DO NOTHING',
      atruleId,
      atruleName
    )

    const row = await db.get(
      'SELECT id FROM atrule WHERE parent_atrule_id = ? AND name = ?',
      atruleId,
      atruleName
    )

    await Promise.all(
      node.nodes.map((n) => buildData(db, name, n, pseudo, row.id))
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
          db,
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
  const db = {
    run: promisify(dbinstance.run.bind(dbinstance)),
    all: promisify(dbinstance.all.bind(dbinstance)),
    get: promisify(dbinstance.get.bind(dbinstance))
  }

  await Promise.all([
    db.run(`CREATE TABLE decl (
      id INTEGER PRIMARY KEY,
      value_id INTEGER,
      name TEXT,
      pseudo TEXT
    )`),
    db.run(`CREATE TABLE value (
      id INTEGER PRIMARY KEY,
      atrule_id INTEGER,
      prop TEXT,
      value TEXT,
      count INTEGER DEFAULT 1
    )`),
    db.run(`CREATE TABLE atrule (
      id INTEGER PRIMARY KEY,
      name TEXT,
      parent_atrule_id INTEGER
    )`)
  ])

  await Promise.all([
    db.run(`CREATE INDEX decl_value ON decl(value_id)`),
    db.run(`CREATE INDEX value_atrule ON value(atrule_id)`),
    db.run(`CREATE INDEX atrule_atrule ON atrule(parent_atrule_id)`),
    db.run(`CREATE UNIQUE INDEX unique_value ON value(atrule_id, prop, value)`),
    db.run(
      `CREATE UNIQUE INDEX unique_atrule ON atrule(name, parent_atrule_id)`
    )
  ])

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
      promises.push(buildData(db, name, node))
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

  const allDecls = await db.all(
    'SELECT * FROM decl LEFT JOIN value ON decl.value_id = value.id WHERE value.count = 1 ORDER BY decl.name, decl.pseudo'
  )

  for (const row of allDecls) {
    console.log(row)
  }

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
