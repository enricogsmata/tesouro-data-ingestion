import { parse } from 'date-fns';
import { createLogger } from '../../services/logs.js';

const logger = createLogger(import.meta.url);

export const BATCH_SIZE = 1000;

export function parseStringToDate(text: string, format?: string): Date | undefined {
    const log = logger.forMethod('parseStringToDate');
    if (format) {
        try {
            return parse(text, format, new Date());
        } catch (error: any) {
            log.warn({ data: JSON.stringify(error, null, 4) }, `Falha ao converter a data com formato: ${format}.`);
            return undefined;
        }
    } else {
        try {
            return new Date(text);
        } catch (error: any) {
            log.warn({ data: JSON.stringify(error, null, 4) }, `Falha ao converter a data. Formato da string não informado.`);
            return undefined;
        }
    }
}