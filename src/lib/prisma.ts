import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null };

function createPrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (process.env.VERCEL && url.startsWith("file:")) return null;
  try {
    return new PrismaClient();
  } catch {
    return null;
  }
}

export const prisma =
  globalForPrisma.prisma !== undefined
    ? globalForPrisma.prisma
    : (globalForPrisma.prisma = createPrisma());

export const hasDatabase = !!prisma;
