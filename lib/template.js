export const template = (namespace, map) =>
  `export const ${namespace} = ${JSON.stringify(map)}\n`
