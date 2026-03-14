const fs = require('fs')
const path = require('path')

const root = process.cwd()
const actualPath = path.join(root, 'Docs', 'db', 'neon-live-schema-snapshot.json')
const expectedPath = path.join(root, 'Docs', 'db', 'expected-schema.json')
const reportPath = path.join(root, 'Docs', 'db', 'schema-diff-report.md')

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function normalizeType(raw) {
  if (!raw) return ''
  const t = String(raw).toLowerCase().trim()
  const map = {
    'timestamp with time zone': 'timestamptz',
    'timestamp without time zone': 'timestamp',
    'character varying': 'varchar',
    'double precision': 'float8',
    'integer': 'int4',
    'bigint': 'int8',
    'boolean': 'bool',
    'json': 'json',
    'jsonb': 'jsonb',
    'uuid': 'uuid',
    'date': 'date',
    'text': 'text'
  }
  return map[t] || t
}

function actualType(column) {
  return normalizeType(column.udt_name || column.data_type)
}

function expectedType(columnDef) {
  return normalizeType(columnDef.type)
}

function buildActualModel(snapshot) {
  const model = {}

  for (const table of snapshot.tables || []) {
    const schema = table.table_schema
    const tableName = table.table_name
    model[schema] ||= { tables: {} }
    model[schema].tables[tableName] ||= {
      columns: {},
      constraints: [],
      indexes: []
    }
  }

  for (const col of snapshot.columns || []) {
    const t = model[col.table_schema]?.tables[col.table_name]
    if (!t) continue
    t.columns[col.column_name] = {
      type: actualType(col),
      nullable: col.is_nullable === 'YES',
      default: col.column_default || null
    }
  }

  for (const c of snapshot.constraints || []) {
    const t = model[c.table_schema]?.tables[c.table_name]
    if (!t) continue
    t.constraints.push({
      name: c.constraint_name,
      type: c.constraint_type,
      column: c.column_name || null,
      foreign_table_schema: c.foreign_table_schema || null,
      foreign_table_name: c.foreign_table_name || null,
      foreign_column_name: c.foreign_column_name || null
    })
  }

  for (const idx of snapshot.indexes || []) {
    const t = model[idx.table_schema]?.tables[idx.table_name]
    if (!t) continue
    t.indexes.push({ name: idx.indexname, def: idx.indexdef })
  }

  return model
}

function hasPk(actualTable, columnName) {
  return actualTable.constraints.some(
    (c) => c.type === 'PRIMARY KEY' && c.column === columnName,
  )
}

function hasUnique(actualTable, columnName) {
  return actualTable.constraints.some(
    (c) => c.type === 'UNIQUE' && c.column === columnName,
  )
}

function hasFk(actualTable, columnName, expectedRef) {
  const [foreignTable, foreignColumn] = expectedRef.split('.')
  return actualTable.constraints.some(
    (c) =>
      c.type === 'FOREIGN KEY' &&
      c.column === columnName &&
      c.foreign_table_name === foreignTable &&
      c.foreign_column_name === foreignColumn,
  )
}

function compare(expected, actual) {
  const report = {
    generatedAt: new Date().toISOString(),
    missingTables: [],
    extraTables: [],
    missingColumns: [],
    extraColumns: [],
    mismatchedColumns: [],
    missingPrimaryKeys: [],
    missingUniques: [],
    missingForeignKeys: []
  }

  const expectedSchemas = expected.schemas || {}
  const actualSchemas = actual || {}

  for (const [schemaName, schemaDef] of Object.entries(expectedSchemas)) {
    const expectedTables = schemaDef.tables || {}
    const actualTables = actualSchemas[schemaName]?.tables || {}

    for (const [tableName, tableDef] of Object.entries(expectedTables)) {
      const actualTable = actualTables[tableName]
      if (!actualTable) {
        if (tableDef.required !== false) {
          report.missingTables.push(`${schemaName}.${tableName}`)
        }
        continue
      }

      const expectedColumns = tableDef.columns || {}
      const actualColumns = actualTable.columns || {}

      for (const [columnName, columnDef] of Object.entries(expectedColumns)) {
        const actualColumn = actualColumns[columnName]
        if (!actualColumn) {
          report.missingColumns.push(`${schemaName}.${tableName}.${columnName}`)
          continue
        }

        const expType = expectedType(columnDef)
        const actType = normalizeType(actualColumn.type)
        const expNullable = !!columnDef.nullable
        const actNullable = !!actualColumn.nullable

        if (expType && actType && expType !== actType) {
          report.mismatchedColumns.push({
            field: `${schemaName}.${tableName}.${columnName}`,
            kind: 'type',
            expected: expType,
            actual: actType
          })
        }

        if (expNullable !== actNullable) {
          report.mismatchedColumns.push({
            field: `${schemaName}.${tableName}.${columnName}`,
            kind: 'nullable',
            expected: expNullable ? 'nullable' : 'not null',
            actual: actNullable ? 'nullable' : 'not null'
          })
        }

        if (columnDef.pk && !hasPk(actualTable, columnName)) {
          report.missingPrimaryKeys.push(`${schemaName}.${tableName}.${columnName}`)
        }

        if (columnDef.unique && !hasUnique(actualTable, columnName)) {
          report.missingUniques.push(`${schemaName}.${tableName}.${columnName}`)
        }

        if (columnDef.fk && !hasFk(actualTable, columnName, columnDef.fk)) {
          report.missingForeignKeys.push({
            field: `${schemaName}.${tableName}.${columnName}`,
            expected: columnDef.fk
          })
        }
      }

      for (const actualColumnName of Object.keys(actualColumns)) {
        if (!expectedColumns[actualColumnName]) {
          report.extraColumns.push(`${schemaName}.${tableName}.${actualColumnName}`)
        }
      }
    }

    for (const actualTableName of Object.keys(actualTables)) {
      if (!expectedTables[actualTableName]) {
        report.extraTables.push(`${schemaName}.${actualTableName}`)
      }
    }
  }

  return report
}

function toMarkdown(report) {
  const lines = []
  lines.push('# Schema Diff Report')
  lines.push('')
  lines.push(`Generated at: ${report.generatedAt}`)
  lines.push('')

  const sections = [
    ['Missing Tables', report.missingTables],
    ['Extra Tables', report.extraTables],
    ['Missing Columns', report.missingColumns],
    ['Extra Columns', report.extraColumns],
    ['Missing Primary Keys', report.missingPrimaryKeys],
    ['Missing Unique Constraints', report.missingUniques]
  ]

  for (const [title, items] of sections) {
    lines.push(`## ${title}`)
    if (!items.length) {
      lines.push('- none')
    } else {
      for (const item of items) lines.push(`- ${item}`)
    }
    lines.push('')
  }

  lines.push('## Missing Foreign Keys')
  if (!report.missingForeignKeys.length) {
    lines.push('- none')
  } else {
    for (const item of report.missingForeignKeys) {
      lines.push(`- ${item.field} -> ${item.expected}`)
    }
  }
  lines.push('')

  lines.push('## Mismatched Columns')
  if (!report.mismatchedColumns.length) {
    lines.push('- none')
  } else {
    for (const item of report.mismatchedColumns) {
      lines.push(`- ${item.field} [${item.kind}] expected=${item.expected}, actual=${item.actual}`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

function main() {
  const expected = readJson(expectedPath)
  const actualSnapshot = readJson(actualPath)
  const actual = buildActualModel(actualSnapshot)
  const report = compare(expected, actual)
  fs.writeFileSync(reportPath, toMarkdown(report), 'utf8')
  console.log(`Wrote: ${reportPath}`)
}

main()
