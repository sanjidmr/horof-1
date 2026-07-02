import fs from 'fs';
const schema = JSON.parse(fs.readFileSync('db_schema_full.json', 'utf8'));
console.log('CATEGORIES:', JSON.stringify(schema.definitions['categories'], null, 2));
console.log('BRANDS:', JSON.stringify(schema.definitions['brands'], null, 2));
