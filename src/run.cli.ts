import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { asc, eq } from 'drizzle-orm';
import { db } from './database/dbConnection.js';
import { endpoints } from './database/schema.js';
import { createLogger, sanitizelogsTable } from './services/logs.js';
import { bronzeOrchestrator } from "./pipelines/bronze/main.js";
import { silverOrchestrator } from "./pipelines/silver/main.js";

const logger = createLogger(import.meta.url);
logger.flush();

export type PipelineLayer = 'bronze' | 'silver';

export interface PipelineExecutionOptions {
    layer: PipelineLayer;
    skipDiscovery?: boolean | undefined;
    startEndpointId?: number | undefined;
    startOffset?: number | undefined;
    maxOffset?: number | undefined;
    singleEndpoint?: boolean | undefined;
}

/**
 * Exibe as instruções de uso do CLI no terminal.
 */
function printHelp(): void {
    console.log(`
======================================================
   TESOURO DATA INGESTION - SELETOR DE PIPELINE
======================================================
Uso:
  npm run cli
  npx tsx src/run.cli.ts [camada | flags]

Opções de camada:
  bronze, --from bronze, --layer=bronze     Inicia na camada Bronze Completa (Discovery -> Fetch -> Silver)
  bronze-fetch, --skip-discovery            Inicia na camada Bronze pulando Discovery (Fetch -> Silver)
  silver, --from silver, --layer=silver     Inicia na camada Silver (Apenas Silver)
  -h, --help                                Exibe este manual de ajuda

Flags adicionais:
  --endpoint=<id>, -e <id>                  ID do endpoint inicial para o Fetch (ex: --endpoint=4)
                                            Pode aceitar o offset inicial logo em seguida (ex: -e 17 100000)
  --skip-discovery                          Pula as etapas de discovery e mapeamento da Bronze
  --max-offset=<num>                        Define o offset máximo no fetch da camada bronze (ex: --max-offset=100000)
  --start-offset=<num>                      Define explicitamente o offset inicial do primeiro endpoint
  --single-endpoint, -s                     Realiza o fetch apenas no endpoint específico informado

Exemplos:
  npm run cli                               (Modo interativo com menus)
  npx tsx src/run.cli.ts bronze-fetch -e 17 100000 --max-offset=200000
  npx tsx src/run.cli.ts bronze-fetch -e 4 --single-endpoint
`);
}

/**
 * Tenta obter as opções de execução informadas através de argumentos de linha de comando.
 * Suporta formatos como:
 * - `tsx src/run.cli.ts bronze`
 * - `tsx src/run.cli.ts bronze-fetch`
 * - `tsx src/run.cli.ts bronze-fetch --endpoint=4`
 * - `tsx src/run.cli.ts silver`
 * - `tsx src/run.cli.ts --from silver`
 * - `tsx src/run.cli.ts --layer=bronze --skip-discovery -e 4`
 */
function parseOptionsFromArgs(): PipelineExecutionOptions | null {
    const args = process.argv.slice(2);

    if (args.includes('-h') || args.includes('--help')) {
        printHelp();
        process.exit(0);
    }

    let layer: PipelineLayer | null = null;
    let skipDiscovery = false;
    let startEndpointId: number | undefined = undefined;
    let startOffset: number | undefined = undefined;
    let maxOffset: number | undefined = undefined;
    let singleEndpoint: boolean | undefined = undefined;

    // Identifica flags de endpoint e skip-discovery
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]?.toLowerCase();
        if (!arg) continue;

        if (arg.startsWith('--endpoint=') || arg.startsWith('--start-endpoint=') || arg.startsWith('-e=')) {
            const val = parseInt(arg.split('=')[1]?.trim() || '', 10);
            if (!Number.isNaN(val) && val > 0) {
                startEndpointId = val;
            }
        } else if (arg === '--endpoint' || arg === '--start-endpoint' || arg === '-e') {
            const nextArg = parseInt(args[i + 1]?.trim() || '', 10);
            if (!Number.isNaN(nextArg) && nextArg > 0) {
                startEndpointId = nextArg;

                const potentialOffset = parseInt(args[i + 2]?.trim() || '', 10);
                if (!Number.isNaN(potentialOffset) && potentialOffset >= 0 && !(args[i + 2] || '').startsWith('-')) {
                    startOffset = potentialOffset;
                }
            }
        }

        if (arg === '--skip-discovery' || arg === '--skipdiscovery' || arg === '--no-discovery') {
            skipDiscovery = true;
        }

        if (arg === '--single-endpoint' || arg === '-s') {
            singleEndpoint = true;
        }

        if (arg.startsWith('--max-offset=')) {
            const val = parseInt(arg.split('=')[1]?.trim() || '', 10);
            if (!Number.isNaN(val) && val >= 0) maxOffset = val;
        } else if (arg === '--max-offset') {
            const nextArg = parseInt(args[i + 1]?.trim() || '', 10);
            if (!Number.isNaN(nextArg) && nextArg >= 0) maxOffset = nextArg;
        }

        if (arg.startsWith('--start-offset=')) {
            const val = parseInt(arg.split('=')[1]?.trim() || '', 10);
            if (!Number.isNaN(val) && val >= 0) startOffset = val;
        } else if (arg === '--start-offset') {
            const nextArg = parseInt(args[i + 1]?.trim() || '', 10);
            if (!Number.isNaN(nextArg) && nextArg >= 0) startOffset = nextArg;
        }
    }

    // Identifica camada
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]?.toLowerCase();
        if (!arg) continue;

        if (arg === 'bronze-fetch') {
            layer = 'bronze';
            skipDiscovery = true;
            break;
        }

        if (arg === 'bronze' || arg === 'silver') {
            layer = arg;
            break;
        }

        if (arg.startsWith('--layer=') || arg.startsWith('--from=')) {
            const val = arg.split('=')[1]?.trim();
            if (val === 'bronze' || val === 'silver') {
                layer = val;
                break;
            }
            if (val === 'bronze-fetch') {
                layer = 'bronze';
                skipDiscovery = true;
                break;
            }
        }

        if (arg === '--layer' || arg === '-l' || arg === '--from' || arg === '-f') {
            const nextArg = args[i + 1]?.toLowerCase().trim();
            if (nextArg === 'bronze' || nextArg === 'silver') {
                layer = nextArg;
                break;
            }
            if (nextArg === 'bronze-fetch') {
                layer = 'bronze';
                skipDiscovery = true;
                break;
            }
        }
    }

    // Se passou --start-endpoint ou --skip-discovery sem explicitar a camada, inferimos bronze
    if (!layer && (skipDiscovery || startEndpointId !== undefined)) {
        layer = 'bronze';
        skipDiscovery = true;
    }

    if (layer) {
        return {
            layer,
            skipDiscovery,
            startEndpointId,
            startOffset,
            maxOffset,
            singleEndpoint
        };
    }

    return null;
}

/**
 * Submenu interativo para seleção do endpoint inicial quando o usuário escolhe pular o discovery.
 * Retorna as opções selecionadas ou null se o usuário cancelar / solicitar voltar ao menu anterior.
 */
async function promptBronzeFetchOptions(rl: readline.Interface): Promise<PipelineExecutionOptions | null> {
    console.log('\n[INFO] Consultando endpoints cadastrados no banco de dados...');
    let endpointsList: { id: number; path: string }[] = [];

    try {
        endpointsList = await db
            .select({ id: endpoints.id, path: endpoints.path })
            .from(endpoints)
            .orderBy(asc(endpoints.id));
    } catch (error) {
        console.log(`\n[ERRO] Falha ao consultar endpoints no banco de dados: ${error}`);
        return null;
    }

    if (endpointsList.length === 0) {
        console.log('\n[AVISO] Nenhum endpoint encontrado no banco de dados!');
        console.log('Execute primeiro a opção [1] Bronze Completa para realizar o Discovery e mapear os endpoints.\n');
        return null;
    }

    while (true) {
        console.log('\n======================================================');
        console.log('   BRONZE - INICIAR POR FETCH DOS ENDPOINTS');
        console.log('======================================================');
        console.log('Endpoints cadastrados no banco de dados:');
        for (const ep of endpointsList) {
            console.log(`  [ID: ${String(ep.id).padStart(2, ' ')}] ${ep.path}`);
        }
        console.log('------------------------------------------------------');
        console.log('Como deseja iniciar o Fetch dos dados brutos?');
        console.log('  - Pressione [Enter] ou digite [1] para iniciar do primeiro endpoint');
        console.log('  - Digite o ID do endpoint específico (ex: 4)');
        console.log('  - Digite [0] ou "v" para voltar ao menu anterior');
        console.log('------------------------------------------------------');

        const rawInput = await rl.question('Selecione o endpoint inicial [padrão: 1]: ');
        const trimmed = rawInput.trim();

        if (trimmed === '0' || trimmed.toLowerCase() === 'v' || trimmed.toLowerCase() === 'voltar' || trimmed.toLowerCase() === 'cancelar') {
            console.log('\n[INFO] Retornando ao menu anterior...\n');
            return null;
        }

        let targetId = 1;
        if (trimmed !== '') {
            const parsedId = Number(trimmed);
            if (Number.isNaN(parsedId) || !Number.isInteger(parsedId) || parsedId < 1) {
                console.log(`\n[AVISO] Entrada inválida: "${trimmed}". Digite um número de ID válido ou 0 para voltar.\n`);
                continue;
            }
            targetId = parsedId;
        }

        const selectedEndpoint = endpointsList.find(e => e.id === targetId);
        if (!selectedEndpoint) {
            console.log(`\n[AVISO] Endpoint com ID ${targetId} não foi encontrado no banco de dados. Escolha um ID entre ${endpointsList[0]!.id} e ${endpointsList[endpointsList.length - 1]!.id}.\n`);
            continue;
        }

        const remainingCount = endpointsList.filter(e => e.id >= targetId).length;

        // ====================================================
        // CONFIRMAÇÃO DO ENDPOINT SELECIONADO
        // O CLI deve mostrar o path do endpoint selecionado
        // ====================================================
        console.log('\n------------------------------------------------------');
        console.log('   CONFIRMAÇÃO DO ENDPOINT SELECIONADO');
        console.log('------------------------------------------------------');
        console.log(`  ID selecionado:     ${selectedEndpoint.id}`);
        console.log(`  Path do endpoint:   ${selectedEndpoint.path}`);
        console.log(`  Total a processar:  ${remainingCount} endpoint(s) (do ID ${selectedEndpoint.id} até o ID ${endpointsList[endpointsList.length - 1]!.id})`);
        console.log('------------------------------------------------------');

        while (true) {
            const confirmRaw = await rl.question('Confirma o início da extração a partir deste endpoint? (S/N): ');
            const confirm = confirmRaw.trim().toLowerCase();

            if (confirm === 's' || confirm === 'sim' || confirm === 'y' || confirm === 'yes') {
                console.log(`\n[OK] Confirmado! Iniciando Fetch a partir do endpoint ID ${selectedEndpoint.id} ("${selectedEndpoint.path}")...\n`);
                return {
                    layer: 'bronze',
                    skipDiscovery: true,
                    startEndpointId: selectedEndpoint.id
                };
            }

            if (confirm === 'n' || confirm === 'nao' || confirm === 'não' || confirm === 'cancelar' || confirm === 'c' || confirm === '0') {
                console.log('\n[INFO] Operação cancelada. Retornando ao menu anterior...\n');
                return null;
            }

            console.log(`[AVISO] Opção inválida: "${confirm}". Digite S para confirmar ou N para cancelar.`);
        }
    }
}

/**
 * Solicita interativamente ao usuário a camada e modo inicial caso não tenham sido passados por argumento.
 */
async function promptExecutionOptions(): Promise<PipelineExecutionOptions> {
    const rl = readline.createInterface({ input, output });
    let isResolved = false;

    rl.on('close', () => {
        if (!isResolved) {
            console.log('\n[INFO] Entrada finalizada pelo terminal.');
            process.exit(0);
        }
    });

    try {
        while (true) {
            console.log('\n======================================================');
            console.log('   TESOURO DATA INGESTION - SELETOR DE PIPELINE');
            console.log('======================================================');
            console.log('A partir de qual camada/modo deseja iniciar o processo?');
            console.log('  [1] Bronze Completa (Discovery -> Fetch dos Endpoints -> Silver)');
            console.log('  [2] Bronze - Pular Discovery (Fetch a partir de Endpoint -> Silver)');
            console.log('  [3] Silver (executa apenas Silver)');
            console.log('  [0] Sair');
            console.log('------------------------------------------------------');

            const rawAnswer = await rl.question('Escolha uma opção (1/2/3 ou bronze/fetch/silver): ');
            const answer = rawAnswer.trim().toLowerCase();

            if (answer === '1' || answer === 'bronze' || answer === 'b') {
                isResolved = true;
                return { layer: 'bronze', skipDiscovery: false };
            }

            if (answer === '2' || answer === 'fetch' || answer === 'bronze-fetch' || answer === 'bf') {
                const bronzeFetchOptions = await promptBronzeFetchOptions(rl);
                if (bronzeFetchOptions) {
                    isResolved = true;
                    return bronzeFetchOptions;
                }
                // Se retornou null, o usuário cancelou a confirmação ou pediu para voltar ao menu anterior
                continue;
            }

            if (answer === '3' || answer === 'silver' || answer === 's') {
                isResolved = true;
                return { layer: 'silver' };
            }

            if (answer === '0' || answer === 'sair' || answer === 'exit' || answer === 'q') {
                isResolved = true;
                console.log('\n[INFO] Operação cancelada pelo usuário.');
                process.exit(0);
            }

            console.log(`\n[AVISO] Opção inválida: "${answer}". Digite 1 (Bronze Completa), 2 (Bronze Pular Discovery), 3 (Silver) ou 0 (Sair).\n`);
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

    const optionsFromArgs = parseOptionsFromArgs();
    const executionOptions = optionsFromArgs ?? (await promptExecutionOptions());

    // Se informado startEndpointId via flags, valida no banco se o endpoint existe
    if (executionOptions.startEndpointId) {
        const [targetEndpoint] = await db
            .select({ id: endpoints.id, path: endpoints.path })
            .from(endpoints)
            .where(eq(endpoints.id, executionOptions.startEndpointId));

        if (!targetEndpoint) {
            log.error(`[ERRO] Endpoint com ID ${executionOptions.startEndpointId} não foi encontrado no banco de dados.`);
            process.exit(1);
        }
        log.info(`[STATUS] Endpoint inicial validado: ID ${targetEndpoint.id} | Path: "${targetEndpoint.path}"`);
    }

    if (executionOptions.layer === 'bronze') {
        if (executionOptions.skipDiscovery) {
            log.info(`[STATUS] Camada selecionada: BRONZE (Pular Discovery = SIM, Endpoint Inicial = ID ${executionOptions.startEndpointId ?? 1})`);
        } else {
            log.info("[STATUS] Camada selecionada: BRONZE COMPLETA (Discovery + Fetch)");
        }
    } else {
        log.info("[STATUS] Camada selecionada: SILVER (Bronze ignorada)");
    }

    // ========================================
    // 0. SANITIZAÇÃO DE LOGS NO BANCO DE DADOS
    // ========================================
    log.info("[ETAPA 0] Sanitizando tabela de logs...");
    await sanitizelogsTable();

    if (executionOptions.layer === 'bronze') {
        // ===============
        // 1. BRONZE LAYER
        // ===============
        if (executionOptions.skipDiscovery) {
            log.info(`[ETAPA 1] Executando Bronze Layer (Pular Discovery = SIM, Endpoint Inicial ID = ${executionOptions.startEndpointId ?? 1})...`);
        } else {
            log.info("[ETAPA 1] Executando Bronze Layer (Completa)...");
        }
        await bronzeOrchestrator({
            skipDiscovery: executionOptions.skipDiscovery,
            startEndpointId: executionOptions.startEndpointId,
            startOffset: executionOptions.startOffset,
            maxOffset: executionOptions.maxOffset,
            singleEndpoint: executionOptions.singleEndpoint,
        });

        // ===============
        // 2. SILVER LAYER
        // ===============
        log.info("[ETAPA 2] Executando Silver Layer...");
        await silverOrchestrator();
    } else if (executionOptions.layer === 'silver') {
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