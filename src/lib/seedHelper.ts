import { db } from './db';
import { execSync } from 'child_process';
import path from 'path';

let isSeeding = false;

export async function ensureDatabaseSeeded() {
  try {
    let productCount = 0;
    try {
      productCount = await db.product.count();
    } catch (tableErr: any) {
      console.warn('[SeedHelper] Database table missing or uninitialized:', tableErr?.message || tableErr);
      return;
    }

    if (productCount > 0) {
      return;
    }

    if (isSeeding) return;
    isSeeding = true;

    console.log('[SeedHelper] Database empty. Auto-seeding initial dataset from CSDL AHS Practice Excel...');
    const scriptPath = path.resolve(process.cwd(), 'scripts/import_excel_practice_data.mjs');
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    console.log('[SeedHelper] Auto-seeding from Excel completed successfully.');
  } catch (err) {
    console.error('[SeedHelper] Error during auto-seeding:', err);
  } finally {
    isSeeding = false;
  }
}
