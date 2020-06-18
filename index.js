import {gray} from 'kleur/colors'
import path from 'path'
import fs from 'fs'
import stream from 'stream'
import {promisify} from 'util'
import postcss from 'postcss'
import csso from 'csso'
import selectorTokenizer from 'css-selector-tokenizer'
import chokidar from 'chokidar'

const finished = promisify(stream.finished)
const mkdir = promisify(fs.mkdir)
const createWriteStream = fs.createWriteStream

const unsupportedShorthands = {
  'border-bottom': [
    'border-bottom-width',
    'border-bottom-style',
    'border-bottom-color'
  ],
  'border-color': [
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color'
  ],
  'border-left': [
    'border-left-width',
    'border-left-style',
    'border-left-color'
  ],
  'border-radius': [
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius'
  ],
  'border-right': [
    'border-right-width',
    'border-right-style',
    'border-right-color'
  ],
  'border-style': [
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style'
  ],
  'border-top': ['border-top-width', 'border-top-style', 'border-top-color'],
  'border-width': [
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width'
  ],
  'column-rule': [
    'column-rule-width',
    'column-rule-style',
    'column-rule-color'
  ],
  'flex-flow': ['flex-direction', 'flex-wrap'],
  'grid-area': [
    'grid-column-start',
    'grid-column-end',
    'grid-row-start',
    'grid-row-end'
  ],
  'grid-column': ['grid-column-start', 'grid-column-end'],
  'grid-row': ['grid-row-start', 'grid-row-end'],
  'grid-template': [
    'grid-template-rows',
    'grid-template-columns',
    'grid-template-areas'
  ],
  'list-style': ['list-style-type', 'list-style-image', 'list-style-position'],
  'place-content': ['align-content', 'justify-content'],
  'place-items': ['align-items', 'justify-items'],
  'place-self': ['align-self', 'justify-self'],
  'text-decoration': [
    'text-decoration-line',
    'text-decoration-color',
    'text-decoration-style',
    'text-decoration-thickness'
  ],
  'animation': [
    'animation-name',
    'animation-duration',
    'animation-timing-function',
    'animation-delay',
    'animation-iteration-count',
    'animation-direction',
    'animation-fill-mode',
    'animation-play-state'
  ],
  'background': [
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-repeat',
    'background-size',
    'background-attachment'
  ],
  'border': [
    'border-bottom-width',
    'border-bottom-style',
    'border-bottom-color',
    'border-left-width',
    'border-left-style',
    'border-left-color',
    'border-right-width',
    'border-right-style',
    'border-right-color',
    'border-top-width',
    'border-top-style',
    'border-top-color',
    'border-color',
    'border-style',
    'border-width'
  ],
  'columns': ['column-width', 'column-count'],
  'flex': ['flex-grow', 'flex-shrink', 'flex-basis'],
  'font': [
    'font-style',
    'font-variant',
    'font-weight',
    'font-stretch',
    'font-size',
    'line-height',
    'font-family'
  ],
  'grid': [
    'grid-template-rows',
    'grid-template-columns',
    'grid-template-areas',
    'grid-auto-rows',
    'grid-auto-columns',
    'grid-auto-flow'
  ],
  'margin': ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  'offset': [
    'offset-position',
    'offset-path',
    'offset-distance',
    'offset-rotate',
    'offset-anchor'
  ],
  'outline': ['outline-style', 'outline-width', 'outline-color'],
  'overflow': ['overflow-x', 'overflow-y'],
  'padding': ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  'transition': [
    'transition-property',
    'transition-duration',
    'transition-timing-function',
    'transition-delay'
  ]
}

const supportedShorthandModules = {
  'border-color': './lib/shorthands/border-color.js',
  'border-radius': './lib/shorthands/border-radius.js',
  'border-style': './lib/shorthands/border-style.js',
  'border-width': './lib/shorthands/border-width.js',
  'margin': './lib/shorthands/margin.js',
  'overflow': './lib/shorthands/overflow.js',
  'padding': './lib/shorthands/padding.js'
}

const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

const letterCount = letters.length

const isEqualArray = (a, b) => {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }

  return true
}

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

const processSelectors = (node) => {
  const results = []

  if (node.nodes) {
    for (const n of node.nodes) {
      if (n.type === 'class') {
        results.push(n.name)
      }

      if (n.nodes) {
        results.push(...processSelectors(n))
      }
    }
  }

  return results
}

const run = async (args) => {
  const supportedShorthands = {}

  await Promise.all(
    Object.entries(supportedShorthandModules).map(async ([key, val]) => {
      supportedShorthands[key] = (await import(val)).default
    })
  )

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

      existingIds.push(...processSelectors(parsed))
    })
  }

  if (input._end) {
    postcss.parse(input._end).walkRules((rule) => {
      const parsed = selectorTokenizer.parse(rule.selector)

      existingIds.push(...processSelectors(parsed))
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

      if (unsupportedShorthands[prop] != null) {
        const key = `${template} ${pseudo}`

        bannedLonghands[key] = bannedLonghands[key] ?? []

        bannedLonghands[key].push(...unsupportedShorthands[prop])
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

      if (index === -1) {
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

        if (unorderedIndex > -1) {
          unorderedTemplates.splice(unorderedIndex, 1)
        }

        const orderedIndex = orderedTemplates.indexOf(template)

        if (orderedIndex > -1) {
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

        for (const shorthand of Object.values(supportedShorthands)) {
          shorthand.collapse(decls)
        }

        const selectors = {}

        for (let name of names) {
          const pseudoIndex = name.indexOf(':')
          let pseudo = ''

          if (pseudoIndex > -1) {
            pseudo = name.substring(pseudoIndex)

            name = name.substring(0, pseudoIndex)
          }

          let filtered

          if (!pseudo) {
            filtered = names.filter((name) => name.indexOf(':') === -1)
          } else {
            filtered = names.filter((name) => {
              const i = name.indexOf(':')

              if (i === -1) return false

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

      for (const shorthand of Object.values(supportedShorthands)) {
        shorthand.collapse(remainder.decls)
      }

      const pseudoIndex = name.indexOf(':')
      let pseudo = ''

      if (pseudoIndex > -1) {
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

  if (!args.dev) {
    css = csso.minify(css, {restructure: false}).css
  }

  output.css.end(css)

  for (const name of Object.keys(map)) {
    map[name] = map[name].join(' ')
  }

  const stringifiedMap = JSON.stringify(map, null, 2)

  if (args.dev) {
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
      console.log(`${gray('[css]')} saved ${args.output}.css`)
    }),
    finished(output.js).then(() => {
      console.log(`${gray('[css]')} saved ${args.output}.js`)
    })
  ])
}

export default (args) => {
  args.input = path.join(process.cwd(), args.input)

  if (!args.watch) {
    return run(args)
  }

  run(args)

  chokidar.watch(args.input, {ignoreInitial: true}).on('change', () => {
    run(args)
  })
}
