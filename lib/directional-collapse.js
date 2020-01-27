module.exports = (key, [top, right, bottom, left]) => (decls) => {
  const dTop = decls[top]
  const dRight = decls[right]
  const dBottom = decls[bottom]
  const dLeft = decls[left]

  if (dTop != null && dRight != null && dBottom != null && dLeft != null) {
    if (dTop === dRight && dTop === dBottom && dTop === dLeft) {
      decls[key] = dTop
    } else if (dTop === dBottom && dRight === dLeft) {
      decls[key] = `${dTop} ${dRight}`
    } else if (dRight === dLeft) {
      decls[key] = `${dTop} ${dRight} ${dBottom}`
    } else {
      decls[key] = `${dTop} ${dRight} ${dBottom} ${dLeft}`
    }

    delete decls[top]
    delete decls[right]
    delete decls[bottom]
    delete decls[left]
  }
}
