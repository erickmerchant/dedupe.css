import * as selectorParse from './selector-parse.js'

export const createSingleGenerator =
  (getClassName, addToMap) => async (singles, nameMap) => {
    let prevSingle

    let cssStr = ''

    if (singles.length) {
      let id

      for (const single of singles) {
        if (single.nameID !== prevSingle?.nameID) {
          const key = `${single.namespace} ${single.name}`

          if (!nameMap[key]) {
            id = getClassName()

            nameMap[key] = id

            addToMap(single.namespace, single.name, single.name, id)
          } else {
            id = nameMap[key]
          }
        }

        if (
          single.nameID !== prevSingle?.nameID ||
          single.suffix !== prevSingle?.suffix
        ) {
          if (prevSingle != null) cssStr += `}`

          let suffix = ''

          if (single.suffix) {
            suffix = selectorParse.transform(single.suffix, (name) => {
              const key = `${single.namespace} ${name}`

              if (!nameMap[key]) {
                nameMap[key] = getClassName()
              }

              addToMap(single.namespace, single.name, name, nameMap[key])

              return nameMap[key]
            })
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
