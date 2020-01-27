const valueParser = require('postcss-value-parser')

const stringify = (node) => valueParser.stringify(node)

const filterSpaces = (nodes) => nodes.filter((node) => node.type !== 'space')

module.exports = ([top, right, bottom, left]) => (nodes) => {
  const values = filterSpaces(nodes).map(stringify)

  if (!values.length || values.length > 4) {
    return
  }

  const result = {}

  result[top] = values[0]

  if (values.length >= 2) {
    result[right] = values[1]
  }

  if (values.length >= 3) {
    result[bottom] = values[2]
  }

  if (values.length === 4) {
    result[left] = values[3]
  }

  if (values.length === 3 || values.length === 2) {
    result[left] = values[1]
  }

  if (values.length <= 2) {
    result[bottom] = values[0]
  }

  if (values.length === 1) {
    result[right] = values[0]
    result[left] = values[0]
  }

  return result
}
