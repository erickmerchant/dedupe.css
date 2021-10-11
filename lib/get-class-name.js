const letters = '_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const nameMap = {};

export const createGetClassName =
  (addToMap, prefix = '', id = 0) =>
  (key, namespace, name) => {
    let className;

    if (!nameMap[key]) {
      let result = '';

      let i = ++id;

      let r;

      do {
        r = i % letters.length;

        i = (i - r) / letters.length;

        result = letters[r] + result;
      } while (i);

      className = `${prefix}${result}`;

      nameMap[key] = className;
    } else {
      className = nameMap[key];
    }

    addToMap(namespace, name, className);

    return className;
  };
