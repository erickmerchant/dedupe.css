export const devTemplate = (
  namespace,
  map
) => `export const ${namespace} = new Proxy({
    ${Object.entries(map)
      .map(
        ([key, value]) =>
          `get [${JSON.stringify(key)}]() {
            return ${JSON.stringify(value)}
          }`
      )
      .join(',\n')}
  },
  {
    get(target, prop) {
      if ({}.hasOwnProperty.call(target, prop)) {
        return '${namespace}:' + prop + ' ' + Reflect.get(target, prop)
      }

      throw Error(prop + ' is undefined')
    }
  }
)\n`
