// src/config/prisma.config.js
// require("dotenv").config();  // Ensure dotenv is loaded for environment variables

// prisma.config.js
// module.exports = {
//   schema: "prisma/schema.prisma",  // Path to your Prisma schema
//   migrations: {
//     path: "prisma/migrations",     // Path to migrations folder
//   },
//   datasource: {
//     url: process.env.DATABASE_URL, // Connection string from .env file
//   },
// };


import { defineConfig } from 'prisma/config'
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, './.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
  migrate: {
    async adapter(env) {
      return new pg.Pool({ connectionString: env.DIRECT_URL })
    },
  },
})