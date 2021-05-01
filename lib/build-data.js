import assert from 'assert'
import selectorTokenizer from 'css-selector-tokenizer'

import * as model from './model.js'

export const buildData = async (node, context = {}) => {
  if (node.type === 'decl') {
    const prop = node.prop
    const value = node.value

    const nameID = await model.insertName(context.name, context.namespace)

    await model.insertDecl(
      context.parentAtruleID ?? 0,
      nameID,
      context.suffix ?? '',
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

    await model.insertName(context.name, context.namespace)

    for (const n of node.nodes) {
      await buildData(n, {
        ...context,
        position: 0,
        parentAtruleID: atruleID
      })
    }
  } else if (node.type === 'rule') {
    assert.ok(context.suffix == null, 'Improper nesting found')

    const parsed = selectorTokenizer.parse(node.selector)

    await Promise.all(
      parsed.nodes.map(async (n) => {
        assert.strictEqual(
          n.nodes[0].value,
          '&',
          'Nested selectors must start with &'
        )

        n.nodes.shift()

        assert.ok(
          !n.nodes.reduce(
            (b, n) => b || n.before || n.after || !n.type.startsWith('pseudo'),
            false
          ),
          'Only pseudo-elements and pseudo-classes that target the element directly are allowed'
        )

        n.before = ''

        const suffix = selectorTokenizer.stringify(n)

        for (const n of node.nodes) {
          await buildData(n, {...context, suffix})
        }
      })
    )
  }
}
