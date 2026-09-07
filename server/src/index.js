// 《大明浮生记》权威推演与单机复刻服务端主入口
const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const dataLoader = require('./services/DataLoader');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API ${req.method}] ${req.url} ->`, req.body);
  }
  next();
});

// API 路由挂载
app.use('/api', routes);

// 静态托管: 前端 Web 目录
app.use(express.static(path.resolve(__dirname, '../../web')));

// 静态托管: 原版解包切图与音频资产目录 (无需物理复制 50MB 资源)
app.use('/assets_origin', express.static(path.resolve(__dirname, '../../extracted_full_resources')));
app.use('/assets', express.static(path.resolve(__dirname, '../../tools/perfect_apk_build/assets/data')));
app.use('/music', express.static(path.resolve(__dirname, '../../tools/perfect_apk_build/assets/music')));

// 初始化预载静态配置
dataLoader.loadAll();

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 《大明浮生记》第一阶段权威服务端已启动！`);
  console.log(`👉 游戏网页端直连: http://127.0.0.1:${PORT}`);
  console.log(`👉 后端 API 服务:  http://127.0.0.1:${PORT}/api`);
  console.log('====================================================');
});
