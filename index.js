const path = require('path')
const fs = require('fs')
const stream = require('stream')
const promisify = require('util').promisify
const postcss = require('postcss')
const finished = promisify(stream.finished)
const createWriteStream = fs.createWriteStream

const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

const set = (obj, parts, value) => {
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

const build = (results, name, nodes) => {
  const indexes = {}
  let i = -1

  for (const node of nodes.reverse()) {
    i++

    if (node.type === 'decl') {
      if (indexes[node.prop] != null) continue

      set(results.tree, ['', `${node.prop}: ${node.value}`], [name])

      indexes[node.prop] = i
    } else {
      let context

      if (node.type === 'atrule') {
        context = `@${node.name} ${node.params}`
      } else if (node.type === 'rule') {
        context = node.selector
      }

      if (context) {
        if (!results.medias.includes(context)) {
          results.medias.push(context)
        }

        for (const n of node.nodes.reverse()) {
          i++

          if (n.type === 'decl') {
            if (indexes[`${context}${n.prop}`] != null) continue

            set(results.tree, [context, `${n.prop}: ${n.value}`], [name])

            indexes[`${context}${n.prop}`] = i
          } else if (n.type === 'rule') {
            let c = `${context} ${n.selector}`

            if (!results.medias.includes(c)) {
              results.medias.push(c)
            }

            for (const _n of n.nodes.reverse()) {
              i++

              if (_n.type === 'decl') {
                if (indexes[`${c}${_n.prop}`] != null) continue

                set(results.tree, [c, `${_n.prop}: ${_n.value}`], [name])

                indexes[`${c}${_n.prop}`] = i
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

  const input = require(args.input)
  const output = {
    css: createWriteStream(path.join(process.cwd(), `${args.output}.css`)),
    js: createWriteStream(path.join(process.cwd(), `${args.output}.mjs`))
  }

  const results = {
    medias: [''],
    tree: {},
    ids: {},
    map: {}
  }

  if (input._before) {
    output.css.write(input._before)
  }

  for (const [name, raw] of Object.entries(input)) {
    if (name.startsWith('_')) continue

    const parsed = postcss.parse(raw)

    build(results, name, parsed.nodes)
  }

  for (const context of results.medias) {
    const prefix = !context.startsWith('@') ? context : ''

    if (context.startsWith('@')) {
      output.css.write(`${context} {\n`)
    }

    const entries = results.tree[context] != null ? Object.entries(results.tree[context]) : []
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

        output.css.write(`.${cls}${prefix} { ${decls.join('; ')}; }\n`)

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

      output.css.write(`.${cls}${prefix} {\n`)

      for (const decl of decls) {
        output.css.write(`${decl};\n`)
      }

      output.css.write('}\n')
    }

    if (context.startsWith('@')) {
      output.css.write('}\n')
    }
  }

  output.css.end(input._after != null ? input._after : '')

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
