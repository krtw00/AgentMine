import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

export function createDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;
