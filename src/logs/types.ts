import path from "path";

export const BASE_PATH: string = import.meta.dirname;

export const DISCOVERY_LOGS_DIR: string = path.join(BASE_PATH, '../logs/discovery/');
export const FETCHERS_LOGS_DIR: string = path.join(BASE_PATH, '../logs/fetchers/')

export const LOGS_DIR_LIST: string[] = [ DISCOVERY_LOGS_DIR, FETCHERS_LOGS_DIR ];