import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// > Inicializa o database SQLite
const sqlite = new Database('tt_database.db', { timeout: 5000 });

// > Exporta a conexão do database para manipulação (INSERT | SELECT ...)
export const db = drizzle(sqlite);