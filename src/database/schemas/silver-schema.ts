import { relations } from "drizzle-orm";
import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

// =================
// > SCHEMAS
// =================

export const Ente = sqliteTable('entes', {
    codIbge: integer('cod_ibge').primaryKey().notNull().unique(),
    ente: text('ente').notNull(),
    capital: integer('capital'),
    regiao: text('regiao'),
    uf: text('uf', { length: 2 }),
    esfera: text('esfera', { length: 1 }),
    coCnpj: text('co_cnpj'),
    createdAt: integer('created_at'),
})

export const Credor = sqliteTable('credor', {
    idCredor: integer('id_credor').primaryKey({ autoIncrement: true }).notNull().unique(),
    credor: text('credor'),
    tipo: text('tipo'),
    createdAt: integer('created_at'),
})

export const Pvl = sqliteTable('pvl', {
    idPleito: integer('id_pleito').primaryKey({ autoIncrement: true }).notNull().unique(),
    codIbge: integer('cod_ibge').notNull(),
    idCredor: integer('id_credor').notNull(),
    numPvl: text('num_pvl'),
    status: text('status'),
    numProcesso: text('num_processo'),
    dataProtocolo: integer('data_protocolo'),
    tipoOperacao: text('tipo_operacao'),
    finalidade: text('finalidade'),
    moeda: text('moeda'),
    valor: integer('valor'),
    pvlAssocDivida: integer('pvl_assoc_divida'),
    pvlContratadoCredor: integer('pvl_contratado_credor'),
    dataStatus: integer('data_status'),
    createdAt: integer('created_at'),
})

// =================
// > RELACIONAMENTOS
// =================
export const EnteRelations = relations(
    Ente,
    ({ many }) => ({
        pvls: many(Pvl),
    })
)

export const CredorRelations = relations(
    Credor,
    ({many}) => ({
        pvls: many(Pvl),
    })
)

export const PvlRelations = relations(
    Pvl,
    ({ one }) => ({
        ente: (one(Ente, {
            fields: [Pvl.codIbge],
            references: [Ente.codIbge],
        })),
        credor: (one(Credor, {
            fields: [Pvl.idCredor],
            references: [Credor.idCredor],
        }))
    })
)