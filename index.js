const esimport = require('esm')(module)
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

const processNodes = (nodes, inPseudo = false, base = []) => {
  const results = []

  for (const node of nodes.reverse()) {
    if (node.type === 'decl') {
      results.push({
        context: base,
        node
      })
    } else if (node.type === 'atrule') {
      results.push(...processNodes(node.nodes, inPseudo, [...base, `@${node.name} ${node.params}`]))
    } else if (node.type === 'rule') {
      if (inPseudo) throw Error('nested rule found')

      const parsed = selectorTokenizer.parse(node.selector)

      for (const n of parsed.nodes) {
        if (n.nodes.filter((n) => n.type === 'spacing' || n.type.includes('pseudo')).length !== n.nodes.length) {
          throw Error('non-pseudo selector found')
        }

        results.push(...processNodes(node.nodes, false, [...base, selectorTokenizer.stringify(n).trim()]))
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
  const input = esimport(`${args.input}?${Date.now()}`).default

  await mkdir(path.dirname(path.join(process.cwd(), args.output)), {recursive: true})

  const output = {
    css: createWriteStream(path.join(process.cwd(), `${args.output}.css`)),
    js: createWriteStream(path.join(process.cwd(), `${args.output}.mjs`))
  }

  const ids = {}
  const map = {}
  let tree = []

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

  for (const [name, raw] of Object.entries(input)) {
    if (name.startsWith('_')) continue

    const parsed = postcss.parse(raw)

    for (const {context, node} of processNodes(parsed.nodes)) {
      if (shorthands.includes(node.prop)) console.warn(`shorthand property ${node.prop} found`)

      let index = tree.findIndex((branch) => isEqualArray(branch.context, context))

      if (index < 0) {
        index = tree.length

        tree.push({
          context,
          decls: {}
        })
      }

      const decls = tree[index].decls

      if (Object.entries(decls).find(([key, names]) => key.startsWith(`${node.prop}: `) && names.includes(name))) continue

      const decl = `${node.prop}: ${node.value}`

      decls[decl] = decls[decl] || []

      decls[decl].push(name)
    }
  }

  const atrules = input._atrules || []

  for (const atrule of atrules) {
    tree = tree.sort((a, b) => a.context.indexOf(atrule) - b.context.indexOf(atrule))
  }

  for (const branch of tree) {
    const remainders = {}
    const entries = Object.entries(branch.decls)
    const pseudo = branch.context.find((c) => !c.startsWith('@')) || ''
    const atrules = branch.context.filter((c) => c.startsWith('@'))

    for (const atrule of atrules) {
      output.css.write(`${atrule} {`)
    }

    while (entries.length) {
      const [decl, names] = entries.shift()

      if (names.length > 1) {
        const cls = uniqueId()

        const decls = [decl]
        let i = 0

        while (i < entries.length) {
          if (isEqualArray(entries[i][1], names)) {
            decls.push(entries[i][0])

            entries.splice(i, 1)
          } else {
            i++
          }
        }

        output.css.write(`.${cls}${pseudo} { ${decls.join('; ')}; }`)

        for (const name of names) {
          map[name] = map[name] || []

          map[name].push(cls)
        }
      } else {
        const name = names[0]

        remainders[name] = remainders[name] || []

        remainders[name].push(decl)
      }
    }

    for (const [name, decls] of Object.entries(remainders)) {
      if (ids[name] == null) {
        ids[name] = uniqueId()
      }

      const cls = ids[name]

      if (map[name] == null || !map[name].includes(cls)) {
        map[name] = map[name] || []

        map[name].push(cls)
      }

      output.css.write(`.${cls}${pseudo} {`)

      for (const decl of decls) {
        output.css.write(`${decl};`)
      }

      output.css.write('}')
    }

    for (let i = 0; i < atrules.length; i++) {
      output.css.write('}')
    }
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
