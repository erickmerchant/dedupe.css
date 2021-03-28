import selectorTokenizer from 'css-selector-tokenizer'
import postcss from 'postcss'

import {RAW, REPLACEMENT} from '../css.js'

export const PARSED = Symbol('parsed')

export const parse = (args) => {
  const {strs, vars} = args

  let str = ''

  const replacements = {}

  for (let i = 0; i < strs.length; i++) {
    str += strs[i]

    if (vars[i] != null) {
      if (vars[i][REPLACEMENT]) {
        const key = `${Date.now()}-${i}`

        str += `/*${key}*/`

        replacements[key] = parse(vars[i][REPLACEMENT][RAW])[
          vars[i][REPLACEMENT].key
        ]
      } else {
        str += vars[i]
      }
    }
  }

  const parsed = postcss.parse(str)

  parsed.walkComments((comment) => {
    if (replacements[comment.text] != null) {
      for (const node of replacements[comment.text]) {
        comment.before(node.clone())
      }

      comment.remove()
    }
  })

  const result = {
    [PARSED]: parsed
  }

  parsed.each((node) => {
    const selectors = selectorTokenizer.parse(node.selector)

    for (const selector of selectors.nodes) {
      if (selector.nodes.length === 1 && selector.nodes[0].type === 'class') {
        const arr = result[selector.nodes[0].name] ?? []

        result[selector.nodes[0].name] = arr.concat(node.nodes)
      }
    }
  })

  return result
}
