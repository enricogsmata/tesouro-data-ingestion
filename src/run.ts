/*
    Arquivo responsável por executar o fluxo da aplicação
*/
import { BuildDataSources } from "./datasource/discovery.js";
import type { DataSource } from "./datasource/models.js";

console.clear();

// 1. Realiza o seed dos data sources (API base url + endpoints)
const dataSources: DataSource[] | null = await BuildDataSources();

if (dataSources) {
    console.clear();
    console.log(`[INFO] DataSources construídos: ${dataSources.length}!`);
    console.table(dataSources);
} else {
    console.error(`[ERRO | RUN] Falha no seed dos data soruces!`);
}