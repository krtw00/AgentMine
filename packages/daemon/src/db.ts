import { createDb } from "@agentmine/db";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, "../../db/data/agentmine.db");

export const db = createDb(dbPath);
