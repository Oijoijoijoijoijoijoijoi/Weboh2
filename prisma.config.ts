import { defineConfig } from "@prisma/config";
import { config } from 'dotenv';
import { expand } from 'dotenv-expand'; 
import path from 'path';

const envConfig = config({ path: path.resolve(__dirname, '.env') });
expand(envConfig); 

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});