import 'dotenv/config';
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: `./src/database/silver_schema.ts`,
    out: `./src/database/out/silver/`,
    dialect: 'mysql',
    dbCredentials: {
        url: process.env.SILVER_URL || '',
    }
})