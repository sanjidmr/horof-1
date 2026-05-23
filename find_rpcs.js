import fs from 'fs';

const schema = JSON.parse(fs.readFileSync('db_schema_full.json', 'utf8'));
const rpcs = Object.keys(schema.paths || {}).filter(path => path.startsWith('/rpc/'));
console.log('Registered RPCs:', rpcs);
