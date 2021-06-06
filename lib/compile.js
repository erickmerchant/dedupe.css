import fs from 'fs'
import path from 'path'
import postcss from 'postcss'
import postcssSortMediaQueries from 'postcss-sort-media-queries'
import {gray} from 'sergeant'
import stream from 'stream'
import {promisify} from 'util'

import {RAW} from '../css.js'
import {buildData} from './build-data.js'
import {classesFactoryTemplate} from './classes-factory-template.js'
import {createGetUniqueID} from './create-get-unique-id.js'
import {createMultiGenerator} from './create-multi-generator.js'
import {createSingleGenerator} from './create-single-generator.js'
import {devTemplate} from './dev-template.js'
import {getHashOfFile} from './get-hash-of-file.js'
import * as model from './model.js'
import {parse} from './parse.js'
import {template} from './template.js'

const finished = promisify(stream.finished)
const mkdir = promisify(fs.mkdir)
const createWriteStream = fs.createWriteStream

export const compile = async (args) => {
  const cacheBustedInput = `${args.input}?${Date.now()}`

  const input = await import(cacheBustedInput)

  const inputStyles = {}

  for (const namespace of Object.keys(input)) {
    if (namespace.startsWith('_')) continue

    inputStyles[namespace] = parse(input[namespace]?.[RAW])
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

  if (input?._start?.[RAW]) {
    const start = parse(input?._start?.[RAW]).parsed

    css.append(start)
  }

  const getUniqueID = createGetUniqueID(args['--prefix'] ?? '')

  const multiGenerator = createMultiGenerator(getUniqueID, addToMap)

  const singleGenerator = createSingleGenerator(getUniqueID, addToMap)

  for (const namespace of Object.keys(inputStyles)) {
    if (inputStyles[namespace].error) {
      throw inputStyles[namespace].error
    }

    for (const [name, parsed] of Object.entries(
      inputStyles[namespace].classes
    )) {
      const context = {namespace, name, position: 0}

      for (const node of parsed) {
        await buildData(node, context)
      }
    }
  }

  const nameMap = {}

  const buildCSS = async (searchID) => {
    let cssStr = ''

    const shorts = await model.selectShorthandGroups(searchID)

    cssStr += await multiGenerator(shorts, nameMap, searchID)

    const singles = await model.selectSingles(searchID)

    cssStr += await singleGenerator(singles, nameMap)

    const multis = await model.selectMultipleGroups(searchID)

    cssStr += await multiGenerator(multis, nameMap, searchID)

    const atrules = await model.selectAtrules(searchID)

    for (let i = 0; i < atrules.length; i++) {
      const {name, id} = atrules[i]

      cssStr += `${name}{${await buildCSS(id)}}`
    }

    return cssStr
  }

  css.append(await buildCSS(0))

  css.append(input?._end?.[RAW] ? parse(input._end[RAW])?.parsed : '')

  output.css.end(
    (
      await postcss([postcssSortMediaQueries]).process(css, {
        from: 'styles.css'
      })
    ).css
  )

  let i = 0

  let classesFactoryId = '_'

  while (map[classesFactoryId] != null) {
    classesFactoryId = `_${++i}`
  }

  output.js.write(classesFactoryTemplate(classesFactoryId, args['--dev']))

  for (const namespace of Object.keys(map)) {
    for (const name of Object.keys(map[namespace])) {
      map[namespace][name] = Array.from(map[namespace][name]).join(' ')
    }

    if (args['--dev']) {
      output.js.write(
        devTemplate(classesFactoryId, namespace, Object.entries(map[namespace]))
      )
    } else {
      output.js.write(
        template(classesFactoryId, namespace, Object.entries(map[namespace]))
      )
    }
  }

  output.js.end('')

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
