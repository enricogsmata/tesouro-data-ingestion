import { createLogger, sanitizelogsTable } from './services/logs.js';
import { bronzeOrchestrator } from "./pipelines/bronze/main.js";
import { silverOrchestrator } from "./pipelines/silver/main.js";

const logger = createLogger(import.meta.url);
logger.flush();

/**
 * Entry point do algoritmo do scrapper
 */
async function run() {
    const log = logger.forMethod("run");
    log.info("[STATUS] Iniciando script...");

    // ========================================
    // 0. SANITIZAÇÃO DE LOGS NO BANCO DE DADOS
    // ========================================
    await sanitizelogsTable();

    // ===============
    // 1. BRONZE LAYER
    // ===============
    await bronzeOrchestrator();

    // ===============
    // 2. SILVER LAYER
    // ===============
    await silverOrchestrator();

    log.info("[STATUS] Script concluído!");
    log.flush();
}

run();