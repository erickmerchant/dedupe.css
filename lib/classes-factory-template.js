export const classesFactoryTemplate = (
  id,
  dev
) => `const ${id} = (namespace, map, props = []) => {
    let classes = []

    ${dev ? 'classes.push(namespace)' : ''}

    props = props.reduce((acc, prop) => {
      if (typeof prop === 'string') {
        acc.push(prop)
      } else {
        for (let i = 0, keys = Object.keys(prop); i < keys.length; i++) {
          if (prop[keys[i]]) {
            acc.push(keys[i])
          }
        }
      }

      return acc
    }, [])

    for (const prop of props) {
      ${
        dev
          ? `if (!{}.hasOwnProperty.call(map, prop)) {
            throw Error(prop + ' is undefined')
          }`
          : ''
      }

      classes.push(map[prop])
    }

    return classes.join(' ')
  }\n`
