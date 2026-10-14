import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './src/config/prisma.js';

const email = process.env.INITIAL_ADMIN_EMAIL || 'serp@addsmint.com';
const password = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';

const hashedPassword = await bcrypt.hash(password, 10);

const existing = await prisma.user.findUnique({ where: { email } });

if (existing) {
  console.log(`Admin already exists: ${email}`);
} else {
  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log(`Admin created: ${email}`);
}

await prisma.$disconnect();
