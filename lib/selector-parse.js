import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const parsel = require('parsel-js');

export const tokenize = (str) => {
  let latest = [];
  const acc = [latest];

  for (const token of parsel.tokenize(str)) {
    if (token.type === 'comma') {
      latest = [];
      acc.push(latest);
    } else {
      latest.push(token);
    }
  }

  return acc;
};

export const specificity = parsel.specificity;
