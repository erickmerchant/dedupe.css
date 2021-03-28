import selectorTokenizer from 'css-selector-tokenizer'

export const buildData = async (db, node, context = {}) => {
  if (node.type === 'decl') {
    const prop = node.prop
    const value = node.value

    await db.run(
      'INSERT INTO name (name, namespace) VALUES (?, ?) ON CONFLICT (name, namespace) DO NOTHING',
      context.name,
      context.namespace
    )

    const {nameID} = await db.get(
      'SELECT id as nameID FROM name WHERE name = ? AND namespace = ?',
      context.name,
      context.namespace
    )

    await db.run(
      'INSERT INTO decl (atruleID, nameID, pseudo, prop, value) VALUES (?, ?, ?, ?, ?) ON CONFLICT (atruleID, nameID, pseudo, prop) DO UPDATE set value = ?',
      context.parentAtruleID ?? 0,
      nameID,
      context.pseudo ?? '',
      prop,
      value,
      value
    )
  } else if (node.type === 'atrule') {
    const atruleName = `@${node.name} ${node.params}`

    await db.run(
      'INSERT INTO atrule (parentAtruleID, name) VALUES (?, ?) ON CONFLICT (parentAtruleID, name) DO NOTHING',
      context.parentAtruleID ?? 0,
      atruleName
    )

    const {atruleID} = await db.get(
      'SELECT id as atruleID FROM atrule WHERE parentAtruleID = ? AND name = ?',
      context.parentAtruleID ?? 0,
      atruleName
    )

    await db.run(
      'INSERT INTO name (name, namespace) VALUES (?, ?) ON CONFLICT (name, namespace) DO NOTHING',
      context.name,
      context.namespace
    )

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
