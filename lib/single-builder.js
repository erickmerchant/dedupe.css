export const createSingleBuilder = (getClassName, model) => async (singles) => {
  let prevSingle;

  let cssStr = '';

  if (singles.length) {
    let id;

    for (const single of singles) {
      if (single.nameID !== prevSingle?.nameID) {
        const key = `${single.namespace} ${single.name}`;

        id = getClassName(key, single.namespace, single.name);
      }

      if (
        single.nameID !== prevSingle?.nameID ||
        single.suffix !== prevSingle?.suffix
      ) {
        if (prevSingle != null) {
          cssStr += `}`;
        }

        cssStr += `${`.${id}`.repeat(single.repeat)}${single.suffix}{`;
      }

      cssStr += `${single.prop}:${single.value};`;

      prevSingle = single;
    }

    cssStr += `}`;
  }

  return cssStr;
};
