import assert from 'assert'
import postcss from 'postcss'

import {RAW, REPLACEMENT} from '../css.js'
import * as selectorParse from './selector-parse.js'

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
      const selectors = selectorParse.tokenize(node.selector.trim())

      for (const selector of selectors) {
        assert.ok(
          selector.length === 1 && selector[0].type === 'class',
          'All top-level nodes must be rules with a single class selector'
        )

        const arr = result.classes[selector[0].name] ?? []

        result.classes[selector[0].name] = arr.concat(node.nodes)
      }
    } catch (err) {
      result.error = err
    }
  })

  return result
}
