import crypto from 'crypto'
import selectorTokenizer from 'css-selector-tokenizer'
import fs from 'fs'
import path from 'path'
import postcss from 'postcss'
import {gray} from 'sergeant'
import sqlite3 from 'sqlite3'
import stream from 'stream'
import {promisify} from 'util'

import {createGetUniqueID} from './lib/create-get-unique-id.js'
import {shorthandLonghands} from './lib/shorthand-longhands.js'

const PARSED = Symbol('parsed')

const finished = promisify(stream.finished)
const mkdir = promisify(fs.mkdir)
const readFile = promisify(fs.readFile)
const fstat = promisify(fs.stat)
const createWriteStream = fs.createWriteStream

const getHashOfFile = async (file) => {
  const stat = await fstat(file).catch(() => false)

  if (!stat) return false

  const content = await readFile(file, 'utf8')

  return crypto.createHash('sha256').update(content).digest('hex')
}

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

export const css = (strs, ...vars) => {
  let str = ''

  const replacements = {}

  for (let i = 0; i < strs.length; i++) {
    str += strs[i]

    if (vars[i] != null) {
      if (Array.isArray(vars[i])) {
        const key = `${Date.now()}-${i}`

        str += `/*${key}*/`

        replacements[key] = vars[i]
      } else {
        str += vars[i]
      }
    }
  }

  const parsed = postcss.parse(str)

  parsed.walkComments((comment) => {
    if (replacements[comment.text] != null) {
      for (const node of replacements[comment.text]) {
        comment.before(node.clone())
      }

      comment.remove()
    }
  })

  const result = {
    [PARSED]: parsed
  }

  parsed.each((node) => {
    const selectors = selectorTokenizer.parse(node.selector)

    for (const selector of selectors.nodes) {
      if (selector.nodes.length === 1 && selector.nodes[0].type === 'class') {
        const arr = result[selector.nodes[0].name] ?? []

        result[selector.nodes[0].name] = arr.concat(node.nodes)
      }
    }
  })

  return result
}

export const compileCSS = async (args) => {
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

    CREATE INDEX declAtrule ON decl(atruleID);
    CREATE INDEX atruleAtrule ON atrule(parentAtruleID);
    CREATE UNIQUE INDEX uniqueName ON name(name, namespace);
    CREATE UNIQUE INDEX uniqueDecl ON decl(atruleID, nameID, pseudo, prop);
    CREATE UNIQUE INDEX uniqueAtrule ON atrule(parentAtruleID, name);
  `)

  const cacheBustedInput = `${args.input}?${Date.now()}`

  const input = await import(cacheBustedInput)

  const inputStyles = {}

  for (const namespace of Object.keys(input)) {
    if (namespace.startsWith('_')) continue

    inputStyles[namespace] = input[namespace]
  }

  await mkdir(path.join(process.cwd(), args.output), {
    recursive: true
  })

  const outpath = path.join(
    process.cwd(),
    args.output,
    path.basename(args.input, path.extname(args.input))
  )

  const [cssHash, jsHash] = await Promise.all([
    getHashOfFile(`${outpath}.css`),
    getHashOfFile(`${outpath}.js`)
  ])

  const output = {
    cssHash,
    css: createWriteStream(`${outpath}.css`),
    jsHash,
    js: createWriteStream(`${outpath}.js`)
  }

  const css = postcss.parse('')

  const map = {}

  const addToMap = (namespace, name, id) => {
    if (map[namespace] == null) {
      map[namespace] = {}
    }

    if (map[namespace][name] == null) {
      map[namespace][name] = new Set()
    }

    map[namespace][name].add(id)
  }

  if (input._start) {
    const start = input._start[PARSED]

    css.append(start)
  }

  const getUniqueID = createGetUniqueID(args['--prefix'] ?? '')

  for (const namespace of Object.keys(inputStyles)) {
    for (const name of Object.keys(inputStyles[namespace])) {
      const parsed = inputStyles[namespace][name]

      const context = {namespace, name, position: 0}

      for (const node of parsed) {
        await buildData(db, node, context)
      }
    }
  }

  const atrules = await db.all('SELECT parentAtruleID, name, id FROM atrule')

  const order = []

  if (input._atrules != null) {
    for (const key of Reflect.ownKeys(input._atrules)) {
      order.push(input._atrules[key])
    }
  }

  atrules.sort((a, b) => {
    const aIndex = order.indexOf(a.name)
    const bIndex = order.indexOf(b.name)

    if (aIndex === bIndex) {
      return 0
    }

    if (!~aIndex) {
      return -1
    }

    if (!~bIndex) {
      return 1
    }

    return aIndex - bIndex
  })

  const nameMap = {}

  const buildCSS = async (searchID) => {
    let cssStr = ''

    const singles = await db.all(
      'SELECT name, nameID, namespace, prop, pseudo, value, GROUP_CONCAT(DISTINCT nameID) as nameIDs, GROUP_CONCAT(DISTINCT pseudo) as pseudos FROM decl LEFT JOIN name ON decl.nameID = name.id WHERE atruleID = ? GROUP BY atruleID, prop, value HAVING COUNT(decl.id) = 1 ORDER BY nameIDs, pseudos',
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

        let semi = true

        if (
          single.nameID !== prevSingle?.nameID ||
          single.pseudo !== prevSingle?.pseudo
        ) {
          if (prevSingle != null) cssStr += `}`

          cssStr += `.${id}${single.pseudo}{`

          semi = false
        }

        cssStr += `${semi ? ';' : ''}${single.prop}:${single.value}`

        prevSingle = single
      }

      cssStr += `}`
    }

    const multis = await db.all(
      'SELECT atruleID, prop, value, GROUP_CONCAT(DISTINCT nameID) as nameIDs, GROUP_CONCAT(DISTINCT pseudo) as pseudos FROM decl WHERE atruleID = ? GROUP BY atruleID, prop, value HAVING COUNT(id) > 1 ORDER BY nameIDs, pseudos',
      searchID
    )

    let prevMulti

    if (multis.length) {
      for (const multi of multis) {
        let semi = true

        if (
          prevMulti?.nameIDs !== multi.nameIDs ||
          prevMulti?.pseudos !== multi.pseudos
        ) {
          const rules = await db.all(
            'SELECT namespace, name, pseudo, nameID FROM decl LEFT JOIN name ON decl.nameID = name.id WHERE atruleID = ? AND prop = ? AND value = ? ORDER BY pseudo, nameID',
            multi.atruleID,
            multi.prop,
            multi.value
          )

          if (prevMulti != null) cssStr += `}`

          let prevPseudo
          let id
          const selectors = []

          for (const rule of rules) {
            if (prevPseudo !== rule.pseudo) {
              id = getUniqueID()

              selectors.push(`.${id}${rule.pseudo}`)
            }

            addToMap(rule.namespace, rule.name, id)

            prevPseudo = rule.pseudo
          }

          cssStr += `${selectors.join(',')}{`

          semi = false
        }

        cssStr += `${semi ? ';' : ''}${multi.prop}:${multi.value}`

        prevMulti = multi
      }

      cssStr += `}`
    }

    for (let i = 0; i < atrules.length; i++) {
      const {parentAtruleID, name, id} = atrules[i]

      if (parentAtruleID === searchID) {
        cssStr += `${name}{`

        cssStr += await buildCSS(id)

        cssStr += '}'
      }
    }

    return cssStr
  }

  css.append(await buildCSS(0))

  await Promise.all(
    Object.entries(shorthandLonghands).map(async ([shorthand, longhands]) => {
      const rows = await db.all(
        `SELECT name.name, decl1.prop as shortProp, decl2.prop as longProp
          FROM name
            INNER JOIN decl as decl1 ON decl1.nameID = name.id
            INNER JOIN decl as decl2 ON decl1.nameID = decl2.nameID
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

  css.append(input._end?.[PARSED] ?? '')

  output.css.end(css.toResult().css)

  for (const namespace of Object.keys(map)) {
    for (const name of Object.keys(map[namespace])) {
      map[namespace][name] = Array.from(map[namespace][name]).join(' ')
    }

    if (args['--dev']) {
      output.js.write(`export const ${namespace} = new Proxy({${Object.entries(
        map[namespace]
      )
        .map(
          ([key, value]) =>
            `get [${JSON.stringify(key)}]() { return ${JSON.stringify(value)} }`
        )
        .join(',')}}, {
        get(target, prop) {
          if ({}.hasOwnProperty.call(target, prop)) {
            return '${namespace}:' + prop + ' ' + target[prop]
          }

          throw Error(\`\${prop} is undefined\`)
        }
      })\n`)
    } else {
      output.js.write(
        `export const ${namespace} = ${JSON.stringify(
          map[namespace],
          null,
          2
        )}\n`
      )
    }
  }

  output.js.end('')

  dbinstance.close()

  return Promise.all(
    ['css', 'js'].map((type) =>
      finished(output[type]).then(async () => {
        const hash = await getHashOfFile(`${outpath}.${type}`)

        if (hash !== output[`${type}Hash`]) {
          console.log(
            `${gray('[css]')} saved ${path.relative(
              process.cwd(),
              outpath
            )}.${type}`
          )
        }
      })
    )
  )
}
