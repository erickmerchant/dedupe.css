export const RAW = Symbol('raw')

export const REPLACEMENT = Symbol('replacement')

export const VALIDATE = Symbol('validate')

export const css = (strs, ...vars) => {
  const result = {[RAW]: {strs, vars}}

  return new Proxy(result, {
    get(obj, key) {
      if (key === RAW) return obj[RAW]

      return {
        [REPLACEMENT]: {[RAW]: obj[RAW], key}
      }
    }
  })
}

export const define = (vmapped) => {
  const result = {}

  if (vmapped) {
    result[VALIDATE] = (primary, list) => {
      return list.reduce((acc, curr) => {
        if (!vmapped[primary].includes(curr)) return false

        return acc
      }, true)
    }
  }

  return result
}

export const concat = (classes, name, props) => {
  let list = []

  for (const [key, val] of Object.entries(props)) {
    if (val === true) {
      list.push(key)
    } else if (val) {
      list.push(`${key}${val}`)
    }
  }

  if (import.meta.env?.DEV) {
    if (!classes[VALIDATE](name, list)) {
      throw Error(`invalid classList: ${list.join(' ')}`)
    }
  }

  list = list.map((item) => classes[item])

  list.unshift(classes[name])

  return list.join(' ')
}
