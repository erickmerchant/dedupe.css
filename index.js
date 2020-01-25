const _import = require('esm')(module)
const path = require('path')
const fs = require('fs')
const stream = require('stream')
const promisify = require('util').promisify
const postcss = require('postcss')
const valueParser = require('postcss-value-parser')
const selectorTokenizer = require('css-selector-tokenizer')
const finished = promisify(stream.finished)
const mkdir = promisify(fs.mkdir)
const createWriteStream = fs.createWriteStream

const shorthands = ['animation', 'background', 'border', 'border-bottom', 'border-left', 'border-right', 'border-top', 'column-rule', 'columns', 'flex', 'flex-flow', 'font', 'grid', 'grid-area', 'grid-column', 'grid-row', 'grid-template', 'list-style', 'offset', 'outline', 'place-content', 'place-items', 'place-self', 'text-decoration', 'transition']

const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

const letterCount = letters.length

const stringify = (node) => valueParser.stringify(node)

const filterSpaces = (nodes) => nodes.filter((node) => node.type !== 'space')

const directionalCollapser = (key, [top, right, bottom, left]) => (decls) => {
  if (decls[top] != null && decls[right] != null && decls[bottom] != null && decls[left] != null) {
    if (decls[top] === decls[right] && decls[top] === decls[bottom] && decls[top] === decls[left]) {
      decls[key] = decls[top]
    } else if (decls[top] === decls[bottom] && decls[right] === decls[left]) {
      decls[key] = `${decls[top]} ${decls[right]}`
    } else if (decls[right] === decls[left]) {
      decls[key] = `${decls[top]} ${decls[right]} ${decls[bottom]}`
    } else {
      decls[key] = `${decls[top]} ${decls[right]} ${decls[bottom]} ${decls[left]}`
    }

    delete decls[top]
    delete decls[right]
    delete decls[bottom]
    delete decls[left]
  }
}

const directionalExpander = ([top, right, bottom, left]) => (nodes) => {
  const values = filterSpaces(nodes).map(stringify)

  if (!values.length || values.length > 4) {
    return
  }

  const result = {}

  result[top] = values[0]

  if (values.length >= 2) {
    result[right] = values[1]
  }

  if (values.length >= 3) {
    result[bottom] = values[2]
  }

  if (values.length === 4) {
    result[left] = values[3]
  }

  if (values.length === 3 || values.length === 2) {
    result[left] = values[1]
  }

  if (values.length <= 2) {
    result[bottom] = values[0]
  }

  if (values.length === 1) {
    result[right] = values[0]
    result[left] = values[0]
  }

  return result
}

const dirs = ['top', 'right', 'bottom', 'left']

const borderRadiusDirs = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']

const collapsers = [
  directionalCollapser('border-color', dirs.map((dir) => `border-${dir}-color`)),
  directionalCollapser('border-style', dirs.map((dir) => `border-${dir}-style`)),
  directionalCollapser('border-width', dirs.map((dir) => `border-${dir}-width`)),
  directionalCollapser('margin', dirs.map((dir) => `margin-${dir}`)),
  directionalCollapser('padding', dirs.map((dir) => `padding-${dir}`)),
  (decls) => {
    const bDecls = {}
    const collapser = directionalCollapser('border-radius', borderRadiusDirs)

    for (const borderRadiusDir of borderRadiusDirs) {
      if (decls[borderRadiusDir] == null) return

      const split = decls[borderRadiusDir].split(' ')

      if (split.length > 2) return

      if (split.length === 2) {
        decls[borderRadiusDir] = split[0]
        bDecls[borderRadiusDir] = split[1]
      }
    }

    collapser(decls)

    collapser(bDecls)

    if (bDecls['border-radius'] != null) {
      decls['border-radius'] = `${decls['border-radius']} / ${bDecls['border-radius']}`
    }
  },
  (decls) => {
    if (decls['overflow-x'] != null && decls['overflow-y'] != null) {
      decls.overflow = `${decls['overflow-x']} ${decls['overflow-y']}`

      delete decls['overflow-x']
      delete decls['overflow-y']
    }
  }
]

const expanders = {
  'border-color': directionalExpander(dirs.map((dir) => `border-${dir}-color`)),
  'border-style': directionalExpander(dirs.map((dir) => `border-${dir}-style`)),
  'border-width': directionalExpander(dirs.map((dir) => `border-${dir}-width`)),
  margin: directionalExpander(dirs.map((dir) => `margin-${dir}`)),
  padding: directionalExpander(dirs.map((dir) => `padding-${dir}`)),
  'border-radius'(nodes) {
    const expander = directionalExpander(borderRadiusDirs)
    const slashIndex = nodes.findIndex((node) => node.type === 'div')
    let bResult

    if (slashIndex > -1) {
      bResult = expander(nodes.slice(slashIndex + 1))

      nodes = nodes.slice(0, slashIndex)
    }

    const result = expander(nodes)

    if (bResult) {
      for (const borderRadiusDir of borderRadiusDirs) {
        result[borderRadiusDir] = `${result[borderRadiusDir]} ${bResult[borderRadiusDir]}`
      }
    }

    return result
  },
  overflow(nodes) {
    const values = filterSpaces(nodes).map(stringify)

    if (!values.length || values.length > 2) {
      return
    }

    return {
      'overflow-x': values[0],
      'overflow-y': values[1] != null ? values[1] : values[0]
    }
  }
}

const isEqualArray = (a, b) => {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }

  return true
}

const processNodes = (nodes, selector = '', template = '{}') => {
  const results = []

  for (const node of nodes) {
    if (node.type === 'decl') {
      if (expanders[node.prop]) {
        const parsed = valueParser(node.value)

        let expanded

        if (expanders[node.prop] != null) {
          expanded = expanders[node.prop](parsed.nodes)

          if (expanded) {
            for (const [prop, value] of Object.entries(expanded)) {
              results.push({
                template,
                selector,
                prop,
                value
              })
            }

            continue
          }
        }
      } else if (shorthands.includes(node.prop)) {
        console.warn(`shorthand property ${node.prop} found`)
      }

      results.push({
        template,
        selector,
        prop: node.prop,
        value: node.value
      })
    } else if (node.type === 'atrule') {
      results.push(...processNodes(node.nodes, selector, template.replace('{}', `{ @${node.name} ${node.params} {} }`)))
    } else if (node.type === 'rule') {
      if (selector) throw Error('nested rule found')

      const parsed = selectorTokenizer.parse(node.selector)

      for (const n of parsed.nodes) {
        if (n.nodes.filter((n) => n.type === 'spacing' || n.type.includes('pseudo')).length !== n.nodes.length) {
          throw Error('non-pseudo selector found')
        }

        results.push(...processNodes(node.nodes, selectorTokenizer.stringify(n).trim(), template))
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

        result += letters[r]
      } while (i)
    } while (existingIds.includes(result))

    return result
  }

  const input = _import(`${args.input}?${Date.now()}`)

  await mkdir(path.dirname(path.join(process.cwd(), args.output)), {recursive: true})

  const output = {
    css: createWriteStream(path.join(process.cwd(), `${args.output}.css`)),
    js: createWriteStream(path.join(process.cwd(), `${args.output}.mjs`))
  }

  const map = {}
  const tree = {}
  const ids = {}

  if (input._start) {
    output.css.write(input._start)

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

  for (const [name, raw] of Object.entries(input.styles)) {
    const parsed = postcss.parse(raw)

    for (const {template, selector, prop, value} of processNodes(parsed.nodes)) {
      tree[template] = tree[template] || []

      const index = tree[template].findIndex((r) => r.selector === selector && r.prop === prop && r.value === value)

      if (index < 0) {
        tree[template].push({
          names: [name],
          selector,
          prop,
          value
        })
      } else {
        tree[template][index].names.push(name)
      }
    }
  }

  for (const template of Object.keys(tree)) {
    const branch = tree[template]
    const remainders = []
    const rules = []

    while (branch.length) {
      const {selector, prop, value, names} = branch.shift()

      if (names.length > 1) {
        const cls = uniqueId()

        const decls = {
          [prop]: value
        }

        let i = 0

        while (i < branch.length) {
          if (isEqualArray(branch[i].names, names) && branch[i].selector === selector) {
            decls[branch[i].prop] = branch[i].value

            branch.splice(i, 1)
          } else {
            i++
          }
        }

        for (const collapser of collapsers) {
          collapser(decls)
        }

        rules.push(`.${cls}${selector} { ${Object.keys(decls).map((prop) => `${prop}: ${decls[prop]}`).join('; ')}; }`)

        for (const name of names) {
          map[name] = map[name] || []

          map[name].push(cls)
        }
      } else {
        const name = names[0]

        remainders.push({selector, name, prop, value})
      }
    }

    while (remainders.length) {
      const {selector, prop, value, name} = remainders.shift()
      const cls = ids[name] || uniqueId()

      ids[name] = cls

      const decls = {
        [prop]: value
      }
      let i = 0

      while (i < remainders.length) {
        if (remainders[i].name === name && remainders[i].selector === selector) {
          decls[remainders[i].prop] = remainders[i].value

          remainders.splice(i, 1)
        } else {
          i++
        }
      }

      for (const collapser of collapsers) {
        collapser(decls)
      }

      rules.push(`.${cls}${selector} { ${Object.keys(decls).map((prop) => `${prop}: ${decls[prop]}`).join('; ')}; }`)

      map[name] = map[name] || []

      if (!map[name].includes(cls)) {
        map[name].push(cls)
      }
    }

    const line = template.replace('{}', `{ ${rules.join('')} }`)

    output.css.write(line.substring(2, line.length - 2))
  }

  output.css.end(input._end != null ? input._end : '')

  for (const name of Object.keys(map)) {
    map[name] = map[name].join(' ')
  }

  output.js.end(`export const classes = ${JSON.stringify(map, null, 2)}`)

  return Promise.all([
    finished(output.css),
    finished(output.js)
  ])
}

module.exports = (args) => {
  args.input = path.join(process.cwd(), args.input)

  if (!args.watch) {
    return run(args)
  }

  run(args)

  let changed = false

  fs.watch(args.input, () => {
    if (!changed) {
      changed = true

      setTimeout(() => {
        run(args)

        changed = false
      }, 100)
    }
  })
}
