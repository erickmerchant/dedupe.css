const x = 'overflow-x'
const y = 'overflow-y'

export default {
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
