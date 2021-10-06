import fs from 'fs/promises';
import {gray} from 'kleur/colors';
import path from 'path';
import postcss from 'postcss';
import postcssNesting from 'postcss-nesting';
import postcssSortMediaQueries from 'postcss-sort-media-queries';

import {buildData} from './build-data.js';
import {devTemplate} from './dev-template.js';
import {createGetClassName} from './get-class-name.js';
import * as model from './model.js';
import {createMultiBuilder} from './multi-builder.js';
import {createSingleBuilder} from './single-builder.js';
import {template} from './template.js';

const parse = async (str) =>
  postcss.parse(
    (
      await postcss([postcssNesting()]).process(str, {
        from: 'styles.css',
      })
    ).css
  );

export const compile = async (args) => {
  const cacheBustedInput = `${args['--input-file']}?${Date.now()}`;

  const input = await import(cacheBustedInput);

  const inputStyles = {};

  for (const namespace of Object.keys(input)) {
    if (namespace.startsWith('_')) continue;

    inputStyles[namespace] = await parse(input[namespace]);
  }

  await fs.mkdir(path.join(process.cwd(), args['--output-directory']), {
    recursive: true,
  });

  const outpath = path.join(
    process.cwd(),
    args['--output-directory'],
    path.basename(args['--input-file'], path.extname(args['--input-file']))
  );

  const output = {
    css: '',
    js: '',
    json: '',
  };

  const css = postcss.parse('');

  const map = {};

  const addToMap = (namespace, name, id) => {
    if (map[namespace] == null) {
      map[namespace] = {};
    }

    if (map[namespace][name] == null) {
      map[namespace][name] = new Set();
    }

    map[namespace][name].add(id);
  };

  if (input?._start) {
    const start = await parse(input?._start);

    css.append(start);
  }

  const getClassName = createGetClassName(addToMap, args['--prefix'] ?? '');

  const multiBuilder = createMultiBuilder(getClassName);

  const singleBuilder = createSingleBuilder(getClassName, model);

  for (const namespace of Object.keys(inputStyles)) {
    const context = {namespace, position: 0};

    await buildData(inputStyles[namespace], context);
  }

  const buildCSS = async (searchID) => {
    let cssStr = '';

    cssStr += await multiBuilder(
      model.selectShorthandGroups(searchID),
      searchID
    );

    cssStr += await singleBuilder(model.selectSingles(searchID), searchID);

    cssStr += await multiBuilder(
      model.selectMultipleGroups(searchID),
      searchID
    );

    const atrules = model.selectAtrules(searchID);

    for (let i = 0; i < atrules.length; i++) {
      const {name, id} = atrules[i];

      cssStr += `${name}{${await buildCSS(id)}}`;
    }

    return cssStr;
  };

  css.append(await buildCSS(0));

  css.append(input?._end ? await parse(input._end) : '');

  const sortedCSS = (
    await postcss([postcssSortMediaQueries]).process(css, {
      from: 'styles.css',
    })
  ).css;

  for (const namespace of Object.keys(map)) {
    for (const name of Object.keys(map[namespace])) {
      map[namespace][name] = Array.from(map[namespace][name]).join(' ');
    }

    output.js += (args['--dev'] ? devTemplate : template)(
      namespace,
      map[namespace]
    );
  }

  output.css = sortedCSS;

  output.json = JSON.stringify(map);

  return Promise.all(
    ['css', 'js', 'json'].map((type) =>
      fs.writeFile(`${outpath}.${type}`, output[type]).then(async () => {
        console.log(
          `${gray('[css]')} saved ${path.relative(
            process.cwd(),
            outpath
          )}.${type}`
        );
      })
    )
  );
};
