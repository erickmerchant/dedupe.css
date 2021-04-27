import assert from 'assert'
import selectorTokenizer from 'css-selector-tokenizer'
import postcss from 'postcss'

import {RAW, REPLACEMENT} from '../css.js'

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

        replacements[key] = parse(vars[i][REPLACEMENT][RAW]).classes[
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
    parsed,
    classes: {},
    error: null
  }

  parsed.each((node) => {
    try {
      const selectors = selectorTokenizer.parse(node.selector.trim())

      for (const selector of selectors.nodes) {
        assert.ok(
          selector.nodes.length === 1 && selector.nodes[0].type === 'class',
          'All top-level nodes must be rules with a single class selector'
        )

        const arr = result.classes[selector.nodes[0].name] ?? []

        result.classes[selector.nodes[0].name] = arr.concat(node.nodes)
      }
    } catch (err) {
      result.error = err
    }
  })

  return result
}
