import fs from 'fs';

const schema = JSON.parse(fs.readFileSync('db_schema_full.json', 'utf8'));

const tablesToInspect = ['orders', 'order_items', 'addresses', 'wishlist', 'cart_items'];

const result = {};

for (const tableName of tablesToInspect) {
  const definition = schema.definitions[tableName];
  if (definition) {
    result[tableName] = {
      required: definition.required || [],
      properties: {}
    };
    for (const [colName, colProp] of Object.entries(definition.properties || {})) {
      result[tableName].properties[colName] = {
        type: colProp.type,
        format: colProp.format,
        description: colProp.description
      };
    }
  } else {
    result[tableName] = 'NOT FOUND';
  }
}

fs.writeFileSync('inspected_tables.json', JSON.stringify(result, null, 2));
console.log('Inspected tables details saved to inspected_tables.json!');
