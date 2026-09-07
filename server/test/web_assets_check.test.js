// 网页静态资源与脚本完整性自动化检查脚本
const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:3000';

async function checkUrl(path) {
  const url = `${BASE_URL}${path}`;
  const resp = await fetch(url);
  assert.strictEqual(resp.status, 200, `资源应返回 200: ${path}`);
  return await resp.text();
}

async function runCheck() {
  console.log('====================================================');
  console.log('🌐 开始检验前端 Web 页面与各模块脚本完整性...');
  console.log('====================================================');

  // 1. 检验主页面 index.html
  console.log('检查 index.html...');
  const html = await checkUrl('/index.html');
  assert.ok(html.includes('id="gameCanvas"'), '应包含 gameCanvas');
  assert.ok(html.includes('src="src/main.js"'), '应引入 main.js');
  console.log('✅ index.html 校验通过！');

  // 2. 检验 CSS
  console.log('检查 css/style.css...');
  await checkUrl('/css/style.css');
  console.log('✅ style.css 校验通过！');

  // 3. 检验各 JS 核心引擎文件
  const scripts = [
    '/src/net/ApiClient.js',
    '/src/engine/AudioManager.js',
    '/src/engine/ResourceManager.js',
    '/src/engine/CanvasRenderer.js',
    '/src/engine/SceneManager.js',
    '/src/scenes/LoginScene.js',
    '/src/scenes/CreateRoleScene.js',
    '/src/scenes/MainCityScene.js',
    '/src/scenes/BattleScene.js',
    '/src/main.js'
  ];

  for (const s of scripts) {
    console.log(`检查脚本: ${s}...`);
    const code = await checkUrl(s);
    assert.ok(code.length > 50, `${s} 内容不可为空`);
    console.log(`  -> 成功载入 (${code.length} 字节)`);
  }

  // 4. 检验切图静态路由
  console.log('检查宣纸地图切图静态路由...');
  const mapResp = await fetch(`${BASE_URL}/assets/map/6_cn_xsc.png`);
  assert.strictEqual(mapResp.status, 200, '新手村城内全景底图应可访问');
  console.log(`✅ 地图底图路由正常 (HTTP ${mapResp.status}, 类型: ${mapResp.headers.get('content-type')})`);

  console.log('\n====================================================');
  console.log('🎉 前端 H5 静态资源与脚本链路全部正常 (100% PASS)！');
  console.log('====================================================\n');
}

runCheck().catch(err => {
  console.error('❌ 页面完整性测试失败:', err);
  process.exit(1);
});
