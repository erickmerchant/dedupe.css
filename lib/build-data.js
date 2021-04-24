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
      context.pseudo ?? '',
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
    assert.ok(context.pseudo == null)

    const parsed = selectorTokenizer.parse(node.selector)

    await Promise.all(
      parsed.nodes.map(async (n) => {
        assert.ok(n.nodes.length === 2)

        assert.ok(n.nodes[0].value === '&')

        assert.ok(n.nodes[1].type.startsWith('pseudo'))

        n.nodes.shift()

        const pseudo = selectorTokenizer.stringify(n).trim()

        for (const n of node.nodes) {
          await buildData(n, {...context, pseudo})
        }
      })
    )
  }
}
