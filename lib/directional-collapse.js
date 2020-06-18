export default (key, labels) => (decls) => {
  const top = decls[labels[0]]
  const right = decls[labels[1]]
  const bottom = decls[labels[2]]
  const left = decls[labels[3]]

  if (top != null && right != null && bottom != null && left != null) {
    if (top === right && top === bottom && top === left) {
      decls[key] = top
    } else if (top === bottom && right === left) {
      decls[key] = `${top} ${right}`
    } else if (right === left) {
      decls[key] = `${top} ${right} ${bottom}`
    } else {
      decls[key] = `${top} ${right} ${bottom} ${left}`
    }

    delete decls[labels[0]]
    delete decls[labels[1]]
    delete decls[labels[2]]
    delete decls[labels[3]]
  }
}
