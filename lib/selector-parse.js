import {createRequire} from 'module'

const require = createRequire(import.meta.url)

const parsel = require('parsel-js')

export const tokenize = (str) => {
  return parsel.tokenize(str).reduce(
    (acc, curr) => {
      if (curr.type === 'comma') {
        acc.push([])
      } else {
        acc[acc.length - 1].push(curr)
      }

      return acc
    },
    [[]]
  )
}
