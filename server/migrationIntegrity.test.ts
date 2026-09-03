import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type SchemaState = Map<string, { columns: Set<string>; indexes: Set<string> }>;

function migrationFiles(): string[] {
  const directory = resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort()
    .map((name) => resolve(directory, name));
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/-->\s*statement-breakpoint|;\s*(?:\r?\n|$)/)
    .map((statement) => statement.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);
}

function applyStatement(state: SchemaState, statement: string, fileName: string, errors: string[]) {
  const createTable = statement.match(/^CREATE TABLE(?: IF NOT EXISTS)? `([^`]+)`\s*\(([\s\S]*)\)$/i);
  if (createTable) {
    const [, tableName, body] = createTable;
    if (state.has(tableName)) {
      errors.push(`${fileName}: table ${tableName} already exists`);
      return;
    }
    const table = { columns: new Set<string>(), indexes: new Set<string>() };
    for (const column of body.matchAll(/^\s*`([^`]+)`\s+/gm)) table.columns.add(column[1]);
    for (const constraint of body.matchAll(/(?:CONSTRAINT|UNIQUE KEY|KEY) `([^`]+)`/g)) table.indexes.add(constraint[1]);
    state.set(tableName, table);
    return;
  }

  const createIndex = statement.match(/^CREATE(?: UNIQUE)? INDEX `([^`]+)` ON `([^`]+)`/i);
  if (createIndex) {
    const [, indexName, tableName] = createIndex;
    const table = state.get(tableName);
    if (!table) errors.push(`${fileName}: index ${indexName} targets missing table ${tableName}`);
    else if (table.indexes.has(indexName)) errors.push(`${fileName}: index ${indexName} already exists on ${tableName}`);
    else table.indexes.add(indexName);
    return;
  }

  const addColumn = statement.match(/^ALTER TABLE `([^`]+)` ADD `([^`]+)`/i);
  if (addColumn) {
    const [, tableName, columnName] = addColumn;
    const table = state.get(tableName);
    if (!table) errors.push(`${fileName}: column ${columnName} targets missing table ${tableName}`);
    else if (table.columns.has(columnName)) errors.push(`${fileName}: column ${tableName}.${columnName} already exists`);
    else table.columns.add(columnName);
    return;
  }

  const addConstraint = statement.match(/^ALTER TABLE `([^`]+)` ADD CONSTRAINT `([^`]+)`/i);
  if (addConstraint) {
    const [, tableName, indexName] = addConstraint;
    const table = state.get(tableName);
    if (!table) errors.push(`${fileName}: constraint ${indexName} targets missing table ${tableName}`);
    else if (table.indexes.has(indexName)) errors.push(`${fileName}: constraint ${indexName} already exists on ${tableName}`);
    else table.indexes.add(indexName);
    return;
  }

  const dropIndex = statement.match(/^ALTER TABLE `([^`]+)` DROP INDEX `([^`]+)`/i);
  if (dropIndex) {
    const [, tableName, indexName] = dropIndex;
    const table = state.get(tableName);
    if (!table?.indexes.has(indexName)) errors.push(`${fileName}: cannot drop missing index ${tableName}.${indexName}`);
    else table.indexes.delete(indexName);
  }
}

function verifyMigrationChain(files: string[]): string[] {
  const state: SchemaState = new Map();
  const errors: string[] = [];
  for (const file of files) {
    const fileName = file.split("/").pop()!;
    for (const statement of splitSqlStatements(readFileSync(file, "utf8"))) {
      applyStatement(state, statement, fileName, errors);
    }
  }
  return errors;
}

describe("Drizzle migration chain", () => {
  it("does not add duplicate columns or drop indexes that were never created", () => {
    expect(verifyMigrationChain(migrationFiles())).toEqual([]);
  });

  it("evaluates a drop before a later add in exact statement order", () => {
    const state: SchemaState = new Map([["example", { columns: new Set(), indexes: new Set() }]]);
    const errors: string[] = [];
    for (const statement of splitSqlStatements("ALTER TABLE `example` DROP INDEX `later_index`; ALTER TABLE `example` ADD CONSTRAINT `later_index` UNIQUE (`value`);")) {
      applyStatement(state, statement, "ordered.sql", errors);
    }
    expect(errors).toEqual(["ordered.sql: cannot drop missing index example.later_index"]);
  });
});
