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
