const getClassNames = (node) => {
  const results = []

  if (node.nodes) {
    for (const n of node.nodes) {
      if (n.type === 'class') {
        results.push(n.name)
      }

      if (n.nodes) {
        results.push(...getClassNames(n))
      }
    }
  }

  return results
}

export default getClassNames
