export const css = (strs, ...vars) => {
  let str = ''

  for (let i = 0; i < strs.length; i++) {
    str += strs[i]

    if (vars[i] != null) {
      str += vars[i]
    }
  }

  return str
}
