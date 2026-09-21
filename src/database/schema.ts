import { relations } from "drizzle-orm";
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

    // GENERATED AT | TEXT | NOT NULL
    // Timestamp do momento da geração do log
    generatedAt: text('generatedAt').notNull(),
})

export const DataSources = sqliteTable('data_sources', {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull().unique(),
    baseUrl: text('base_url').notNull(),
    title: text('title'),
    rawMetadata: text('raw_metadata'),
})

export const Endpoints = sqliteTable('endpoint', {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull().unique(),
    dataSourceId: integer('data_source_id').notNull(),
    path: text('path'),
    method: text('method'),
    summary: text('summary'),
    description: text('description'),
    tags: text('tags'),
})

// - - - - - - - - - - - -
// > RAW_ENDPONT_RESPONSE
// - - - - - - - - - - - -
export const RawEndpointResponse = sqliteTable('raw_endpoint_response', {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull().unique(),
    endpointPath: text('endpoint_path').notNull(),
    raw_items: text('raw_items'),
    hasMore: integer('hasMore'),
    limit: integer('limit'),
    offset: integer('offset'),
    count: integer('count'),
    generatedAt: text('generatedAt').notNull(),
})

// - - - - - - - - - - - -
// > API_LINKS
// - - - - - - - - - - - -
export const ApiLinks = sqliteTable('api_links', {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull().unique(),
    endpointId: integer('endpoint_id').references(() => RawEndpointResponse.id).notNull(),
    href: text('href'),
    rel: text('rel'),
    generatedAt: text('generatedAt').notNull(),
})

// - - - - - - -
// * RELATIONS
// - - - - - - -

// = RAW_ENDPOINT_RESPONSE + API_LINKS =
export const rawEndpointRelations = relations(
    RawEndpointResponse,
    ({ many }) => ({
        links: many(ApiLinks),
    })
);

export const apiLinksRelations = relations(
    ApiLinks,
    ({ one }) => ({
        endpoint: one(RawEndpointResponse, {
            fields: [ApiLinks.endpointId],
            references: [RawEndpointResponse.id],
        })
    })
);

// = DATA_SOURCES + ENDPOINTS
export const dataSourcesRelations = relations(
    DataSources,
    ({ many }) => ({
        endpoints: many(Endpoints),
    })
);

export const endpointsRelations = relations(
    Endpoints,
    ({ one }) => ({
        dataSource: one(DataSources, {
            fields: [Endpoints.dataSourceId],
            references: [DataSources.id],
        })
    })
);