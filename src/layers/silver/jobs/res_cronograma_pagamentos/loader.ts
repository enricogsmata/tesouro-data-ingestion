import { createLogger } from "../../../../services/logs.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function loadRawRCPs(): Promise<any[]> {
    
}