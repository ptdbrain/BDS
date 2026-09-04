import { execSync } from 'child_process';
import path from 'path';

console.log('🌱 Chạy Prisma Seed: Tự động nạp dữ liệu từ CSDL AHS Practice Excel...');
const scriptPath = path.resolve(process.cwd(), 'scripts/import_excel_practice_data.mjs');
execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
console.log('✅ Hoàn tất nạp dữ liệu CSDL AHS Practice Excel!');
