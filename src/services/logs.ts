import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { type Log, type LOG_LEVELS } from "../database/types.js";
import { logs } from "../database/schema.js";
import { Writable } from "stream";
import pino from "pino";
import { db } from "../database/dbConnection.js";
import { gte } from "drizzle-orm";

export const logger = createAppLogger();

/**
 * Construtor de logger integrado com persistência no banco de dados
 * @param db - objeto do database
 * @returns - Retorna o logger construído com as instruções específicas.
 */
function createAppLogger(): pino.Logger {
    const dbStream = new Writable({
        write(chunk, encoding, callback) {
            try {
                const logObject: Log = JSON.parse(chunk.toString());
                const logLevel = logObject.level ? parseLogLevel(logObject.level) : 'UNDEFINED';

                if (logObject.level && logObject.level >= 40) {
                    db.insert(logs).values({
                        message: logObject.msg || 'EMPTY',
                        data: logObject.data || null,
                        sourceModule: logObject.module || null,
                        sourceContext: logObject.context || null,
                        type: logLevel,
                        generatedAt: new Date(logObject.time) ?? Date.now(),
                    }).execute();
                }
            } catch (error) {
                console.error("Erro ao inserir log no banco:", error);
            }
            callback();
        }
    });

    return pino(
        { level: process.env.LOG_LEVELS || 'debug' },
        pino.multistream([
            {
                stream: pino.transport({
                    target: 'pino-pretty',
                    options: { colorize: true }
                })
            },
            { stream: dbStream }
        ])
    );
}

/**
 * Auxiliar de sanitização do banco de dados na tabela de Logs. Elimina logs com mais de 30 dias
 */
export async function sanitizelogsTable() {
    const CACHE = 30 * 24 * 60 * 60 * 1000; // 30 dias
    await db
        .delete(logs)
        .where(gte(logs.generatedAt, new Date(CACHE))); // deletamos todos os registros de logs com mais de 30 dias
}

/**
 * Auxiliar de conversão de um valor numérico para um tipo de log
 * @param level - Valor numérico indicado pelo log no padrão do pino
 * @returns - Item mapeado específico dentro dos logs possíveis
 */
function parseLogLevel(level: number): LOG_LEVELS {
    let logLevel: LOG_LEVELS;
    if (level <= 10)
        logLevel = 'TRACE';
    else if (level <= 20)
        logLevel = 'DEBUG';
    else if (level <= 30)
        logLevel = 'INFO';
    else if (level <= 40)
        logLevel = 'WARN';
    else if (level <= 50)
        logLevel = 'ERROR';
    else
        logLevel = 'FATAL';

    return logLevel;
}