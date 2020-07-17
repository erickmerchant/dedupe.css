const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const letterCount = letters.length

export default (existingIds, id = 0) => () => {
  let result = ''

  do {
    let i = id++
    result = ''

    let r

    do {
      r = i % letterCount
      i = (i - r) / letterCount

      result = letters[r] + result
    } while (i)
  } while (existingIds.includes(result))

  return result
}
