import selectorTokenizer from 'css-selector-tokenizer'

import * as model from './model.js'

export const createMultiGenerator =
  (getUniqueID, addToMap) => async (multis, nameMap, searchID) => {
    let cssStr = ''

    if (multis.length) {
      let prevSelectors

      for (const multi of multis) {
        const multipleItems = await model.selectItems(
          searchID,
          multi.prop,
          multi.value,
          multi.nameIDs.split('-')
        )

        let prevItem
        let id
        let selectors = new Set()

        for (const item of multipleItems) {
          if (
            prevItem == null ||
            prevItem.suffix !== item.suffix ||
            prevItem.repeat !== item.repeat
          ) {
            const key = `${multi.nameIDs} ${item.suffix} ${item.repeat}`

            if (!nameMap[key]) {
              id = getUniqueID()

              nameMap[key] = id

              addToMap(item.namespace, item.name, id)
            } else {
              id = nameMap[key]
            }

            let suffix = ''

            if (item.suffix) {
              const selectorNodes =
                selectorTokenizer.parse(item.suffix).nodes ?? []

              for (const selector of selectorNodes[0].nodes) {
                if (selector.type === 'class') {
                  if (!nameMap[selector.name]) {
                    nameMap[selector.name] = getUniqueID()
                  }

                  addToMap(
                    item.namespace,
                    selector.name,
                    nameMap[selector.name]
                  )

                  selector.name = nameMap[selector.name]
                }
              }

              suffix = selectorTokenizer.stringify(selectorNodes[0])
            }

            selectors.add(
              `${Array(item.repeat).fill(`.${id}`).join('')}${suffix}`
            )
          }

          addToMap(item.namespace, item.name, id)

          prevItem = item
        }

        selectors = Array.from(selectors).join(',')

        if (prevSelectors !== selectors) {
          if (prevSelectors != null) {
            cssStr += '}'
          }

          cssStr += `${selectors}{`
        }

        cssStr += `${multi.prop}:${multi.value};`

        prevSelectors = selectors
      }

      cssStr += '}'
    }

    return cssStr
  }
