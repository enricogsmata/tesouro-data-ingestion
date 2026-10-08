import { type Log, type LOG_LEVELS } from "../database/types.js";
import { logs } from "../database/bronze_schema.js";
import { Writable } from "stream";
import pino from "pino";
import { bronzeDB } from "../database/dbConnection.js";
import { gte } from "drizzle-orm";
import path from "path";
import { fileURLToPath } from "url";

// 1. Instância Singleton compartilhada por toda a aplicação
const prettyTransport = pino.transport({
    target: 'pino-pretty',
    options: { colorize: true }
});

const bronzeDBStream = new Writable({
    async write(chunk, encoding, callback) {
        try {
            const logObject: Log = JSON.parse(chunk.toString());
            const logLevel = logObject.level ? parseLogLevel(logObject.level) : 'UNDEFINED';

            if (logObject.level && logObject.level >= 40) {
                await bronzeDB.insert(logs).values({
                    message: logObject.msg || 'EMPTY',
                    data: logObject.data || null,
                    sourceModule: logObject.module || null,
                    sourceContext: logObject.context || null,
                    type: logLevel,
                    generatedAt: logObject.time ? new Date(logObject.time) : new Date(),
                }).execute();
            }
            callback();
        } catch (error) {
            console.error("Erro ao inserir log no banco:", error);
            callback(error as Error);
        }
    }
});

// O logger principal é criado apenas UMA VEZ quando o módulo é importado
const baseLogger = pino(
    { level: process.env.LOG_LEVELS || 'debug' },
    pino.multistream([
        { stream: prettyTransport },
        { stream: bronzeDBStream }
    ])
);

// 2. Função de fábrica levíssima que apenas injeta o nome do arquivo via .child()
export function createLogger(importMetaUrl: string) {
    const moduleName = path.basename(fileURLToPath(importMetaUrl));
    const logger = baseLogger.child({ module: moduleName });

    return Object.assign(logger, {
        /**
         * Retorna uma nova instância do logger já configurada com o método/contexto.
         */
        forMethod(methodName: string) {
            return logger.child({ context: methodName });
        }
    });
}

/**
 * Auxiliar de sanitização do banco de dados na tabela de Logs.
 */
export async function sanitizelogsTable() {
    const CACHE = 30 * 24 * 60 * 60 * 1000; // 30 dias
    await bronzeDB
        .delete(logs)
        .where(gte(logs.generatedAt, new Date(Date.now() - CACHE))); // ⚠️ Corrigido cálculo de data
}

function parseLogLevel(level: number): LOG_LEVELS {
    if (level <= 10) return 'TRACE';
    if (level <= 20) return 'DEBUG';
    if (level <= 30) return 'INFO';
    if (level <= 40) return 'WARN';
    if (level <= 50) return 'ERROR';
    return 'FATAL';
}