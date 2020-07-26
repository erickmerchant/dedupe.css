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
import createGetUniqueID from './lib/create-get-unique-id.js'

const finished = promisify(stream.finished)
const mkdir = promisify(fs.mkdir)
const createWriteStream = fs.createWriteStream

const buildData = async (db, node, context = {}) => {
  if (node.type === 'decl') {
    const prop = node.prop
    const value = node.value

    await db.run(
      'INSERT INTO decl (atruleID, name, pseudo, prop, value) VALUES (?, ?, ?, ?, ?) ON CONFLICT (atruleID, name, pseudo, prop) DO UPDATE set value = ?',
      context.parentAtruleID ?? 0,
      context.name,
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
      'INSERT INTO atrulePosition (atruleID, position, name) VALUES (?, ?, ?)',
      atruleID,
      context.position++,
      context.name
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

const run = async (args) => {
  const dbinstance = new sqlite3.Database(':memory:')

  const db = {
    exec: promisify(dbinstance.exec.bind(dbinstance)),
    all: promisify(dbinstance.all.bind(dbinstance)),
    get: promisify(dbinstance.get.bind(dbinstance)),
    run: promisify(dbinstance.run.bind(dbinstance))
  }

  await db.exec(`
    CREATE TABLE decl (
      id INTEGER PRIMARY KEY,
      atruleID INTEGER,
      name TEXT,
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
      name TEXT
    );

    CREATE INDEX declAtrule ON decl(atruleID);
    CREATE INDEX atruleAtrule ON atrule(parentAtruleID);
    CREATE UNIQUE INDEX uniqueDecl ON decl(atruleID, name, pseudo, prop);
    CREATE UNIQUE INDEX uniqueAtrule ON atrule(parentAtruleID, name);
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

  const addToMap = (name, id) => {
    if (map[name] == null) {
      map[name] = []
    }

    map[name].push(id)
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

  for (const name of Object.keys(input.styles)) {
    const parsed = postcss.parse(proxiedStyles[name])

    const context = {name, position: 0}

    for (const node of parsed.nodes) {
      await buildData(db, node, context)
    }
  }

  const atrules = await db.all('SELECT * FROM atrule')

  const atrulePositionsMultis = await db.all(
    'SELECT * FROM atrulePosition WHERE name IN (SELECT name FROM atrulePosition GROUP BY name HAVING COUNT(id) > 1) ORDER BY name, position'
  )

  const atrulePositionsSingles = await db.all(
    'SELECT * FROM atrulePosition WHERE name IN (SELECT name FROM atrulePosition GROUP BY name HAVING COUNT(id) = 1)'
  )

  const unorderedAtruleIDs = []
  const orderedAtruleIDs = []

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
    const singles = await db.all(
      'SELECT * FROM decl WHERE atruleID = ? GROUP BY atruleID, prop, value HAVING COUNT(id) = 1',
      searchID
    )

    let prevSingle

    if (singles.length) {
      let id

      for (const single of singles) {
        if (single.name !== prevSingle?.name) {
          id = getUniqueID()

          addToMap(single.name, id)
        }

        if (
          single.name !== prevSingle?.name ||
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

    const multis = await db.all(
      'SELECT *, GROUP_CONCAT(name) as names, GROUP_CONCAT(pseudo) as pseudos FROM decl WHERE atruleID = ? GROUP BY atruleID, prop, value HAVING COUNT(id) > 1 ORDER BY names, pseudos',
      searchID
    )

    let prevMulti

    if (multis.length) {
      for (const multi of multis) {
        if (
          prevMulti?.names !== multi.names ||
          prevMulti?.pseudos !== multi.pseudos
        ) {
          const rules = await db.all(
            'SELECT name, pseudo FROM decl WHERE atruleID = ? AND prop = ? AND value = ? ORDER BY pseudo, name',
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

            addToMap(rule.name, id)

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
        `SELECT decl1.name, decl1.prop as shortProp, decl2.prop as longProp
          FROM decl as decl1
            INNER JOIN decl as decl2 ON decl1.name = decl2.name
          WHERE decl1.pseudo = decl2.pseudo
            AND decl1.prop = ?
            AND decl2.prop IN (${[...longhands].fill('?').join(', ')})
        `,
        shorthand,
        ...longhands
      )

      for (const row of rows) {
        console.warn(
          `${row.shortProp} found with ${row.longProp} for ${row.name}`
        )
      }
    })
  )

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

  if (!args['--watch']) {
    return run(args)
  }

  run(args)

  chokidar.watch(args.input, {ignoreInitial: true}).on('change', () => {
    run(args)
  })
}
