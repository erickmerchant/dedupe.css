import * as selectorParse from './selector-parse.js'

export const createSingleGenerator =
  (getClassName, model) => async (singles) => {
    let prevSingle

    let cssStr = ''

    if (singles.length) {
      let id

      for (const single of singles) {
        if (single.nameID !== prevSingle?.nameID) {
          const key = `${single.namespace} ${single.name}`

          id = getClassName(key, single.namespace, single.name)
        }

        if (
          single.nameID !== prevSingle?.nameID ||
          single.suffix !== prevSingle?.suffix
        ) {
          if (prevSingle != null) {
            cssStr += `}`
          }

          let suffix = ''

          if (single.suffix) {
            suffix = selectorParse.transform(single.suffix, (name) =>
              getClassName(name, single.namespace, name)
            )
          }

          cssStr += `${Array(single.repeat).fill(`.${id}`).join('')}${suffix}{`
        }

        cssStr += `${single.prop}:${single.value};`

        prevSingle = single
      }

      cssStr += `}`
    }

    return cssStr
  }
