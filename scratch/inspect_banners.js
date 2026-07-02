import fs from 'fs';
const schema = JSON.parse(fs.readFileSync('db_schema_full.json', 'utf8'));
console.log('BANNERS:', JSON.stringify(schema.definitions['banners'], null, 2));
