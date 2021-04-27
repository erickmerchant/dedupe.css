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

await exec(`
  CREATE TABLE name (
    id INTEGER PRIMARY KEY,
    name TEXT,
    namespace TEXT
  );

  CREATE TABLE decl (
    id INTEGER PRIMARY KEY,
    atruleID INTEGER,
    nameID INTEGER,
    suffix TEXT,
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
  CREATE UNIQUE INDEX uniqueName ON name(name, namespace);
  CREATE UNIQUE INDEX uniqueDecl ON decl(atruleID, nameID, suffix, prop);
  CREATE UNIQUE INDEX uniqueAtrule ON atrule(parentAtruleID, name);
`)

export const insertName = async (name, namespace) => {
  await run(
    `
      INSERT INTO name (name, namespace)
      VALUES (?, ?)
        ON CONFLICT (name, namespace)
        DO NOTHING
    `,
    name,
    namespace
  )

  const {nameID} = await get(
    `
      SELECT id as nameID
      FROM name
      WHERE name = ?
        AND namespace = ?
    `,
    name,
    namespace
  )

  return nameID
}

export const insertDecl = async (atruleID, nameID, suffix, prop, value) => {
  if (longShort[prop]) {
    await run(
      `DELETE FROM decl
      WHERE prop IN (${Array(longShort[prop].length).fill('?').join(', ')})
        AND atruleID = ?
        AND nameID = ?
        AND suffix = ?
      `,
      ...longShort[prop],
      atruleID,
      nameID,
      suffix
    )
  }

  await run(
    `
      INSERT INTO decl (atruleID, nameID, suffix, prop, value, weight)
      VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (atruleID, nameID, suffix, prop)
        DO UPDATE set value = ?
    `,
    atruleID,
    nameID,
    suffix,
    prop,
    value,
    shortLong[prop] ? 1 : 0,
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

export const selectSingles = (searchID) =>
  all(
    `
      SELECT name, nameID, namespace, prop, suffix, value, GROUP_CONCAT(DISTINCT nameID) as nameIDs, GROUP_CONCAT(DISTINCT suffix) as suffixes
      FROM decl
        LEFT JOIN name ON decl.nameID = name.id
      WHERE atruleID = ?
      GROUP BY atruleID, prop, value
        HAVING COUNT(decl.id) = 1
      ORDER BY nameIDs, suffixes, weight
    `,
    searchID
  )

export const selectMultiples = (searchID) =>
  all(
    `
      SELECT atruleID, prop, value, GROUP_CONCAT(DISTINCT nameID) as nameIDs, GROUP_CONCAT(DISTINCT suffix) as suffixes
      FROM decl
      WHERE atruleID = ?
      GROUP BY atruleID, prop, value
        HAVING COUNT(id) > 1
      ORDER BY nameIDs, suffixes, weight
    `,
    searchID
  )

export const rules = (atruleID, prop, value) =>
  all(
    `
      SELECT namespace, name, suffix, nameID
      FROM decl
        LEFT JOIN name ON decl.nameID = name.id
      WHERE atruleID = ?
        AND prop = ?
        AND value = ?
      ORDER BY suffix, nameID
    `,
    atruleID,
    prop,
    value
  )

export const atrules = (searchID) =>
  all(
    `
      SELECT parentAtruleID, name, id
      FROM atrule
      WHERE parentAtruleID = ?
    `,
    searchID
  )
