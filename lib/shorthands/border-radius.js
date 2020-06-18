import directionalCollapse from '../directional-collapse.js'

const directions = [
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius'
]

export default {
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
      decls[
        'border-radius'
      ] = `${decls['border-radius']} / ${bDecls['border-radius']}`
    }
  }
}
