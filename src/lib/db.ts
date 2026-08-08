import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function initVercelDatabase() {
  if (!process.env.VERCEL) {
    return process.env.DATABASE_URL || 'file:./dev.db';
  }

  const tmpPath = '/tmp/dev.db';
  
  if (!fs.existsSync(tmpPath)) {
    const candidates = [
      path.join(process.cwd(), 'prisma', 'dev.db'),
      path.join(process.cwd(), 'dev.db'),
      path.resolve('./prisma/dev.db'),
      path.resolve('./dev.db'),
    ];

    let copied = false;
    for (const src of candidates) {
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, tmpPath);
          console.log(`[Vercel DB] Successfully copied pre-built DB from ${src} to ${tmpPath}`);
          copied = true;
          break;
        } catch (err) {
          console.error(`[Vercel DB] Error copying ${src} to ${tmpPath}:`, err);
        }
      }
    }

    if (!copied) {
      console.warn('[Vercel DB] Pre-built dev.db not found in candidates list');
    }
  }

  return `file:${tmpPath}`;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: initVercelDatabase(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
