import {gray} from 'kleur/colors'
import path from 'path'
import fs from 'fs'
import stream from 'stream'
import {promisify} from 'util'
import postcss from 'postcss'
import selectorTokenizer from 'css-selector-tokenizer'
import chokidar from 'chokidar'
import sqlite3 from 'sqlite3'
import shorthandLonghands from './lib/shorthand-longhands.js'
import getClassNames from './lib/get-selectors.js'
import createGetUniqueID from './lib/create-get-unique-id.js'

const finished = promisify(stream.finished)
const mkdir = promisify(fs.mkdir)
const createWriteStream = fs.createWriteStream

const buildData = async (db, node, context = {}) => {
  if (node.type === 'decl') {
    const prop = node.prop
    const value = node.value

    await db.run(
      'INSERT INTO name (name, namespace) VALUES (?, ?) ON CONFLICT (name, namespace) DO NOTHING',
      context.name,
      context.namespace
    )

    const {nameID} = await db.get(
      'SELECT id as nameID FROM name WHERE name = ? AND namespace = ?',
      context.name,
      context.namespace
    )

    await db.run(
      'INSERT INTO decl (atruleID, nameID, pseudo, prop, value) VALUES (?, ?, ?, ?, ?) ON CONFLICT (atruleID, nameID, pseudo, prop) DO UPDATE set value = ?',
      context.parentAtruleID ?? 0,
      nameID,
      context.pseudo ?? '',
      prop,
      value,
      value
    )
  } else if (node.type === 'atrule') {
    const atruleName = `@${node.name} ${node.params}`

    await db.run(
      'INSERT INTO atrule (parentAtruleID, name) VALUES (?, ?) ON CONFLICT (parentAtruleID, name) DO NOTHING',
      context.parentAtruleID ?? 0,
      atruleName
    )

    const {atruleID} = await db.get(
      'SELECT id as atruleID FROM atrule WHERE parentAtruleID = ? AND name = ?',
      context.parentAtruleID ?? 0,
      atruleName
    )

    await db.run(
      'INSERT INTO name (name, namespace) VALUES (?, ?) ON CONFLICT (name, namespace) DO NOTHING',
      context.name,
      context.namespace
    )

    const {nameID} = await db.get(
      'SELECT id as nameID FROM name WHERE name = ? AND namespace = ?',
      context.name,
      context.namespace
    )

    await db.run(
      'INSERT INTO atrulePosition (atruleID, position, nameID) VALUES (?, ?, ?)',
      atruleID,
      context.position++,
      nameID
    )

    for (const n of node.nodes) {
      await buildData(db, n, {
        ...context,
        position: 0,
        parentAtruleID: atruleID
      })
    }
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

        for (const n of node.nodes) {
          await buildData(db, n, {...context, pseudo})
        }
      })
    )
  }
}

const run = async (args, importAndWatch) => {
  const dbinstance = new sqlite3.Database(':memory:')

  const db = {
    exec: promisify(dbinstance.exec.bind(dbinstance)),
    all: promisify(dbinstance.all.bind(dbinstance)),
    get: promisify(dbinstance.get.bind(dbinstance)),
    run: promisify(dbinstance.run.bind(dbinstance))
  }

  await db.exec(`
    CREATE TABLE name (
      id INTEGER PRIMARY KEY,
      name TEXT,
      namespace TEXT
    );

    CREATE TABLE decl (
      id INTEGER PRIMARY KEY,
      atruleID INTEGER,
      nameID INTEGER,
      pseudo TEXT,
      prop TEXT,
      value TEXT
    );

    CREATE TABLE atrule (
      id INTEGER PRIMARY KEY,
      parentAtruleID INTEGER,
      name TEXT
    );

    CREATE TABLE atrulePosition (
      id INTEGER PRIMARY KEY,
      atruleID INTEGER,
      position INTEGER,
      nameID INTEGER
    );

    CREATE INDEX declAtrule ON decl(atruleID);
    CREATE INDEX atruleAtrule ON atrule(parentAtruleID);
    CREATE UNIQUE INDEX uniqueName ON name(name, namespace);
    CREATE UNIQUE INDEX uniqueDecl ON decl(atruleID, nameID, pseudo, prop);
    CREATE UNIQUE INDEX uniqueAtrule ON atrule(parentAtruleID, name);
  `)

  const existingIDs = []

  const cacheBustedInput = `${args.input}?${Date.now()}`

  const input = await import(cacheBustedInput)

  const inputStyles = {}

  for (const namespace of Object.keys(input)) {
    if (namespace.startsWith('_')) continue

    if (typeof input[namespace] === 'function') {
      inputStyles[namespace] = await input[namespace](importAndWatch)
    } else {
      inputStyles[namespace] = input[namespace]
    }
  }

  await mkdir(path.dirname(path.join(process.cwd(), args.output)), {
    recursive: true
  })

  const output = {
    css: createWriteStream(path.join(process.cwd(), `${args.output}.css`)),
    js: createWriteStream(path.join(process.cwd(), `${args.output}.js`))
  }

  let css = ''

  const map = {}

  const addToMap = (namespace, name, id) => {
    if (map[namespace] == null) {
      map[namespace] = {}
    }

    if (map[namespace][name] == null) {
      map[namespace][name] = []
    }

    map[namespace][name].push(id)
  }

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

  const getUniqueID = createGetUniqueID(existingIDs)

  for (const namespace of Object.keys(inputStyles)) {
    for (const name of Object.keys(inputStyles[namespace])) {
      const parsed = postcss.parse(inputStyles[namespace][name])

      const context = {namespace, name, position: 0}

      for (const node of parsed.nodes) {
        await buildData(db, node, context)
      }
    }
  }

  const atrules = await db.all('SELECT * FROM atrule')

  const atrulePositionsMultis = await db.all(
    'SELECT * FROM atrulePosition WHERE nameID IN (SELECT nameID FROM atrulePosition GROUP BY nameID HAVING COUNT(id) > 1) ORDER BY nameID, position'
  )

  const atrulePositionsSingles = await db.all(
    'SELECT * FROM atrulePosition WHERE nameID IN (SELECT nameID FROM atrulePosition GROUP BY nameID HAVING COUNT(id) = 1)'
  )

  const unorderedAtruleIDs = []
  const orderedAtruleIDs = []
  const nameMap = {}

  for (const {atruleID} of atrulePositionsSingles) {
    unorderedAtruleIDs.push(atruleID)
  }

  let index = 0

  for (const {atruleID} of atrulePositionsMultis) {
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

  atrules.sort(
    (a, b) => sortedAtruleIDs.indexOf(a.id) - sortedAtruleIDs.indexOf(b.id)
  )

  const buildCSS = async (searchID) => {
    const singles = args['--no-optimize']
      ? await db.all(
          'SELECT * FROM decl LEFT JOIN name ON decl.nameID = name.id WHERE atruleID = ? ORDER BY nameID, pseudo',
          searchID
        )
      : await db.all(
          'SELECT *, GROUP_CONCAT(nameID, " ") as nameIDs, GROUP_CONCAT(pseudo) as pseudos FROM decl LEFT JOIN name ON decl.nameID = name.id WHERE atruleID = ? GROUP BY atruleID, prop, value HAVING COUNT(decl.id) = 1 ORDER BY nameIDs, pseudos',
          searchID
        )

    let prevSingle

    if (singles.length) {
      let id

      for (const single of singles) {
        if (single.nameID !== prevSingle?.nameID) {
          if (!nameMap[single.nameIDs ?? single.nameID]) {
            id = getUniqueID()

            nameMap[single.nameIDs ?? single.nameID] = id

            addToMap(single.namespace, single.name, id)
          } else {
            id = nameMap[single.nameIDs ?? single.nameID]
          }
        }

        if (
          single.nameID !== prevSingle?.nameID ||
          single.pseudo !== prevSingle?.pseudo
        ) {
          if (prevSingle != null) css += `} `

          css += `.${id}${single.pseudo} { `
        }

        css += `${single.prop}: ${single.value}; `

        prevSingle = single
      }

      css += `} `
    }

    const multis = args['--no-optimize']
      ? []
      : await db.all(
          'SELECT *, GROUP_CONCAT(nameID, " ") as nameIDs, GROUP_CONCAT(pseudo) as pseudos FROM decl WHERE atruleID = ? GROUP BY atruleID, prop, value HAVING COUNT(id) > 1 ORDER BY nameIDs, pseudos',
          searchID
        )

    let prevMulti

    if (multis.length) {
      for (const multi of multis) {
        if (
          prevMulti?.nameIDs !== multi.nameIDs ||
          prevMulti?.pseudos !== multi.pseudos
        ) {
          const rules = await db.all(
            'SELECT namespace, name, pseudo FROM decl LEFT JOIN name ON decl.nameID = name.id WHERE atruleID = ? AND prop = ? AND value = ? ORDER BY pseudo, nameID',
            multi.atruleID,
            multi.prop,
            multi.value
          )

          if (prevMulti != null) css += `} `

          let prevPseudo
          let id
          const selectors = []

          for (const rule of rules) {
            if (prevPseudo !== rule.pseudo) {
              id = getUniqueID()

              selectors.push(`.${id}${rule.pseudo} `)
            }

            addToMap(rule.namespace, rule.name, id)

            prevPseudo = rule.pseudo
          }

          css += `${selectors.join(', ')} { `
        }

        css += `${multi.prop}: ${multi.value}; `

        prevMulti = multi
      }

      css += `} `
    }

    for (let i = 0; i < atrules.length; i++) {
      const {parentAtruleID, name, id} = atrules[i]

      if (parentAtruleID === searchID) {
        css += `${name} { `

        await buildCSS(id)

        atrules.splice(i, 1)

        i--

        css += '} '
      }
    }
  }

  await buildCSS(0)

  await Promise.all(
    Object.entries(shorthandLonghands).map(async ([shorthand, longhands]) => {
      const rows = await db.all(
        `SELECT decl1.nameID as nameIDs, decl2.nameID as nameIDs2, decl1.prop as shortProp, decl2.prop as longProp
          FROM decl as decl1
            INNER JOIN decl as decl2 ON nameIDs = nameIDs2
          WHERE decl1.pseudo = decl2.pseudo
            AND decl1.prop = ?
            AND decl2.prop IN (${[...longhands].fill('?').join(', ')})
        `,
        shorthand,
        ...longhands
      )

      for (const row of rows) {
        console.warn(
          `${row.shortProp} found with ${row.longProp} for ${row.nameIDs}`
        )
      }
    })
  )

  css += input._end ?? ''

  output.css.end(css)

  for (const namespace of Object.keys(map)) {
    for (const name of Object.keys(map[namespace])) {
      map[namespace][name] = map[namespace][name].join(' ')
    }

    const stringifiedMap = JSON.stringify(map[namespace], null, 2)

    if (args['--dev']) {
      output.js
        .write(`export const ${namespace} = new Proxy(${stringifiedMap}, {
        get(target, prop) {
          if ({}.hasOwnProperty.call(target, prop)) {
            return target[prop]
          }

          throw Error(\`\${prop} is undefined\`)
        }
      })\n`)
    } else {
      output.js.write(`export const ${namespace} = ${stringifiedMap}\n`)
    }
  }

  output.js.end('')

  dbinstance.close()

  return Promise.all(
    ['css', 'js'].map((type) =>
      finished(output[type]).then(() => {
        process.stdout.write(`${gray('[css]')} saved ${args.output}.${type}\n`)
      })
    )
  )
}

export default async (args) => {
  args.input = path.join(process.cwd(), args.input)

  let importAndWatch = (file) => {
    return import(path.join(path.dirname(args.input), file))
  }

  if (!args['--watch']) {
    return run(args, importAndWatch)
  }

  const watcher = chokidar.watch(args.input, {ignoreInitial: true})

  const imported = []

  importAndWatch = (file) => {
    file = path.join(path.dirname(args.input), file)

    imported.push(file)

    watcher.add(file)

    return import(`${file}?${Date.now()}`)
  }

  run(args, importAndWatch)

  watcher.on('change', () => {
    watcher.unwatch(imported)

    imported.splice(0, imported.length)

    run(args, importAndWatch)
  })
}
