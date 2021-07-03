import * as selectorParse from './selector-parse.js'

export const createSingleGenerator =
  (getClassName, addToMap) => async (singles, nameMap) => {
    let prevSingle

    let cssStr = ''

    if (singles.length) {
      let id

      for (const single of singles) {
        if (single.nameID !== prevSingle?.nameID) {
          if (!nameMap[single.nameID]) {
            id = getClassName()

            nameMap[single.nameID] = id

            addToMap(single.namespace, single.name, single.name, id)
          } else {
            id = nameMap[single.nameID]
          }
        }

        if (
          single.nameID !== prevSingle?.nameID ||
          single.suffix !== prevSingle?.suffix
        ) {
          if (prevSingle != null) cssStr += `}`

          let suffix = ''

          if (single.suffix) {
            const selectorNodes = selectorParse.tokenize(single.suffix)[0]

            for (const selector of selectorNodes) {
              if (selector.type === 'class') {
                if (!nameMap[selector.name]) {
                  nameMap[selector.name] = getClassName()
                }

                addToMap(
                  single.namespace,
                  single.name,
                  selector.name,
                  nameMap[selector.name]
                )

                selector.content = `.${nameMap[selector.name]}`
              }
            }

            suffix = selectorNodes.map((token) => token.content).join('')
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
