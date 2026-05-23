import fs from 'fs';

const schema = JSON.parse(fs.readFileSync('db_schema_full.json', 'utf8'));
const ordersColumns = schema.definitions.orders.properties;
console.log('Orders Columns:', Object.keys(ordersColumns));
