const letters = '_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const letterCount = letters.length

export default (existingIds, id = 1) => () => {
  let result = ''

  do {
    let i = id++
    result = ''

    let r

    do {
      r = i % letterCount

      i = Math.floor(i / letterCount)

      result = letters[r] + result
    } while (i)
  } while (existingIds.includes(result))

  return result
}
