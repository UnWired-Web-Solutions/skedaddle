import { readFileSync, readdirSync } from "node:fs";
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

function verifyMigrationChain(files: string[]): string[] {
  const state: SchemaState = new Map();
  const errors: string[] = [];
  for (const file of files) {
    const sql = readFileSync(file, "utf8");
    const fileName = file.split("/").pop()!;
    for (const match of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? `([^`]+)`\s*\(([\s\S]*?)\);/g)) {
      const [, tableName, body] = match;
      const table = state.get(tableName) ?? { columns: new Set<string>(), indexes: new Set<string>() };
      for (const column of body.matchAll(/^\s*`([^`]+)`\s+/gm)) table.columns.add(column[1]);
      for (const constraint of body.matchAll(/CONSTRAINT `([^`]+)`/g)) table.indexes.add(constraint[1]);
      state.set(tableName, table);
    }
    for (const match of sql.matchAll(/CREATE(?: UNIQUE)? INDEX `([^`]+)` ON `([^`]+)`/g)) {
      const [, indexName, tableName] = match;
      const table = state.get(tableName);
      if (!table) errors.push(`${fileName}: index ${indexName} targets missing table ${tableName}`);
      else if (table.indexes.has(indexName)) errors.push(`${fileName}: index ${indexName} already exists on ${tableName}`);
      else table.indexes.add(indexName);
    }
    for (const match of sql.matchAll(/ALTER TABLE `([^`]+)` ADD `([^`]+)`/g)) {
      const [, tableName, columnName] = match;
      const table = state.get(tableName);
      if (!table) errors.push(`${fileName}: column ${columnName} targets missing table ${tableName}`);
      else if (table.columns.has(columnName)) errors.push(`${fileName}: column ${tableName}.${columnName} already exists`);
      else table.columns.add(columnName);
    }
    for (const match of sql.matchAll(/ALTER TABLE `([^`]+)` ADD CONSTRAINT `([^`]+)`/g)) {
      const [, tableName, indexName] = match;
      const table = state.get(tableName);
      if (!table) errors.push(`${fileName}: constraint ${indexName} targets missing table ${tableName}`);
      else if (table.indexes.has(indexName)) errors.push(`${fileName}: constraint ${indexName} already exists on ${tableName}`);
      else table.indexes.add(indexName);
    }
    for (const match of sql.matchAll(/ALTER TABLE `([^`]+)` DROP INDEX `([^`]+)`/g)) {
      const [, tableName, indexName] = match;
      const table = state.get(tableName);
      if (!table?.indexes.has(indexName)) errors.push(`${fileName}: cannot drop missing index ${tableName}.${indexName}`);
      else table.indexes.delete(indexName);
    }
  }
  return errors;
}

describe("Drizzle migration chain", () => {
  it("does not add duplicate columns or drop indexes that were never created", () => {
    expect(verifyMigrationChain(migrationFiles())).toEqual([]);
  });
});
