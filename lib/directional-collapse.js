module.exports = (key, labels) => (decls) => {
  const top = decls[labels.top]
  const right = decls[labels.right]
  const bottom = decls[labels.bottom]
  const left = decls[labels.left]

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

    delete decls[labels.top]
    delete decls[labels.right]
    delete decls[labels.bottom]
    delete decls[labels.left]
  }
}
