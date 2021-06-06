export const template = (
  id,
  namespace,
  entries
) => `export const ${namespace} = (() => {
  const classes = (...props) => ${id}('${namespace}', classes, props)

  ${entries
    .map(
      ([key, value]) =>
        `classes[${JSON.stringify(key)}] = ${JSON.stringify(value)}`
    )
    .join('\n')}

  return classes
})()\n`
