import assert from 'assert';

import * as model from './model.js';
import * as selectorParse from './selector-parse.js';

export const buildData = async (root, context = {}) => {
  for (const node of root.nodes) {
    if (node.type === 'decl') {
      const prop = node.prop;
      const value = node.value;

      const name = model.insertName(
        context.name,
        context.suffix ?? '',
        context.namespace
      );

      model.insertDecl(context.parentAtruleID ?? 0, name, prop, value, value);
    } else if (node.type === 'atrule') {
      const atruleName = `@${node.name} ${node.params}`;

      const atruleID = model.insertAtrule(
        context.parentAtruleID ?? 0,
        atruleName
      );

      await buildData(node, {
        ...context,
        parentAtruleID: atruleID,
      });
    } else if (node.type === 'rule') {
      const parsed = selectorParse.tokenize(node.selector.trim());

      await Promise.all(
        parsed.map(async (n) => {
          assert.ok(n[0].type === 'class', 'Selectors must start with a class');

          assert.ok(
            n.filter((curr) => curr.type === 'combinator').length === 0,
            'No combinators allowed in selectors'
          );

          const name = n[0].name;

          const suffix = n
            .slice(1)
            .map((token) => token.content)
            .join('');

          await buildData(node, {...context, suffix, name});
        })
      );
    }
  }
};
