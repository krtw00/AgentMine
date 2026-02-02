import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

export function createDb(dbPath: string) {
  const client = createClient({
    url: `file:${dbPath}`,
  });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
