import {gray} from 'kleur/colors'
import path from 'path'
import fs from 'fs'
import stream from 'stream'
import {promisify} from 'util'
import postcss from 'postcss'
import csso from 'csso'
import selectorTokenizer from 'css-selector-tokenizer'
import chokidar from 'chokidar'
import sqlite3 from 'sqlite3'
import shorthandLonghands from './lib/shorthand-longhands.js'
import getClassNames from './lib/get-selectors.js'
// import createGetUniqueID from './lib/create-get-unique-id.js'

const finished = promisify(stream.finished)
const mkdir = promisify(fs.mkdir)
const createWriteStream = fs.createWriteStream

const buildData = async (db, node, context = {}) => {
  if (node.type === 'decl') {
    const prop = node.prop
    const value = node.value

    await db.run(
      'INSERT INTO decl (atrule_id, prop, value, names) VALUES (?, ?, ?, ?) ON CONFLICT (atrule_id, prop, value) DO UPDATE SET count = count + 1, names = names || "," || ?',
      context.parentAtruleID ?? 0,
      prop,
      value,
      context.name,
      context.name
    )

    const {id: declID} = await db.get(
      'SELECT id FROM decl WHERE atrule_id = ? AND prop = ? AND value = ?',
      context.parentAtruleID ?? 0,
      prop,
      value
    )

    await db.run(
      'INSERT INTO rule (decl_id, name, pseudo) VALUES (?, ?, ?)',
      declID,
      context.name,
      context.pseudo ?? ''
    )
  } else if (node.type === 'atrule') {
    const atruleName = `@${node.name} ${node.params}`

    await db.run(
      'INSERT INTO atrule (parent_atrule_id, name) VALUES (?, ?) ON CONFLICT (name, parent_atrule_id) DO NOTHING',
      context.parentAtruleID ?? 0,
      atruleName
    )

    const {id: atruleID} = await db.get(
      'SELECT id FROM atrule WHERE parent_atrule_id = ? AND name = ?',
      context.parentAtruleID ?? 0,
      atruleName
    )

    await Promise.all([
      db.run(
        'INSERT INTO atrule_position (name, atrule_id, position) VALUES (?, ?, ?)',
        context.name,
        atruleID,
        context.position++
      ),
      ...node.nodes.map(async (n) =>
        buildData(db, n, {
          ...context,
          position: 0,
          parentID: atruleID
        })
      )
    ])
  } else if (node.type === 'rule') {
    if (context.pseudo) throw Error('nested rule found')

    const parsed = selectorTokenizer.parse(node.selector)

    await Promise.all(
      parsed.nodes.map(async (n) => {
        for (const nn of n.nodes) {
          if (nn.type.startsWith('pseudo')) continue

          throw Error('non-pseudo selector found')
        }

        const pseudo = selectorTokenizer.stringify(n).trim()

        await buildData(db, n, {...context, pseudo})
      })
    )
  }
}

const run = async (args) => {
  const dbinstance = new sqlite3.Database(':memory:')
  const db = {
    exec: promisify(dbinstance.exec.bind(dbinstance)),
    all: promisify(dbinstance.all.bind(dbinstance)),
    get: promisify(dbinstance.get.bind(dbinstance)),
    run: promisify(dbinstance.run.bind(dbinstance))
  }

  await db.exec(`
    CREATE TABLE rule (
      id INTEGER PRIMARY KEY,
      decl_id INTEGER,
      name TEXT,
      pseudo TEXT
    );

    CREATE TABLE decl (
      id INTEGER PRIMARY KEY,
      atrule_id INTEGER,
      prop TEXT,
      value TEXT,
      count INTEGER DEFAULT 1,
      names TEXT
    );

    CREATE TABLE atrule (
      id INTEGER PRIMARY KEY,
      name TEXT,
      parent_atrule_id INTEGER
    );

    CREATE TABLE atrule_position (
      id INTEGER PRIMARY KEY,
      name TEXT,
      atrule_id INTEGER,
      position INTEGER
    );

    CREATE INDEX rule_decl ON rule(decl_id);
    CREATE INDEX decl_atrule ON decl(atrule_id);
    CREATE INDEX atrule_atrule ON atrule(parent_atrule_id);
    CREATE UNIQUE INDEX unique_decl ON decl(atrule_id, prop, value);
    CREATE UNIQUE INDEX unique_atrule ON atrule(name, parent_atrule_id);
  `)

  const existingIDs = []

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

      existingIDs.push(...getClassNames(parsed))
    })
  }

  if (input._end) {
    postcss.parse(input._end).walkRules((rule) => {
      const parsed = selectorTokenizer.parse(rule.selector)

      existingIDs.push(...getClassNames(parsed))
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

    const context = {name, position: 0}

    for (const node of parsed.nodes) {
      promises.push(buildData(db, node, context))
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

  const atrules = await db.all('SELECT * FROM atrule')

  console.log(atrules)

  const atrulePositionsMultis = await db.all(
    'SELECT * FROM atrule_position WHERE name IN (SELECT name FROM atrule_position GROUP BY name HAVING count(id) > 1) ORDER BY name, position'
  )

  const atrulePositionsSingles = await db.all(
    'SELECT * FROM atrule_position WHERE name IN (SELECT name FROM atrule_position GROUP BY name HAVING count(id) = 1)'
  )

  const unorderedAtruleIDs = []
  const orderedAtruleIDs = []

  for (const {atrule_id: atruleID} of atrulePositionsSingles) {
    unorderedAtruleIDs.push(atruleID)
  }

  let index = 0

  for (const {atrule_id: atruleID} of atrulePositionsMultis) {
    const unorderedIndex = unorderedAtruleIDs.indexOf(atruleID)

    if (~unorderedIndex) {
      unorderedAtruleIDs.splice(unorderedIndex, 1)
    }

    const orderedIndex = orderedAtruleIDs.indexOf(atruleID)

    if (~orderedIndex) {
      index = orderedIndex
    } else {
      orderedAtruleIDs.splice(++index, 0, atruleID)
    }
  }

  const sortedAtruleIDs = unorderedAtruleIDs.concat(orderedAtruleIDs)

  console.log(sortedAtruleIDs)

  const singles = await db.all(
    'SELECT * FROM rule LEFT JOIN decl ON rule.decl_id = decl.id WHERE decl.count = 1 ORDER BY rule.name, rule.pseudo'
  )

  console.log(singles.length)

  const multis = await db.all(
    'SELECT * FROM rule LEFT JOIN decl ON rule.decl_id = decl.id WHERE decl.count > 1 ORDER BY decl.names, rule.name, rule.pseudo'
  )

  console.log(multis.length)

  await Promise.all(
    Object.entries(shorthandLonghands).map(async ([shorthand, longhands]) => {
      const rows = await db.all(
        `SELECT rule1.name, decl1.prop as short_prop, decl2.prop as long_prop
          FROM decl as decl1
            INNER JOIN rule as rule1 ON decl1.id = rule1.decl_id
            INNER JOIN rule as rule2 ON rule1.name = rule2.name
            INNER JOIN decl as decl2 ON decl2.id = rule2.decl_id
          WHERE decl1.prop = ?
            AND decl2.prop IN (${[...longhands].fill('?').join(', ')})
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
