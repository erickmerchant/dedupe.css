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
    if (context.pseudo) throw Error('nested rule found')

    const parsed = selectorTokenizer.parse(node.selector)

    await Promise.all(
      parsed.nodes.map(async (n) => {
        for (const nn of n.nodes) {
          if (nn.type.startsWith('pseudo')) continue

          throw Error('non-pseudo selector found')
        }

        const pseudo = selectorTokenizer.stringify(n).trim()

        for (const n of node.nodes) {
          await buildData(n, {...context, pseudo})
        }
      })
    )
  }
}
