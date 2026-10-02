import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createLogger, sanitizelogsTable } from './services/logs.js';
import { bronzeOrchestrator } from "./pipelines/bronze/main.js";
import { silverOrchestrator } from "./pipelines/silver/main.js";

const logger = createLogger(import.meta.url);
logger.flush();

export type PipelineLayer = 'bronze' | 'silver';

/**
 * Exibe as instruções de uso do CLI no terminal.
 */
function printHelp(): void {
    console.log(`
======================================================
   TESOURO DATA INGESTION - SELETOR DE PIPELINE
======================================================
Uso:
  npm run cli [opção]
  npx tsx src/run.cli.ts [camada | flag]

Opções de camada:
  bronze, --from bronze, --layer=bronze   Inicia na camada Bronze (Bronze -> Silver)
  silver, --from silver, --layer=silver   Inicia na camada Silver (Apenas Silver)
  -h, --help                              Exibe este manual de ajuda

Exemplos:
  npm run cli
  npx tsx src/run.cli.ts bronze
  npx tsx src/run.cli.ts --from silver
`);
}

/**
 * Tenta obter a camada informada através de argumentos de linha de comando.
 * Suporta formatos como:
 * - `tsx src/run.cli.ts bronze`
 * - `tsx src/run.cli.ts silver`
 * - `tsx src/run.cli.ts --from silver`
 * - `tsx src/run.cli.ts --layer=bronze`
 */
function parseLayerFromArgs(): PipelineLayer | null {
    const args = process.argv.slice(2);

    if (args.includes('-h') || args.includes('--help')) {
        printHelp();
        process.exit(0);
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]?.toLowerCase();
        if (!arg) continue;

        if (arg === 'bronze' || arg === 'silver') {
            return arg;
        }

        if (arg.startsWith('--layer=') || arg.startsWith('--from=')) {
            const val = arg.split('=')[1]?.trim();
            if (val === 'bronze' || val === 'silver') {
                return val;
            }
        }

        if (arg === '--layer' || arg === '-l' || arg === '--from' || arg === '-f') {
            const nextArg = args[i + 1]?.toLowerCase().trim();
            if (nextArg === 'bronze' || nextArg === 'silver') {
                return nextArg;
            }
        }
    }

    return null;
}

/**
 * Solicita interativamente ao usuário a camada inicial caso não tenha sido passada por argumento.
 */
async function promptStartingLayer(): Promise<PipelineLayer> {
    const rl = readline.createInterface({ input, output });
    let isResolved = false;

    rl.on('close', () => {
        if (!isResolved) {
            console.log('\n[INFO] Entrada finalizada pelo terminal.');
            process.exit(0);
        }
    });

    try {
        console.log('\n======================================================');
        console.log('   TESOURO DATA INGESTION - SELETOR DE PIPELINE');
        console.log('======================================================');
        console.log('A partir de qual camada deseja iniciar o processo?');
        console.log('  [1] Bronze (executa Bronze -> Silver)');
        console.log('  [2] Silver (executa apenas Silver)');
        console.log('  [0] Sair');
        console.log('------------------------------------------------------');

        while (true) {
            const rawAnswer = await rl.question('Escolha uma opção (1/2 ou bronze/silver): ');
            const answer = rawAnswer.trim().toLowerCase();

            if (answer === '1' || answer === 'bronze' || answer === 'b') {
                isResolved = true;
                return 'bronze';
            }
            if (answer === '2' || answer === 'silver' || answer === 's') {
                isResolved = true;
                return 'silver';
            }
            if (answer === '0' || answer === 'sair' || answer === 'exit' || answer === 'q') {
                isResolved = true;
                console.log('\n[INFO] Operação cancelada pelo usuário.');
                process.exit(0);
            }

            console.log(`\n[AVISO] Opção inválida: "${answer}". Digite 1 (bronze), 2 (silver) ou 0 (sair).\n`);
        }
    } finally {
        isResolved = true;
        rl.close();
    }
}

/**
 * Entry point da CLI para orquestração dos pipelines
 */
async function run_cli() {
    const log = logger.forMethod("run_cli");

    const layerFromArgs = parseLayerFromArgs();
    const startingLayer = layerFromArgs ?? (await promptStartingLayer());

    log.info(`[STATUS] Camada inicial selecionada: ${startingLayer.toUpperCase()}`);

    // ========================================
    // 0. SANITIZAÇÃO DE LOGS NO BANCO DE DADOS
    // ========================================
    log.info("[ETAPA 0] Sanitizando tabela de logs...");
    await sanitizelogsTable();

    if (startingLayer === 'bronze') {
        // ===============
        // 1. BRONZE LAYER
        // ===============
        log.info("[ETAPA 1] Executando Bronze Layer...");
        await bronzeOrchestrator();

        // ===============
        // 2. SILVER LAYER
        // ===============
        log.info("[ETAPA 2] Executando Silver Layer...");
        await silverOrchestrator();
    } else if (startingLayer === 'silver') {
        // ===============
        // 2. SILVER LAYER
        // ===============
        log.info("[ETAPA 1] Iniciando direto na Silver Layer (Bronze ignorada)...");
        await silverOrchestrator();
    }

    log.info("[STATUS] Script concluído com sucesso!");
    log.flush();
}

run_cli().catch((error) => {
    const log = logger.forMethod("run_cli");
    log.fatal({ error }, "[ERRO FATAL] Falha durante a execução do processo via CLI.");
    log.flush();
    process.exit(1);
});