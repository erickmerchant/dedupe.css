export const schema = `
  CREATE TABLE name (
    id INTEGER PRIMARY KEY,
    name TEXT,
    namespace TEXT
  );

  CREATE TABLE decl (
    id INTEGER PRIMARY KEY,
    atruleID INTEGER,
    nameID INTEGER,
    pseudo TEXT,
    prop TEXT,
    value TEXT
  );

  CREATE TABLE atrule (
    id INTEGER PRIMARY KEY,
    parentAtruleID INTEGER,
    name TEXT
  );

  CREATE INDEX declAtrule ON decl(atruleID);
  CREATE INDEX atruleAtrule ON atrule(parentAtruleID);
  CREATE UNIQUE INDEX uniqueName ON name(name, namespace);
  CREATE UNIQUE INDEX uniqueDecl ON decl(atruleID, nameID, pseudo, prop);
  CREATE UNIQUE INDEX uniqueAtrule ON atrule(parentAtruleID, name);
`

export const insertName = `
  INSERT INTO name (name, namespace)
  VALUES (?, ?)
    ON CONFLICT (name, namespace)
    DO NOTHING
`

export const nameID = `
  SELECT id as nameID
  FROM name
  WHERE name = ?
    AND namespace = ?
`

export const insertDecl = `
  INSERT INTO decl (atruleID, nameID, pseudo, prop, value)
  VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (atruleID, nameID, pseudo, prop)
    DO UPDATE set value = ?
`

export const insertAtrule = `
  INSERT INTO atrule (parentAtruleID, name)
  VALUES (?, ?)
    ON CONFLICT (parentAtruleID, name)
    DO NOTHING
`

export const atruleID = `
  SELECT id as atruleID
  FROM atrule
  WHERE parentAtruleID = ?
    AND name = ?
`

export const selectSingles = `
  SELECT name, nameID, namespace, prop, pseudo, value, GROUP_CONCAT(DISTINCT nameID) as nameIDs, GROUP_CONCAT(DISTINCT pseudo) as pseudos
  FROM decl
    LEFT JOIN name ON decl.nameID = name.id
  WHERE atruleID = ?
  GROUP BY atruleID, prop, value
    HAVING COUNT(decl.id) = 1
  ORDER BY nameIDs, pseudos
`

export const selectMultiples = `
  SELECT atruleID, prop, value, GROUP_CONCAT(DISTINCT nameID) as nameIDs, GROUP_CONCAT(DISTINCT pseudo) as pseudos
  FROM decl
  WHERE atruleID = ?
  GROUP BY atruleID, prop, value
    HAVING COUNT(id) > 1
  ORDER BY nameIDs, pseudos
`

export const rules = `
  SELECT namespace, name, pseudo, nameID
  FROM decl
    LEFT JOIN name ON decl.nameID = name.id
  WHERE atruleID = ?
    AND prop = ?
    AND value = ?
  ORDER BY pseudo, nameID
`

export const atrules = `
  SELECT parentAtruleID, name, id
  FROM atrule
  WHERE parentAtruleID = ?
`

export const shortLong = `
  SELECT name.name, decl1.prop as shortProp, decl2.prop as longProp
  FROM name
    INNER JOIN decl as decl1 ON decl1.nameID = name.id
    INNER JOIN decl as decl2 ON decl1.nameID = decl2.nameID
  WHERE decl1.pseudo = decl2.pseudo AND (
    (decl1.prop = 'border-bottom' AND decl2.prop IN (
      'border-bottom-width',
      'border-bottom-style',
      'border-bottom-color'
    ))
    OR
    (decl1.prop = 'border-color' AND decl2.prop IN (
      'border-top-color',
      'border-right-color',
      'border-bottom-color',
      'border-left-color'
    ))
    OR
    (decl1.prop = 'border-left' AND decl2.prop IN (
      'border-left-width',
      'border-left-style',
      'border-left-color'
    ))
    OR
    (decl1.prop = 'border-radius' AND decl2.prop IN (
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius'
    ))
    OR
    (decl1.prop = 'border-right' AND decl2.prop IN (
      'border-right-width',
      'border-right-style',
      'border-right-color'
    ))
    OR
    (decl1.prop = 'border-style' AND decl2.prop IN (
      'border-top-style',
      'border-right-style',
      'border-bottom-style',
      'border-left-style'
    ))
    OR
    (decl1.prop = 'border-top' AND decl2.prop IN ('border-top-width', 'border-top-style', 'border-top-color'))
    OR
    (decl1.prop = 'border-width' AND decl2.prop IN (
      'border-top-width',
      'border-right-width',
      'border-bottom-width',
      'border-left-width'
    ))
    OR
    (decl1.prop = 'column-rule' AND decl2.prop IN (
      'column-rule-width',
      'column-rule-style',
      'column-rule-color'
    ))
    OR
    (decl1.prop = 'flex-flow' AND decl2.prop IN ('flex-direction', 'flex-wrap'))
    OR
    (decl1.prop = 'grid-area' AND decl2.prop IN (
      'grid-column-start',
      'grid-column-end',
      'grid-row-start',
      'grid-row-end'
    ))
    OR
    (decl1.prop = 'grid-column' AND decl2.prop IN ('grid-column-start', 'grid-column-end'))
    OR
    (decl1.prop = 'grid-row' AND decl2.prop IN ('grid-row-start', 'grid-row-end'))
    OR
    (decl1.prop = 'grid-template' AND decl2.prop IN (
      'grid-template-rows',
      'grid-template-columns',
      'grid-template-areas'
    ))
    OR
    (decl1.prop = 'list-style' AND decl2.prop IN ('list-style-type', 'list-style-image', 'list-style-position'))
    OR
    (decl1.prop = 'place-content' AND decl2.prop IN ('align-content', 'justify-content'))
    OR
    (decl1.prop = 'place-items' AND decl2.prop IN ('align-items', 'justify-items'))
    OR
    (decl1.prop = 'place-self' AND decl2.prop IN ('align-self', 'justify-self'))
    OR
    (decl1.prop = 'text-decoration' AND decl2.prop IN (
      'text-decoration-line',
      'text-decoration-color',
      'text-decoration-style',
      'text-decoration-thickness'
    ))
    OR
    (decl1.prop = 'animation' AND decl2.prop IN (
      'animation-name',
      'animation-duration',
      'animation-timing-function',
      'animation-delay',
      'animation-iteration-count',
      'animation-direction',
      'animation-fill-mode',
      'animation-play-state'
    ))
    OR
    (decl1.prop = 'background' AND decl2.prop IN (
      'background-clip',
      'background-color',
      'background-image',
      'background-origin',
      'background-position',
      'background-repeat',
      'background-size',
      'background-attachment'
    ))
    OR
    (decl1.prop = 'border' AND decl2.prop IN (
      'border-bottom-width',
      'border-bottom-style',
      'border-bottom-color',
      'border-left-width',
      'border-left-style',
      'border-left-color',
      'border-right-width',
      'border-right-style',
      'border-right-color',
      'border-top-width',
      'border-top-style',
      'border-top-color',
      'border-color',
      'border-style',
      'border-width'
    ))
    OR
    (decl1.prop = 'columns' AND decl2.prop IN ('column-width', 'column-count'))
    OR
    (decl1.prop = 'flex' AND decl2.prop IN ('flex-grow', 'flex-shrink', 'flex-basis'))
    OR
    (decl1.prop = 'font' AND decl2.prop IN (
      'font-style',
      'font-variant',
      'font-weight',
      'font-stretch',
      'font-size',
      'line-height',
      'font-family'
    ))
    OR
    (decl1.prop = 'grid' AND decl2.prop IN (
      'grid-template-rows',
      'grid-template-columns',
      'grid-template-areas',
      'grid-auto-rows',
      'grid-auto-columns',
      'grid-auto-flow'
    ))
    OR
    (decl1.prop = 'margin' AND decl2.prop IN ('margin-top', 'margin-right', 'margin-bottom', 'margin-left'))
    OR
    (decl1.prop = 'offset' AND decl2.prop IN (
      'offset-position',
      'offset-path',
      'offset-distance',
      'offset-rotate',
      'offset-anchor'
    ))
    OR
    (decl1.prop = 'outline' AND decl2.prop IN ('outline-style', 'outline-width', 'outline-color'))
    OR
    (decl1.prop = 'overflow' AND decl2.prop IN ('overflow-x', 'overflow-y'))
    OR
    (decl1.prop = 'padding' AND decl2.prop IN ('padding-top', 'padding-right', 'padding-bottom', 'padding-left'))
    OR
    (decl1.prop = 'transition' AND decl2.prop IN (
      'transition-property',
      'transition-duration',
      'transition-timing-function',
      'transition-delay'
    ))
  )
`
