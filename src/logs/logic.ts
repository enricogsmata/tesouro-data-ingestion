import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { type Log, type LOG_LEVELS } from "./types.js";
import * as fs from 'fs';
import { logs } from "../database/schema.js";
import { Writable } from "stream";
import pino from "pino";

export function createAppLogger(db: BetterSQLite3Database<Record<string, never>>): pino.Logger {
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
                        generatedAt: String(logObject.time ?? Date.now()),
                    }).run();
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