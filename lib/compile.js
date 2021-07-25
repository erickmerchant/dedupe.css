import fs from 'fs/promises'
import {gray} from 'kleur/colors'
import path from 'path'
import postcss from 'postcss'
import postcssSortMediaQueries from 'postcss-sort-media-queries'

import {RAW} from '../css.js'
import {buildData} from './build-data.js'
import {devTemplate} from './dev-template.js'
import {createGetClassName} from './get-class-name.js'
import {getHashOfFile} from './get-hash-of-file.js'
import * as model from './model.js'
import {createMultiGenerator} from './multi-generator.js'
import {parse} from './parse.js'
import {createSingleGenerator} from './single-generator.js'
import {template} from './template.js'

export const compile = async (args) => {
  const cacheBustedInput = `${args.input}?${Date.now()}`

  const input = await import(cacheBustedInput)

  const inputStyles = {}

  for (const namespace of Object.keys(input)) {
    if (namespace.startsWith('_')) continue

    inputStyles[namespace] = parse(input[namespace]?.[RAW])
  }

  await fs.mkdir(path.join(process.cwd(), args.output), {
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
    css: {
      result: '',
      hash: cssHash
    },
    js: {
      result: '',
      hash: jsHash
    }
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

  const getClassName = createGetClassName(addToMap, args['--prefix'] ?? '')

  const multiGenerator = createMultiGenerator(getClassName)

  const singleGenerator = createSingleGenerator(getClassName, model)

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

  const buildCSS = async (searchID) => {
    let cssStr = ''

    cssStr += await multiGenerator(
      await model.selectShorthandGroups(searchID),
      searchID
    )

    cssStr += await singleGenerator(
      await model.selectSingles(searchID),
      searchID
    )

    cssStr += await multiGenerator(
      await model.selectMultipleGroups(searchID),
      searchID
    )

    const atrules = await model.selectAtrules(searchID)

    for (let i = 0; i < atrules.length; i++) {
      const {name, id} = atrules[i]

      cssStr += `${name}{${await buildCSS(id)}}`
    }

    return cssStr
  }

  css.append(await buildCSS(0))

  css.append(input?._end?.[RAW] ? parse(input._end[RAW])?.parsed : '')

  output.css.result = (
    await postcss([postcssSortMediaQueries]).process(css, {
      from: 'styles.css'
    })
  ).css

  for (const namespace of Object.keys(map)) {
    for (const name of Object.keys(map[namespace])) {
      map[namespace][name] = Array.from(map[namespace][name]).join(' ')
    }

    output.js.result += (args['--dev'] ? devTemplate : template)(
      namespace,
      map[namespace]
    )
  }

  return Promise.all(
    ['css', 'js'].map((type) =>
      fs.writeFile(`${outpath}.${type}`, output[type].result).then(async () => {
        const hash = await getHashOfFile(`${outpath}.${type}`)

        if (hash !== output[type].hash) {
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
