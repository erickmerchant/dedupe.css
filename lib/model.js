import mdn from 'mdn-data'
import initSqlJs from 'sql.js'

import * as selectorParse from './selector-parse.js'

const SQL = await initSqlJs()

const shortLong = {}
const longShort = {}

for (const [property, data] of Object.entries(mdn.css.properties)) {
  if (Array.isArray(data.computed)) {
    longShort[property] = data.computed

    for (const p of data.computed) {
      shortLong[p] = (shortLong[p] ?? []).concat(property)
    }
  }
}

const db = new SQL.Database()

const all = (sql, params) => {
  const rows = []

  db.each(sql, params, (row) => {
    rows.push(row)
  })

  return rows
}

const get = (sql, params) => {
  const stmt = db.prepare(sql)

  const result = stmt.getAsObject(params)

  stmt.free()

  return result
}

db.exec(
  `
    CREATE TABLE name (
      id INTEGER PRIMARY KEY,
      name TEXT,
      namespace TEXT,
      suffix TEXT,
      specificityA INTEGER,
      isPseudoElement INTEGER,
      repeat INTEGER
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
)

export const insertName = (name, suffix, namespace) => {
  let repeat = 1

  const [specificityA, specificityB, specificityC] = selectorParse.specificity(
    suffix
  ) ?? [0, 0, 0]

  const isPseudoElement =
    specificityA === 0 &&
    specificityB === 0 &&
    specificityC === 1 &&
    suffix.startsWith('::')
      ? 1
      : 0

  if (suffix && !isPseudoElement) {
    const ids = all(
      `
        SELECT id
        FROM name
        WHERE name = ? AND namespace = ? AND suffix != '' AND specificityA = ? AND isPseudoElement = 0
      `,
      [name, namespace, specificityA]
    )

    repeat = (ids?.length ?? 0) + 1
  }

  db.run(
    `
      INSERT INTO name (name, suffix, namespace, specificityA, isPseudoElement, repeat)
      VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (name, suffix, namespace)
        DO NOTHING
    `,
    [name, suffix, namespace, specificityA, isPseudoElement, repeat]
  )

  const row = get(
    `
      SELECT *
      FROM name
      WHERE name = ?
        AND suffix = ?
        AND namespace = ?
    `,
    [name, suffix, namespace]
  )

  return row
}

export const insertDecl = (atruleID, name, prop, value) => {
  if (longShort[prop]) {
    db.run(
      `
        DELETE FROM decl
        WHERE prop IN (${Array(longShort[prop].length).fill('?').join(', ')})
          AND atruleID = ?
          AND nameID = ?
      `,
      [...longShort[prop], atruleID, name.id]
    )
  }

  db.run(
    `
      INSERT INTO decl (atruleID, nameID, prop, value, weight)
      VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (atruleID, nameID, prop)
        DO UPDATE SET value = ?
    `,
    [
      atruleID,
      name.id,
      prop,
      value,
      shortLong[prop] ? 2 : longShort[prop] ? 0 : 1,
      value
    ]
  )
}

export const insertAtrule = (parentAtruleID, atruleName) => {
  db.run(
    `
      INSERT INTO atrule (parentAtruleID, name)
      VALUES (?, ?)
        ON CONFLICT (parentAtruleID, name)
        DO NOTHING
    `,
    [parentAtruleID, atruleName]
  )

  const {atruleID} = get(
    `
      SELECT id as atruleID
      FROM atrule
      WHERE parentAtruleID = ?
        AND name = ?
    `,
    [parentAtruleID, atruleName]
  )

  return atruleID
}

export const selectShorthandGroups = (atruleID) =>
  all(
    `
      SELECT GROUP_CONCAT(nameID, '-') as nameIDs, prop, value
      FROM decl
      WHERE atruleID = ? AND weight = 0
      GROUP BY prop, value
        HAVING COUNT(id) > 1
      ORDER BY weight, nameIDs
    `,
    [atruleID]
  )

export const selectSingles = (atruleID) =>
  all(
    `
      SELECT namespace, nameID, name, suffix, repeat, prop, value
      FROM decl
        LEFT JOIN name ON decl.nameID = name.id
      WHERE atruleID = ?
      GROUP BY prop, value
        HAVING COUNT(decl.id) = 1
      ORDER BY decl.id
    `,
    [atruleID]
  )

export const selectMultipleGroups = (atruleID) =>
  all(
    `
      SELECT GROUP_CONCAT(nameID, '-') as nameIDs, prop, value
      FROM decl
      WHERE atruleID = ? AND weight > 0
      GROUP BY prop, value
        HAVING COUNT(id) > 1
      ORDER BY weight, nameIDs
    `,
    [atruleID]
  )

export const selectItems = (atruleID, prop, value, nameIDs) =>
  all(
    `
      SELECT namespace, nameID, name, suffix, repeat
      FROM decl
        LEFT JOIN name ON decl.nameID = name.id
      WHERE atruleID = ?
        AND prop = ?
        AND value = ?
        AND nameID IN (${nameIDs.map(() => '?').join(', ')})
      ORDER BY nameID, suffix
    `,
    [atruleID, prop, value, ...nameIDs]
  )

export const selectAtrules = (parentAtruleID) =>
  all(
    `
      SELECT parentAtruleID, name, id
      FROM atrule
      WHERE parentAtruleID = ?
    `,
    [parentAtruleID]
  )
