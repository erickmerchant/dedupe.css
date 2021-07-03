const letters = '_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export const createGetClassName =
  (prefix = '', id = 0) =>
  () => {
    let result = ''

    let i = ++id

    let r

    do {
      r = i % letters.length

      i = (i - r) / letters.length

      result = letters[r] + result
    } while (i)

    return `${prefix}${result}`
  }
