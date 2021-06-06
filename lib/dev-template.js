export const devTemplate = (
  id,
  namespace,
  entries
) => `export const ${namespace} = new Proxy(
  (() => {
    const classes = (...props) => ${id}('${namespace}', classes, props)

    ${entries
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
        return '${namespace} ' + Reflect.get(...arguments)
      }

      throw Error(prop + ' is undefined')
    }
  }
)\n`
