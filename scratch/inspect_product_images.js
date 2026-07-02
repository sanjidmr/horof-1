import fs from 'fs';
const schema = JSON.parse(fs.readFileSync('db_schema_full.json', 'utf8'));
console.log('PRODUCT IMAGES SCHEMA:', JSON.stringify(schema.definitions['product_images'], null, 2));
