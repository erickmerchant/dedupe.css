import selectorTokenizer from 'css-selector-tokenizer'

export const createSingleGenerator =
  (getUniqueID, addToMap) => async (singles, nameMap) => {
    let prevSingle

    let cssStr = ''

    if (singles.length) {
      let id

      for (const single of singles) {
        if (single.nameID !== prevSingle?.nameID) {
          if (!nameMap[single.nameID]) {
            id = getUniqueID()

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
            const selectorNodes = selectorTokenizer.parse(single.suffix).nodes

            for (const selector of selectorNodes[0].nodes) {
              if (selector.type === 'class') {
                if (!nameMap[selector.name]) {
                  nameMap[selector.name] = getUniqueID()
                }

                addToMap(
                  single.namespace,
                  single.name,
                  selector.name,
                  nameMap[selector.name]
                )

                selector.name = nameMap[selector.name]
              }
            }

            suffix = selectorTokenizer.stringify(selectorNodes[0])
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
