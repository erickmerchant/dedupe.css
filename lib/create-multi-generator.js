import * as model from './model.js'
import * as selectorParse from './selector-parse.js'

export const createMultiGenerator =
  (getClassName) => async (multis, searchID) => {
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

        let prevItem, id

        let selectors = new Set()

        for (const item of multipleItems) {
          const key = `${multi.nameIDs} ${item.suffix} ${item.repeat}`

          if (
            prevItem == null ||
            prevItem.suffix !== item.suffix ||
            prevItem.repeat !== item.repeat
          ) {
            id = getClassName(key, item.namespace, item.name)

            let suffix = ''

            if (item.suffix) {
              suffix = selectorParse.transform(item.suffix, (name) =>
                getClassName(name, item.namespace, name)
              )
            }

            selectors.add(
              `${Array(item.repeat).fill(`.${id}`).join('')}${suffix}`
            )
          }

          getClassName(key, item.namespace, item.name)

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
