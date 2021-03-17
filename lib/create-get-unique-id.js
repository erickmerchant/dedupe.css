const letters = '_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const letterCount = letters.length

export default (prefix, id = 1) => () => {
  let result = ''

  let i = id++
  result = ''

  let r

  do {
    r = i % letterCount

    i = Math.floor(i / letterCount)

    result = letters[r] + result
  } while (i)

  return `${prefix}${result}`
}
