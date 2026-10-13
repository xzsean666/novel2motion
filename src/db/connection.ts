import { KVDB } from "kvdb-sdk";

export interface DatabaseConfig {
  dbPath?: string;
  tablePrefix?: string;
}

/**
 * Creates and configures a KVDB SQLite instance for novel2motion.
 */
export function createDatabase(config: DatabaseConfig = {}): KVDB {
  const dbPath = config.dbPath ?? ":memory:";
  const tablePrefix = config.tablePrefix ?? "n2m_";

  return new KVDB({
    driver: "sqlite",
    url: dbPath,
    tablePrefix
  });
}
