const directionalCollapse = require('../directional-collapse.js')
const directionalExpand = require('../directional-expand.js')
const directions = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']

module.exports = {
  expand(value) {
    const expand = directionalExpand(directions)
    const slashIndex = value.indexOf('/')
    let bResult

    if (slashIndex > -1) {
      bResult = expand(value.substring(slashIndex + 1))

      value = value.substring(0, slashIndex)
    }

    const result = expand(value)

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
