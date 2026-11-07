import fs from 'fs';
import path from 'path';

const sourceDb = process.env.DATABASE_PATH || (fs.existsSync('/data/breaktext.db') ? '/data/breaktext.db' : (fs.existsSync('/app/data/breaktext.db') ? '/app/data/breaktext.db' : 'database.sqlite'));

if (!fs.existsSync(sourceDb)) {
  console.log('Database not found yet at ' + sourceDb + ' (created on first record write)');
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.resolve('backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const targetFile = path.join(backupDir, `breaktext-backup-${timestamp}.db`);
fs.copyFileSync(sourceDb, targetFile);

console.log('==================================================');
console.log('✓ Database successfully backed up to:');
console.log('  ' + targetFile);
console.log('==================================================');
