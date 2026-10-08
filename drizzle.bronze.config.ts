import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/database/bronze_schema.ts',
    out: './src/database/out/bronze/',
    dialect: 'mysql',
    dbCredentials: {
        url: process.env.BRONZE_URL || '',
    }
});