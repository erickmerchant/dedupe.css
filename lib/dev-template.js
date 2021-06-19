export const devTemplate = (
  namespace,
  map,
  vmap,
  defineID
) => `export const ${namespace} = new Proxy(
  (() => {
    const classes = ${defineID}(${JSON.stringify(
  Object.entries(vmap).reduce((acc, [key, val]) => {
    acc[key] = Array.from(val)

    return acc
  }, {})
)})

    ${Object.entries(map)
      .map(
        ([key, value]) =>
          `Object.defineProperty(classes, ${JSON.stringify(key)}, {
          get() {
            return ${JSON.stringify(value)}
          }
        })`
      )
      .join('\n')}

    return classes
  })(),
  {
    get(target, prop) {

      if ({}.hasOwnProperty.call(target, prop)) {
        if (typeof prop !== 'string') {
          return Reflect.get(...arguments)
        }

        return '${namespace}:' + prop + ' ' + Reflect.get(...arguments)
      }

      throw Error(prop + ' is undefined')
    }
  }
)\n`
