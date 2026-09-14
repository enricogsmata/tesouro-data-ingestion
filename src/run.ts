/*
    Arquivo responsável por executar o fluxo da aplicação
*/
import { Browser } from "puppeteer";
import { BuildDataSources, GetDatasetApiData } from "./datasource/discovery.js";
import puppeteer from "puppeteer-core";

console.clear();

// 1. Realiza o seed dos data sources (API base url + endpoints)
BuildDataSources();