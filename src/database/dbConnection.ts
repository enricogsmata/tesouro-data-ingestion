import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const bronzePoolConnection = mysql.createPool(process.env.BRONZE_URL!);
const silverPoolConnection = mysql.createPool(process.env.SILVER_URL!);

export const bronzeDB = drizzle(bronzePoolConnection);
export const silverDB = drizzle(silverPoolConnection);