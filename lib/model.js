import mdn from 'mdn-data';
import initSqlJs from 'sql.js';

import * as selectorParse from './selector-parse.js';

const SQL = await initSqlJs();

const shorthands = {};

for (const [property, data] of Object.entries(mdn.css.properties)) {
  if (Array.isArray(data.computed)) {
    shorthands[property] = data.computed;
  }
}

// patch for {padding,margin}-{inline,block}
shorthands['margin'].push('margin-inline', 'margin-block');
shorthands['padding'].push('padding-inline', 'padding-block');
shorthands['margin-inline'] = ['margin-inline-start', 'margin-inline-end'];
shorthands['padding-inline'] = ['padding-inline-start', 'padding-inline-end'];

const db = new SQL.Database();

const all = (sql, params = []) => {
  const rows = [];

  db.each(sql, params, (row) => {
    rows.push(row);
  });

  return rows;
};

const get = (sql, params) => {
  const stmt = db.prepare(sql);

  const result = stmt.getAsObject(params);

  stmt.free();

  return result;
};

db.exec(
  `
    CREATE TABLE name (
      id INTEGER PRIMARY KEY,
      name TEXT,
      namespace TEXT,
      suffix TEXT,
      specificityA INTEGER,
      isPseudoElement INTEGER,
      position INTEGER
    );

    CREATE TABLE decl (
      id INTEGER PRIMARY KEY,
      atruleID INTEGER,
      nameID INTEGER,
      prop TEXT,
      value TEXT,
      weight INTEGER
    );

    CREATE TABLE atrule (
      id INTEGER PRIMARY KEY,
      parentAtruleID INTEGER,
      name TEXT
    );

    CREATE INDEX declAtrule ON decl(atruleID);
    CREATE INDEX atruleAtrule ON atrule(parentAtruleID);
    CREATE UNIQUE INDEX uniqueName ON name(name, suffix, namespace);
    CREATE UNIQUE INDEX uniqueDecl ON decl(atruleID, nameID, prop);
    CREATE UNIQUE INDEX uniqueAtrule ON atrule(parentAtruleID, name);
  `
);

export const insertName = (name, suffix, namespace) => {
  let position = 1;

  const [specificityA, specificityB, specificityC] = selectorParse.specificity(
    suffix
  ) ?? [0, 0, 0];

  const isPseudoElement =
    specificityA === 0 &&
    specificityB === 0 &&
    specificityC === 1 &&
    suffix.startsWith('::')
      ? 1
      : 0;

  if (suffix && !isPseudoElement) {
    const ids = all(
      `
        SELECT id
        FROM name
        WHERE name = ? AND namespace = ? AND suffix != '' AND specificityA = ? AND isPseudoElement = 0
      `,
      [name, namespace, specificityA]
    );

    position = (ids?.length ?? 0) + 1;
  }

  db.run(
    `
      INSERT INTO name (name, suffix, namespace, specificityA, isPseudoElement, position)
      VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (name, suffix, namespace)
        DO NOTHING
    `,
    [name, suffix, namespace, specificityA, isPseudoElement, position]
  );

  const row = get(
    `
      SELECT *
      FROM name
      WHERE name = ?
        AND suffix = ?
        AND namespace = ?
    `,
    [name, suffix, namespace]
  );

  return row;
};

export const insertDecl = (atruleID, name, prop, value) => {
  if (shorthands[prop]) {
    db.run(
      `
        DELETE FROM decl
        WHERE prop IN (${Array(shorthands[prop].length).fill('?').join(', ')})
          AND atruleID = ?
          AND nameID = ?
      `,
      [...shorthands[prop], atruleID, name.id]
    );
  }

  db.run(
    `
      INSERT INTO decl (atruleID, nameID, prop, value, weight)
      VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (atruleID, nameID, prop)
        DO UPDATE SET value = ?
    `,
    [atruleID, name.id, prop, value, shorthands[prop] ? 0 : 1, value]
  );
};

export const insertAtrule = (parentAtruleID, atruleName) => {
  db.run(
    `
      INSERT INTO atrule (parentAtruleID, name)
      VALUES (?, ?)
        ON CONFLICT (parentAtruleID, name)
        DO NOTHING
    `,
    [parentAtruleID, atruleName]
  );

  const {atruleID} = get(
    `
      SELECT id as atruleID
      FROM atrule
      WHERE parentAtruleID = ?
        AND name = ?
    `,
    [parentAtruleID, atruleName]
  );

  return atruleID;
};

export const selectShorthandGroups = (atruleID) =>
  all(
    `
      SELECT GROUP_CONCAT(nameID, '-') as nameIDs, prop, value, weight, position
      FROM decl
        LEFT JOIN name ON decl.nameID = name.id
      WHERE atruleID = ? AND weight = 0
      GROUP BY position, prop, value
        HAVING COUNT(decl.id) > 1 OR position > 1
      ORDER BY position, nameIDs
    `,
    [atruleID]
  );

export const selectSingles = (atruleID) =>
  all(
    `
      SELECT nameID, namespace, name, suffix, prop, value
      FROM decl
        LEFT JOIN name ON decl.nameID = name.id
      WHERE atruleID = ?
      GROUP BY position, prop, value
        HAVING COUNT(decl.id) = 1 AND position = 1
      ORDER BY position, decl.id
    `,
    [atruleID]
  );

export const selectMultipleGroups = (atruleID) =>
  all(
    `
      SELECT GROUP_CONCAT(nameID, '-') as nameIDs, prop, value, weight, position
      FROM decl
        LEFT JOIN name ON decl.nameID = name.id
      WHERE atruleID = ? AND weight > 0
      GROUP BY position, prop, value
        HAVING COUNT(decl.id) > 1 OR position > 1
      ORDER BY position, weight, nameIDs
    `,
    [atruleID]
  );

export const selectItems = (atruleID, prop, value, weight, position) =>
  all(
    `
      SELECT namespace, name, suffix
      FROM decl
        LEFT JOIN name ON decl.nameID = name.id
      WHERE atruleID = ?
        AND prop = ?
        AND value = ?
        AND weight = ?
        AND position = ?
      ORDER BY nameID, suffix
    `,
    [atruleID, prop, value, weight, position]
  );

export const selectAtrules = (parentAtruleID) =>
  all(
    `
      SELECT parentAtruleID, name, id
      FROM atrule
      WHERE parentAtruleID = ?
    `,
    [parentAtruleID]
  );
