const path = require('path')

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

let id = 0

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

module.exports = async (args) => {
  const input = require(path.join(process.cwd(), args.input))

  for (const part of [].concat(input)) {
    if (typeof part === 'string') {
      console.log(part)

      continue
    }

    const results = {
      medias: [''],
      repeats: {},
      singles: {},
      ids: {},
      map: {}
    }

    for (const [name, definition] of entries(part)) {
      build(results, name, definition)
    }

    for (const context of results.medias) {
      const prefix = !context.startsWith('@') ? context : ''

      if (context.startsWith('@')) {
        console.log(`${context} {`)
      }

      for (const [property, decls] of entries(results.repeats[context])) {
        for (const [value, names] of entries(decls)) {
          if (names.length > 1) {
            const cls = base52(id++)

            console.log(`.${cls}${prefix} {`)

            console.log(`${property}: ${value};`)

            console.log('}')

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

          console.log(`.${cls}${prefix} {`)

          for (const [property, value] of decls) {
            console.log(`${property}: ${value};`)
          }

          console.log('}')
        }
      }

      if (context.startsWith('@')) {
        console.log('}')
      }
    }

    console.log(JSON.stringify(results.map))
  }
}
