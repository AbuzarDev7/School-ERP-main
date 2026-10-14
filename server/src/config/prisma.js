// // src/config/prisma.js
// import { PrismaClient } from "@prisma/client";
// import { PrismaPg } from "@prisma/adapter-pg";
// import pg from "pg";

// // 1. Create the database connection pool
// const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// // 2. Initialize the Prisma Adapter
// const adapter = new PrismaPg(pool);

// // 3. Pass the adapter to the PrismaClient constructor
// const prisma = new PrismaClient({
//   adapter,
//   log: ['query', 'info', 'warn'],
// });

// export { prisma };



// // src/config/prisma.js
// import 'dotenv/config'; // 👈 This must be at the top
// import { PrismaClient } from "@prisma/client";
// import { PrismaPg } from "@prisma/adapter-pg";
// import pg from "pg";

// // Quick check to confirm it's loading
// if (!process.env.DATABASE_URL) {
//   console.error("❌ DATABASE_URL is undefined. Check your .env file location.");
// }

// const pool = new pg.Pool({ 
//   connectionString: process.env.DATABASE_URL 
// });

// const adapter = new PrismaPg(pool);
// const prisma = new PrismaClient({
//   adapter,
//   log: ['query', 'info', 'warn'],
// });

// export { prisma };


// Deployment:
// src/config/prisma.js
// import { PrismaClient } from "@prisma/client"

// const prisma = globalThis.prisma ?? new PrismaClient()

// if (process.env.NODE_ENV !== 'production') {
//   globalThis.prisma = prisma
// }

// export { prisma }


import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

import 'dotenv/config' // for devlopment, ensures .env variables are loaded

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing from environment variables");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

const prisma = globalThis.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export { prisma }