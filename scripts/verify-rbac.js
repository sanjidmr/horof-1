import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/lib/auth/permissions.ts');
const content = fs.readFileSync(filePath, 'utf8');

const forbiddenModules = ['brands', 'suppliers', 'refunds', 'media', 'blog', 'testimonials', 'shipping', 'invoices', 'payments'];
const allowedModules = ['accounts', 'categories', 'products', 'orders', 'order_requests', 'design_requests', 'warehouse', 'inventory', 'messages', 'support', 'marketing', 'offer_campaign', 'security_center', 'display_pages', 'settings_center', 'users', 'customers', 'reviews', 'reports', 'dashboard', 'analytics'];
const forbiddenActions = ['export', 'import'];

const missing = [];
for (const module of forbiddenModules) {
  if (content.includes(`code: '${module}'`) || content.includes(`'${module}'`) || content.includes(`"${module}"`)) {
    missing.push(`forbidden module ${module}`);
  }
}

for (const action of forbiddenActions) {
  if (content.includes(`'${action}'`) || content.includes(`"${action}"`)) {
    missing.push(`forbidden action ${action}`);
  }
}

const foundModules = [...content.matchAll(/code:\s*'([^']+)'/g)].map((m) => m[1]);
for (const mod of allowedModules) {
  if (!foundModules.includes(mod)) {
    missing.push(`missing allowed module ${mod}`);
  }
}

if (missing.length) {
  console.error('RBAC verification failed:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('RBAC verification passed.');
