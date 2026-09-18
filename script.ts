// run-debug.ts
console.log('1. Iniciando teste de imports...');

console.log('2. Carregando dbConnection...');
const { db } = await import('./src/database/dbConnection.js');

console.log('3. Carregando logger...');
const { createAppLogger } = await import('./src/logs/logic.js');

console.log('4. Carregando discovery...');
const { BuildDataSources } = await import('./src/discovery/discovery.js');

console.log('5. Carregando endpoint_mapper...');
const { MapDiscoveredEndpointsInMemory } = await import('./src/discovery/endpoint_mapper.js');

console.log('6. Carregando fetchers...');
const { EndpointFetcherOrchestrator } = await import('./src/fetchers/index.js');

console.log('Todos os imports foram carregados com sucesso!');