export const RAW = Symbol('raw')

export const REPLACEMENT = Symbol('replacement')

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

export const concat = (...args) => {
  const list = []

  for (const arg of args) {
    if (typeof arg === 'object') {
      for (const [key, val] of Object.entries(arg)) {
        if (val) {
          list.push(key)
        }
      }
    } else if (arg) {
      list.push(arg)
    }
  }

  return list.join(' ')
}
