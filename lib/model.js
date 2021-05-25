import mdn from 'mdn-data'
import sqlite3 from 'sqlite3'
import {promisify} from 'util'

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

const dbinstance = new sqlite3.Database(':memory:')

const exec = promisify(dbinstance.exec.bind(dbinstance))
const all = promisify(dbinstance.all.bind(dbinstance))
const get = promisify(dbinstance.get.bind(dbinstance))
const run = promisify(dbinstance.run.bind(dbinstance))

await exec(
  `
    CREATE TABLE name (
      id INTEGER PRIMARY KEY,
      name TEXT,
      namespace TEXT,
      suffix TEXT,
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

export const insertName = async (name, suffix, namespace) => {
  let repeat = 1

  if (suffix && !suffix.startsWith('::')) {
    const ids = await all(
      `
        SELECT id
        FROM name
        WHERE name = ? AND namespace = ? AND suffix != ''
      `,
      name,
      namespace
    )

    repeat = (ids?.length ?? 0) + 1
  }

  await run(
    `
      INSERT INTO name (name, suffix, namespace, repeat)
      VALUES (?, ?, ?, ?)
        ON CONFLICT (name, suffix, namespace)
        DO NOTHING
    `,
    name,
    suffix,
    namespace,
    repeat
  )

  const row = await get(
    `
      SELECT *
      FROM name
      WHERE name = ?
        AND suffix = ?
        AND namespace = ?
    `,
    name,
    suffix,
    namespace
  )

  return row
}

export const insertDecl = async (atruleID, name, prop, value) => {
  if (longShort[prop]) {
    await run(
      `
        DELETE FROM decl
        WHERE prop IN (${Array(longShort[prop].length).fill('?').join(', ')})
          AND atruleID = ?
          AND nameID = ?
      `,
      ...longShort[prop],
      atruleID,
      name.id
    )
  }

  await run(
    `
      INSERT INTO decl (atruleID, nameID, prop, value, weight)
      VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (atruleID, nameID, prop)
        DO UPDATE SET value = ?
    `,
    atruleID,
    name.id,
    prop,
    value,
    shortLong[prop] ? 2 : longShort[prop] ? 0 : 1,
    value
  )
}

export const insertAtrule = async (parentAtruleID, atruleName) => {
  await run(
    `
      INSERT INTO atrule (parentAtruleID, name)
      VALUES (?, ?)
        ON CONFLICT (parentAtruleID, name)
        DO NOTHING
    `,
    parentAtruleID,
    atruleName
  )

  const {atruleID} = await get(
    `
      SELECT id as atruleID
      FROM atrule
      WHERE parentAtruleID = ?
        AND name = ?
    `,
    parentAtruleID,
    atruleName
  )

  return atruleID
}

export const selectShorthandGroups = (searchID) =>
  all(
    `
      SELECT GROUP_CONCAT(nameID, '-') as nameIDs, prop, value
      FROM decl
      WHERE atruleID = ? AND weight = 0
      GROUP BY prop, value
        HAVING COUNT(id) > 1
      ORDER BY weight, nameIDs
    `,
    searchID
  )

export const selectSingles = (searchID) =>
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
    searchID
  )

export const selectMultipleGroups = (searchID) =>
  all(
    `
      SELECT GROUP_CONCAT(nameID, '-') as nameIDs, prop, value
      FROM decl
      WHERE atruleID = ? AND weight > 0
      GROUP BY prop, value
        HAVING COUNT(id) > 1
      ORDER BY weight, nameIDs
    `,
    searchID
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
        AND nameID IN (${Array(nameIDs.length).fill('?').join(', ')})
      ORDER BY nameID, suffix
    `,
    atruleID,
    prop,
    value,
    ...nameIDs
  )

export const selectAtrules = (searchID) =>
  all(
    `
      SELECT parentAtruleID, name, id
      FROM atrule
      WHERE parentAtruleID = ?
    `,
    searchID
  )
