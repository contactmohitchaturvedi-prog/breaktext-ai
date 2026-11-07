import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = {
  ...pkg.scripts,
  "build": "npm install --prefix client && npm run build --prefix client",
  "start": "node server/index.js"
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2), 'utf8');
console.log('Build script updated.');
