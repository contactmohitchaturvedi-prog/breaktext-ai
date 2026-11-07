import fs from 'fs';
import path from 'path';

const candidateFiles = ['server/db.js', 'server/database.js', 'server/index.js'];
let patched = false;

for (const file of candidateFiles) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    if (code.includes('breaktext.db') && !code.includes('storageDir')) {
      const dbSetup = `
import fs from 'fs';
import path from 'path';

const storageDir = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/app/data' : path.resolve('.'));
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}
const DB_PATH = path.join(storageDir, 'breaktext.db');
`;
      code = dbSetup + '\n' + code.replace(/['"`][^'"`]*breaktext\.db['"`]/g, 'DB_PATH');
      fs.writeFileSync(file, code, 'utf8');
      console.log(`✓ Updated database storage path in ${file}`);
      patched = true;
      break;
    }
  }
}
if (!patched) console.log('Database path already configured or verified.');
