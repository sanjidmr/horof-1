import fs from 'fs';
const schema = JSON.parse(fs.readFileSync('db_schema_full.json', 'utf8'));
console.log('PRODUCTS PROPERTIES:', Object.keys(schema.definitions['products'].properties));
