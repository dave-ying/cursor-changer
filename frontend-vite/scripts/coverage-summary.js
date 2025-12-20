const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'coverage', 'coverage-final.json');
if (!fs.existsSync(file)) {
  console.error('coverage file not found:', file);
  process.exit(2);
}
const cov = JSON.parse(fs.readFileSync(file, 'utf8'));
let totalStmts=0, coveredStmts=0, totalFuncs=0, coveredFuncs=0, totalBranches=0, coveredBranches=0;
for (const p in cov) {
  const meta = cov[p];
  const s = Object.values(meta.s || {});
  const f = Object.values(meta.f || {});
  const b = Object.values(meta.b || {});
  totalStmts += s.length;
  coveredStmts += s.filter(x => x>0).length;
  totalFuncs += f.length;
  coveredFuncs += f.filter(x => x>0).length;
  for (const arr of b) {
    totalBranches += arr.length;
    coveredBranches += arr.filter(x => x>0).length;
  }
}
const pct = (n, d) => (d ? ((n/d)*100).toFixed(2) : 'n/a');
console.log('Statements:', `${coveredStmts}/${totalStmts}`, `${pct(coveredStmts,totalStmts)}%`);
console.log('Functions :', `${coveredFuncs}/${totalFuncs}`, `${pct(coveredFuncs,totalFuncs)}%`);
console.log('Branches  :', `${coveredBranches}/${totalBranches}`, `${pct(coveredBranches,totalBranches)}%`);
