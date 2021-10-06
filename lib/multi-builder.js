import * as model from './model.js';

export const createMultiBuilder =
  (getClassName) => async (multis, searchID) => {
    let cssStr = '';

    if (multis.length) {
      let prevSelectors;

      for (const multi of multis) {
        const multipleItems = model.selectItems(
          searchID,
          multi.prop,
          multi.value,
          multi.weight
        );

        let prevItem;

        let selectors = new Set();

        for (const item of multipleItems) {
          const key = `${multi.nameIDs} ${item.suffix} ${item.repeat}`;

          const id = getClassName(key, item.namespace, item.name);

          if (
            prevItem == null ||
            prevItem.suffix !== item.suffix ||
            prevItem.repeat !== item.repeat
          ) {
            selectors.add(`${`.${id}`.repeat(item.repeat)}${item.suffix}`);
          }

          prevItem = item;
        }

        selectors = Array.from(selectors).join(',');

        if (prevSelectors !== selectors) {
          if (prevSelectors != null) {
            cssStr += '}';
          }

          cssStr += `${selectors}{`;
        }

        cssStr += `${multi.prop}:${multi.value};`;

        prevSelectors = selectors;
      }

      cssStr += '}';
    }

    return cssStr;
  };
