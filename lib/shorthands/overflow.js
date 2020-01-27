const valueParser = require('postcss-value-parser')

const x = 'overflow-x'
const y = 'overflow-y'

const stringify = (node) => valueParser.stringify(node)

const filterSpaces = (nodes) => nodes.filter((node) => node.type !== 'space')

module.exports = {
  expand(nodes) {
    const values = filterSpaces(nodes).map(stringify)

    if (!values.length || values.length > 2) {
      return
    }

    return {
      'overflow-x': values[0],
      'overflow-y': values[1] != null ? values[1] : values[0]
    }
  },
  collapse(decls) {
    if (decls[x] != null && decls[y] != null) {
      if (decls[x] === decls[y]) {
        decls.overflow = `${decls[x]}`
      } else {
        decls.overflow = `${decls[x]} ${decls[y]}`
      }

      delete decls[x]
      delete decls[y]
    }
  }
}
