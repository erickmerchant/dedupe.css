const valueParser = require('postcss-value-parser')

const stringify = (node) => valueParser.stringify(node)

const filterSpaces = (nodes) => nodes.filter((node) => node.type !== 'space')

module.exports = (labels) => (value) => {
  const {nodes} = valueParser(value)

  const values = filterSpaces(nodes).map(stringify)

  if (!values.length || values.length > 4) {
    return
  }

  const result = {}

  result[labels[0]] = values[0]

  if (values.length >= 2) {
    result[labels[1]] = values[1]
  }

  if (values.length >= 3) {
    result[labels[2]] = values[2]
  }

  if (values.length === 4) {
    result[labels[3]] = values[3]
  }

  if (values.length === 3 || values.length === 2) {
    result[labels[3]] = values[1]
  }

  if (values.length <= 2) {
    result[labels[2]] = values[0]
  }

  if (values.length === 1) {
    result[labels[1]] = values[0]
    result[labels[3]] = values[0]
  }

  return result
}
