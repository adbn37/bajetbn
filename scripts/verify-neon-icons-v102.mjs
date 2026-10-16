import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const list = [
  'wallet', 'briefcase', 'gift', 'shop', 'laptop', 'home', 'food',
  'cart', 'fuel', 'car', 'bus', 'bill', 'phone', 'school',
  'health', 'family', 'heart', 'bag', 'game', 'repeat', 'tools',
  'staff', 'building', 'bank', 'plane', 'dots', 'cash', 'coins',
  'card', 'savings', 'investment', 'chart', 'calendar', 'receipt', 'target',
  'piggy', 'coffee', 'restaurant', 'groceries', 'supermarket', 'delivery', 'train',
  'taxi', 'parking', 'toll', 'maintenance', 'insurance', 'mortgage', 'furniture',
  'laundry', 'electric', 'water', 'wifi', 'mobile', 'medical', 'dental',
  'pharmacy', 'fitness', 'tuition', 'books', 'childcare', 'pets', 'donation',
  'wedding', 'clothes', 'shoes', 'beauty', 'movie', 'music', 'streaming',
  'subscription', 'salary', 'bonus', 'freelance', 'invoice', 'tax', 'marketing',
  'shipping', 'warehouse', 'inventory', 'equipment', 'payroll', 'security', 'cloud',
];
assert.equal(list.length,84);
assert.equal(new Set(list).size,84);
const directory=path.resolve('public/category-icons-v102');
assert.ok(fs.existsSync(directory),'Icon assets folder missing');
const svgs=fs.readdirSync(directory).filter(x=>x.endsWith('.svg'));
assert.equal(svgs.length,84,'Must contain 84 individual SVG files');
for (const name of list) {
 const doc=fs.readFileSync(path.join(directory,`${name}.svg`),'utf8');
 assert.match(doc,/<svg\s/,'SVG root missing');
 assert.match(doc,/viewBox="0 0 96 96"/,'Incorrect SVG dimensions');
 assert.ok(!/<script|javascript:|<image|xlink:href/i.test(doc),'Unsafe SVG: '+name);
}
const component=fs.readFileSync('src/features/transactions/TransactionsPage.tsx','utf8');
assert.match(component,/categoryIconAsset/);
assert.match(component,/bajetbn-v102-vector-icon/);
assert.match(component,/categoryIconAsset\(value\)/);
assert.match(component,/categoryIconAsset\(icon\)/);
assert.match(component,/customIcon \? <img/,'Custom image priority must be preserved');
const defaults=fs.readFileSync('src/features/categories/defaultCategories.ts','utf8');
for(const name of list)assert.ok(defaults.includes(`'${name}'`),'Icon not selectable: '+name);
const main=fs.readFileSync('src/main.tsx','utf8');
assert.match(main,/design-neon-icons-v102\.css/);
const service=fs.readFileSync('src/services/categoryIconAssets.ts','utf8');
assert.match(service,/categoryIconAsset/);
console.log('PASS: Phase 10.2 SVG assets 84/84, UI wiring, editor palette, custom image override and stylesheet.');
console.log('NOTE: Static checks only. Browser appearance and category save need staging verification.');
