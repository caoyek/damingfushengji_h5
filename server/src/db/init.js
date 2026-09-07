// 数据库初始化验证入口
const { db, initDatabase } = require('./database');

console.log('正在验证 SQLite 数据库架构...');
initDatabase();

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
console.log('✅ SQLite 数据库初始化成功！当前业务数据表清单：');
tables.forEach((t, i) => {
  console.log(`  ${i + 1}. ${t.name}`);
});
