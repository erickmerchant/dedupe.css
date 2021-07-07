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

export const transform = (str, cb) => {
  return tokenize(str)
    .map((nodes) =>
      nodes
        .map((node) => {
          if (node.type === 'pseudo-class' && node.argument) {
            const argument = transform(node.argument, cb)

            node.argument = argument

            node.content = `:${node.name}(${node.argument})`
          } else if (node.type === 'class') {
            node.name = cb(node.name)

            node.content = `.${node.name}`
          }

          return node.content
        })
        .join('')
    )
    .join(', ')
}

export const specificity = parsel.specificity
