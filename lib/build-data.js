import selectorTokenizer from 'css-selector-tokenizer'

import * as sql from './sql.js'

export const buildData = async (db, node, context = {}) => {
  if (node.type === 'decl') {
    const prop = node.prop
    const value = node.value

    await db.run(sql.insertName, context.name, context.namespace)

    const {nameID} = await db.get(sql.nameID, context.name, context.namespace)

    await db.run(
      sql.insertDecl,
      context.parentAtruleID ?? 0,
      nameID,
      context.pseudo ?? '',
      prop,
      value,
      value
    )
  } else if (node.type === 'atrule') {
    const atruleName = `@${node.name} ${node.params}`

    await db.run(sql.insertAtrule, context.parentAtruleID ?? 0, atruleName)

    const {atruleID} = await db.get(
      sql.atruleID,
      context.parentAtruleID ?? 0,
      atruleName
    )

    await db.run(sql.insertName, context.name, context.namespace)

    for (const n of node.nodes) {
      await buildData(db, n, {
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
          await buildData(db, n, {...context, pseudo})
        }
      })
    )
  }
}
