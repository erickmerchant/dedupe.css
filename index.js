const erequire = require('esm')(module)
const path = require('path')
const fs = require('fs')
const stream = require('stream')
const promisify = require('util').promisify
const postcss = require('postcss')
const finished = promisify(stream.finished)
const createWriteStream = fs.createWriteStream
const mkdir = promisify(fs.mkdir)

const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

const set = (obj, parts, value) => {
  parts = [...parts]

  const last = parts.pop()

  while (parts.length) {
    const part = parts.shift()

    if (obj[part] == null) {
      obj[part] = {}
    }

    obj = obj[part]
  }

  if (Array.isArray(value) && obj[last] != null && Array.isArray(obj[last])) {
    obj[last].push(...value)
  } else {
    obj[last] = value
  }
}

const get = (obj, parts) => {
  parts = [...parts]

  while (parts.length) {
    const part = parts.shift()

    if (obj[part] == null) {
      return null
    }

    obj = obj[part]
  }

  return obj
}

const equal = (a, b) => {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }

  return true
}

const base52 = (i) => {
  let r
  let result = ''

  do {
    r = i % 52
    i = (i - r) / 52

    result += letters[r]
  } while (i)

  return result
}

const outdent = (str) => {
  const parts = str.split('\n')
  const length = Math.min(...parts.filter((part) => part.trim().length > 0).map((part) => part.match(/^\s*/)[0].length))

  return parts.map((part) => (part.length ? part.substring(length) : part)).join('\n')
}

const build = (results, name, nodes) => {
  for (const node of nodes.reverse()) {
    if (node.type === 'decl') {
      const group = get(results.tree, ['', ''])

      if (group && Object.entries(group).find(([key, names]) => key.startsWith(`${node.prop}: `) && names.includes(name))) continue

      set(results.tree, ['', '', `${node.prop}: ${node.value}`], [name])
    } else {
      let context

      if (node.type === 'atrule') {
        context = [`@${node.name} ${node.params}`, '']
      } else if (node.type === 'rule') {
        context = ['', node.selector]
      }

      if (context) {
        for (const n of node.nodes.reverse()) {
          if (n.type === 'decl') {
            const group = get(results.tree, context)

            if (group && Object.entries(group).find(([key, names]) => key.startsWith(`${n.prop}: `) && names.includes(name))) continue

            set(results.tree, [...context, `${n.prop}: ${n.value}`], [name])
          } else if (context[0] && n.type === 'rule') {
            const c = [context[0], n.selector]

            for (const _n of n.nodes.reverse()) {
              if (_n.type === 'decl') {
                const group = get(results.tree, c)

                if (group && Object.entries(group).find(([key, names]) => key.startsWith(`${_n.prop}: `) && names.includes(name))) continue

                set(results.tree, [...c, `${_n.prop}: ${_n.value}`], [name])
              }
            }
          } else if (context[1] && n.type === 'atrule') {
            const c = [`@${n.name} ${n.params}`, context[1]]

            for (const _n of n.nodes.reverse()) {
              if (_n.type === 'decl') {
                const group = get(results.tree, c)

                if (group && Object.entries(group).find(([key, names]) => key.startsWith(`${_n.prop}: `) && names.includes(name))) continue

                set(results.tree, [...c, `${_n.prop}: ${_n.value}`], [name])
              }
            }
          }
        }
      }
    }
  }
}

const run = async (args) => {
  let id = 0

  const input = erequire(args.input).default

  await mkdir(path.dirname(path.join(process.cwd(), args.output)), {recursive: true})

  const output = {
    css: createWriteStream(path.join(process.cwd(), `${args.output}.css`)),
    js: createWriteStream(path.join(process.cwd(), `${args.output}.mjs`))
  }

  const results = {
    tree: {},
    ids: {},
    map: {}
  }

  if (input._before) {
    output.css.write(`${outdent(input._before)}\n`)
  }

  for (const [name, raw] of Object.entries(input)) {
    if (name.startsWith('_')) continue

    const parsed = postcss.parse(raw)

    build(results, name, parsed.nodes)
  }

  for (const [media, pseudos] of Object.entries(results.tree)) {
    let indent = ''

    if (media) {
      output.css.write(`${media} {\n`)

      indent = '  '
    }

    for (const [pseudo, tree] of Object.entries(pseudos).reverse()) {
      const entries = Object.entries(tree).reverse()
      const remainders = {}

      while (entries.length) {
        const [decl, names] = entries.shift()

        if (names.length > 1) {
          const cls = base52(id++)

          const decls = [decl]
          let i = 0

          while (i < entries.length) {
            if (equal(entries[i][1], names)) {
              decls.push(entries[i][0])

              entries.splice(i, 1)
            } else {
              i++
            }
          }

          output.css.write(`${indent}.${cls}${pseudo} { ${decls.join('; ')}; }\n`)

          for (const name of names) {
            set(results.map, [name], [cls])
          }
        } else {
          const name = names[0]

          set(remainders, [name], [decl])
        }
      }

      for (const [name, decls] of Object.entries(remainders)) {
        if (results.ids[name] == null) {
          results.ids[name] = base52(id++)
        }

        const cls = results.ids[name]

        if (results.map[name] == null || !results.map[name].includes(cls)) {
          set(results.map, [name], [cls])
        }

        output.css.write(`${indent}.${cls}${pseudo} {\n`)

        for (const decl of decls) {
          output.css.write(`${indent}  ${decl};\n`)
        }

        output.css.write(`${indent}}\n`)
      }
    }

    if (media) {
      output.css.write('}\n')
    }
  }

  output.css.end(input._after != null ? `${outdent(input._after)}\n` : '')

  for (const name of Object.keys(results.map)) {
    results.map[name] = results.map[name].join(' ')
  }

  output.js.end(`export const classes = ${JSON.stringify(results.map, null, 2)}`)

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

  fs.watch(args.input, () => {
    delete require.cache[args.input]

    run(args)
  })
}
