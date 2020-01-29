const directionalCollapse = require('../directional-collapse.js')
const directionalExpand = require('../directional-expand.js')
const directions = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']
const valueParser = require('postcss-value-parser')

module.exports = {
  expand(value) {
    let {nodes} = valueParser(value)
    const expand = directionalExpand(directions)
    const slashIndex = nodes.findIndex((node) => node.type === 'div')
    let bResult

    if (slashIndex > -1) {
      bResult = expand(nodes.slice(slashIndex + 1))

      nodes = nodes.slice(0, slashIndex)
    }

    const result = expand(nodes)

    if (bResult) {
      for (const direction of directions) {
        result[direction] = `${result[direction]} ${bResult[direction]}`
      }
    }

    return result
  },
  collapse(decls) {
    const bDecls = {}
    const collapse = directionalCollapse('border-radius', directions)

    for (const direction of directions) {
      if (decls[direction] == null) return

      const split = decls[direction].split(' ')

      if (split.length > 2) return

      if (split.length === 2) {
        decls[direction] = split[0]
        bDecls[direction] = split[1]
      }
    }

    collapse(decls)

    collapse(bDecls)

    if (bDecls['border-radius'] != null) {
      decls['border-radius'] = `${decls['border-radius']} / ${bDecls['border-radius']}`
    }
  }
}
