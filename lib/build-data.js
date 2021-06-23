import assert from 'assert'

import * as model from './model.js'
import * as selectorParse from './selector-parse.js'

export const buildData = async (node, context = {}) => {
  if (node.type === 'decl') {
    const prop = node.prop
    const value = node.value

    const name = await model.insertName(
      context.name,
      context.suffix ?? '',
      context.namespace
    )

    await model.insertDecl(
      context.parentAtruleID ?? 0,
      name,
      prop,
      value,
      value
    )
  } else if (node.type === 'atrule') {
    const atruleName = `@${node.name} ${node.params}`

    const atruleID = await model.insertAtrule(
      context.parentAtruleID ?? 0,
      atruleName
    )

    await model.insertName(
      context.name,
      context.suffix ?? '',
      context.namespace
    )

    for (const n of node.nodes) {
      await buildData(n, {
        ...context,
        position: 0,
        parentAtruleID: atruleID
      })
    }
  } else if (node.type === 'rule') {
    assert.ok(context.suffix == null, 'Improper nesting found')

    const parsed = selectorParse.tokenize(node.selector)

    await Promise.all(
      parsed.map(async (n) => {
        assert.strictEqual(n[0], '&', 'Nested selectors must start with &')

        n.shift()

        assert.ok(
          !n.reduce((acc, curr) => acc || curr.type === 'combinator', false),
          'Only selectors that target the element directly are allowed'
        )

        const suffix = n.map((token) => token.content).join('')

        for (const n of node.nodes) {
          await buildData(n, {...context, suffix})
        }
      })
    )
  }
}
