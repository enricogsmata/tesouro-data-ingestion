import { LOGS_DIR_LIST } from "./types.js";
import * as fs from 'fs';

export function buildDefaultLogsDir() {
    try {
        for (const LOGS_DIR of LOGS_DIR_LIST) {
            if (!fs.existsSync(LOGS_DIR)) {
                fs.mkdirSync(LOGS_DIR, {recursive: true});
            }
        }
    } catch (error) {
        console.error(`[ERRO: buildDefaultLogsDir] ${error}`);
    }
}

export function createWriter(filePath: string): fs.WriteStream {
    const writer = fs.createWriteStream(filePath, {flags: 'w'});

    writer.on('finish', () => {
        if (writer.bytesWritten === 0) {
            fs.unlink(filePath, (error) => {
                if (error) {
                    console.log(`[ERRO: createWriter] Não foi possível impedir a criação de um arquivo de texto vazio!`);
                }
            })
        }
    });

    return writer;
}