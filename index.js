const path = require('path')
const fs = require('fs')
const stream = require('stream')
const promisify = require('util').promisify
const finished = promisify(stream.finished)
const createWriteStream = fs.createWriteStream

const entries = Object.entries

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

const build = (results, name, definition, context = '') => {
  for (const [property, value] of entries(definition)) {
    if (typeof value === 'object') {
      build(results, name, value, property)
    } else {
      set(results.repeats, [context, property, value], [name])

      if (!results.medias.includes(context)) {
        results.medias.push(context)
      }
    }
  }
}

const run = async (args) => {
  let id = 0

  const input = require(args.input)
  const output = {
    css: createWriteStream(path.join(process.cwd(), `${args.output}.css`)),
    js: createWriteStream(path.join(process.cwd(), `${args.output}.js`))
  }

  const results = {
    medias: [''],
    repeats: {},
    singles: {},
    ids: {},
    map: {}
  }

  if (input._before) {
    output.css.write(input._before)
  }

  for (const [name, definition] of entries(input)) {
    if (name.startsWith('_')) continue

    build(results, name, definition)
  }

  for (const context of results.medias) {
    const prefix = !context.startsWith('@') ? context : ''

    if (context.startsWith('@')) {
      output.css.write(`${context} {\n`)
    }

    for (const [property, decls] of entries(results.repeats[context])) {
      for (const [value, names] of entries(decls)) {
        if (names.length > 1) {
          const cls = base52(id++)

          output.css.write(`.${cls}${prefix} { ${property}: ${value}; }\n`)

          for (const name of names) {
            set(results.map, [name], [cls])
          }
        } else {
          const name = names[0]

          set(results.singles, [context, name], [[property, value]])
        }
      }
    }

    if (results.singles[context]) {
      for (const [name, decls] of entries(results.singles[context])) {
        if (results.ids[name] == null) {
          results.ids[name] = base52(id++)
        }

        const cls = results.ids[name]

        if (results.map[name] && !results.map[name].includes(cls)) {
          set(results.map, [name], [cls])
        }

        output.css.write(`.${cls}${prefix} {\n`)

        for (const [property, value] of decls) {
          output.css.write(`${property}: ${value};\n`)
        }

        output.css.write('}\n')
      }
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
