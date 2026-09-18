import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// - - - - -
// > LOGS
// - - - - -
export const logs = sqliteTable('logs', {
    // ID | INT | PK | AUTOINCREMENTADO | NOT NULL | UNIQUE
    id: integer('id').primaryKey({ autoIncrement: true }).notNull().unique(),

    // level | TEXT | NOT NULL
    // - Categoriza o tipo do log
    type: text('type').notNull(),
    
    // MESSAGE | TEXT
    // - Conteúdo do log
    message: text('message').notNull(),

    // DATA | TEXT
    // - Conteúdo opcional, pode possuir metadados por exemplo
    data: text('data'),

    // SOURCE MODULE | TEXT
    sourceModule: text('sourceModule'),

    // SOURCE CONTEXT | TEXT
    sourceContext: text('sourceContext'),

    // GENERATED AT | TEXT | NOT NULL | UNIQUE
    // Timestamp do momento da geração do log
    generatedAt: text('generatedAt').notNull().unique(),
})