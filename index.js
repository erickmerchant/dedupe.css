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
import isEqualArray from './lib/is-equal-array.js'
import getClassNames from './lib/get-selectors.js'

const finished = promisify(stream.finished)
const mkdir = promisify(fs.mkdir)
const createWriteStream = fs.createWriteStream

const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

const letterCount = letters.length

const processNodes = (nodes, pseudo, template) => {
  let results = {}

  for (const node of nodes) {
    if (node.type === 'decl') {
      const prop = node.prop
      const value = node.value

      results[`${template} ${pseudo} ${prop}`] = {
        template,
        pseudo,
        prop,
        value
      }
    } else if (node.type === 'atrule') {
      const t = `${template}@${node.name} ${node.params}`

      results = {
        ...results,
        ...processNodes(node.nodes, pseudo, t)
      }
    } else if (node.type === 'rule') {
      if (pseudo) throw Error('nested rule found')

      const parsed = selectorTokenizer.parse(node.selector)

      for (const n of parsed.nodes) {
        for (const nn of n.nodes) {
          if (nn.type.startsWith('pseudo')) continue

          throw Error('non-pseudo selector found')
        }

        results = {
          ...results,
          ...processNodes(
            node.nodes,
            selectorTokenizer.stringify(n).trim(),
            template
          )
        }
      }
    }
  }

  return results
}

const run = async (args) => {
  let id = 0
  const existingIds = []

  const uniqueId = () => {
    let result = ''

    do {
      let i = id++
      result = ''

      let r

      do {
        r = i % letterCount
        i = (i - r) / letterCount

        result = letters[r] + result
      } while (i)
    } while (existingIds.includes(result))

    return result
  }

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
  const tree = {}
  const ids = {}

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

  const unorderedTemplates = []
  const orderedTemplates = []

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
    const processed = Object.values(processNodes(parsed.nodes, '', ''))
    const bannedLonghands = {}
    const templates = []

    for (const {template, pseudo, prop} of processed) {
      if (!templates.includes(template)) templates.push(template)

      if (shorthandLonghands[prop] != null) {
        const key = `${template} ${pseudo}`

        bannedLonghands[key] = bannedLonghands[key] ?? []

        bannedLonghands[key].push(...shorthandLonghands[prop])
      }
    }

    for (const {template, pseudo, prop, value} of processed) {
      const key = `${template} ${pseudo}`

      if (bannedLonghands?.[key]?.includes(prop)) {
        console.warn(`${prop} found with shorthand`)
      }

      tree[template] = tree[template] ?? []

      const index = tree[template].findIndex(
        (r) => r.prop === prop && r.value === value
      )

      if (!~index) {
        tree[template].push({
          names: [`${name}${pseudo}`],
          prop,
          value
        })
      } else {
        tree[template][index].names.push(`${name}${pseudo}`)
      }
    }

    let index = 0

    if (templates.length > 1) {
      for (const template of templates) {
        const unorderedIndex = unorderedTemplates.indexOf(template)

        if (~unorderedIndex) {
          unorderedTemplates.splice(unorderedIndex, 1)
        }

        const orderedIndex = orderedTemplates.indexOf(template)

        if (~orderedIndex) {
          index = orderedIndex
        } else {
          orderedTemplates.splice(++index, 0, template)
        }
      }
    } else if (
      !unorderedTemplates.includes(templates[0]) &&
      !orderedTemplates.includes(templates[0])
    ) {
      unorderedTemplates.push(templates[0])
    }
  }

  const concatedTemplates = unorderedTemplates.concat(orderedTemplates)

  const templateToArray = (template) => template.split('@')

  for (let i = 0; i < concatedTemplates.length; i++) {
    const template = concatedTemplates[i]
    const splitAtrules = templateToArray(template)
    const prevAtrules = templateToArray(concatedTemplates[i - 1] ?? '')
    const nextAtrules = templateToArray(concatedTemplates[i + 1] ?? '')

    let startLine = ''
    let endLine = ''

    for (let i = 0; i < splitAtrules.length; i++) {
      if (splitAtrules[i] !== prevAtrules[i]) {
        const remainder = splitAtrules.slice(i)

        startLine = remainder
          .map((part) => (part ? ` @${part} { ` : ''))
          .join('')

        break
      }
    }

    for (let i = splitAtrules.length - 1; i >= 0; i--) {
      if (splitAtrules[i] !== nextAtrules[i]) {
        endLine += ' } '
      } else {
        break
      }
    }

    const branch = tree[template]
    const remainders = {}
    const rules = []

    while (branch.length) {
      const {prop, value, names} = branch.shift()

      if (names.length > 1) {
        const decls = {
          [prop]: value
        }

        let i = 0

        while (i < branch.length) {
          if (isEqualArray(branch[i].names, names)) {
            decls[branch[i].prop] = branch[i].value

            branch.splice(i, 1)
          } else {
            i++
          }
        }

        const selectors = {}

        for (let name of names) {
          const pseudoIndex = name.indexOf(':')
          let pseudo = ''

          if (~pseudoIndex) {
            pseudo = name.substring(pseudoIndex)

            name = name.substring(0, pseudoIndex)
          }

          let filtered

          if (!pseudo) {
            filtered = names.filter((name) => !~name.indexOf(':'))
          } else {
            filtered = names.filter((name) => {
              const i = name.indexOf(':')

              if (!~i) return false

              return name.substring(i) === pseudo
            })
          }

          filtered = filtered.join()

          selectors[pseudo] = ids[`${filtered} ${pseudo}`] ?? uniqueId()

          ids[`${filtered} ${pseudo}`] = selectors[pseudo]

          map[name] = map[name] ?? []

          if (!map[name].includes(selectors[pseudo])) {
            map[name].push(selectors[pseudo])
          }
        }

        rules.push(
          `${Object.entries(selectors)
            .map(([key, val]) => `.${val}${key}`)
            .join(', ')} { ${Object.keys(decls)
            .map((prop) => `${prop}: ${decls[prop]}`)
            .join('; ')}; }`
        )
      } else {
        const name = names[0]

        remainders[name] = remainders[name] ?? {
          name,
          decls: {}
        }

        remainders[name].decls[prop] = value
      }
    }

    for (const remainder of Object.values(remainders)) {
      let name = remainder.name

      const pseudoIndex = name.indexOf(':')
      let pseudo = ''

      if (~pseudoIndex) {
        pseudo = name.substring(pseudoIndex)

        name = name.substring(0, pseudoIndex)
      }

      const cls = ids[name] ?? uniqueId()

      ids[name] = cls

      rules.push(
        `.${cls}${pseudo} { ${Object.keys(remainder.decls)
          .map((prop) => `${prop}: ${remainder.decls[prop]}`)
          .join('; ')}; }`
      )

      map[name] = map[name] ?? []

      if (!map[name].includes(cls)) {
        map[name].push(cls)
      }
    }

    css += startLine

    css += rules.join('')

    css += endLine
  }

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

  return Promise.all([
    finished(output.css).then(() => {
      process.stdout.write(`${gray('[css]')} saved ${args.output}.css\n`)
    }),
    finished(output.js).then(() => {
      process.stdout.write(`${gray('[css]')} saved ${args.output}.js\n`)
    })
  ])
}

export default (args) => {
  args.input = path.join(process.cwd(), args.input)

  if (!args['--watch']) {
    return run(args)
  }

  run(args)

  chokidar.watch(args.input, {ignoreInitial: true}).on('change', () => {
    run(args)
  })
}
