const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export const createGetUniqueID =
  (prefix = '', id = 0) =>
  () => {
    let result = ''

    let i = id++

    let r

    do {
      r = i % letters.length

      i = Math.floor(i / letters.length)

      result = letters[r] + result
    } while (i--)

    return `${prefix}${result}`
  }
