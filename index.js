const _import = require('esm')(module)
const path = require('path')
const fs = require('fs')
const stream = require('stream')
const promisify = require('util').promisify
const postcss = require('postcss')
const selectorTokenizer = require('css-selector-tokenizer')
const finished = promisify(stream.finished)
const createWriteStream = fs.createWriteStream
const mkdir = promisify(fs.mkdir)

const shorthands = ['animation', 'background', 'border', 'border-bottom', 'border-color', 'border-left', 'border-radius', 'border-right', 'border-style', 'border-top', 'border-width', 'column-rule', 'columns', 'flex', 'flex-flow', 'font', 'grid', 'grid-area', 'grid-column', 'grid-row', 'grid-template', 'list-style', 'margin', 'offset', 'outline', 'overflow', 'padding', 'place-content', 'place-items', 'place-self', 'text-decoration', 'transition']
const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

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
      if (shorthands.includes(node.prop)) {
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
      let i = ++id
      result = ''

      let r

      do {
        r = i % 52
        i = (i - r) / 52

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
