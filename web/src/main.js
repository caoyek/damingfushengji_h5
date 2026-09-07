// 《大明浮生记》H5 启动引导与主循环
window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('gameCanvas');
  const V_WIDTH = 960;
  const V_HEIGHT = 640;

  // 1. 设置虚拟分辨率
  canvas.width = V_WIDTH;
  canvas.height = V_HEIGHT;

  // 2. 窗口自适应缩放 (Contain 算法)
  function resizeCanvas() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const scale = Math.min(windowWidth / V_WIDTH, windowHeight / V_HEIGHT);

    canvas.style.width = `${Math.floor(V_WIDTH * scale)}px`;
    canvas.style.height = `${Math.floor(V_HEIGHT * scale)}px`;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // 3. 初始化核心引擎与场景
  const renderer = new CanvasRenderer(canvas);
  window.sceneManager.init(renderer);

  window.sceneManager.register('LoginScene', new LoginScene());
  window.sceneManager.register('CreateRoleScene', new CreateRoleScene());
  window.sceneManager.register('MainCityScene', new MainCityScene());
  window.sceneManager.register('BattleScene', new BattleScene());

  // 4. 输入坐标映射换算
  function getCanvasCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;

    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  canvas.addEventListener('click', (e) => {
    const { x, y } = getCanvasCoords(e);
    window.sceneManager.onClick(x, y);
  });

  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getCanvasCoords(e);
    window.sceneManager.onMouseMove(x, y);
  });

  canvas.addEventListener('touchstart', (e) => {
    const { x, y } = getCanvasCoords(e);
    window.sceneManager.onClick(x, y);
  }, { passive: true });

  // 5. 预加载核心资产并切入选服场景
  console.log('[Main] 正在预载核心古风水墨资产...');
  await window.resourceManager.preloadCoreAssets();
  console.log('[Main] 资源就绪，进入登录选服场景');

  window.sceneManager.switchScene('LoginScene');

  // 6. 主渲染循环 (rAF)
  let lastTime = performance.now();
  function gameLoop(time) {
    const dt = Math.min(100, time - lastTime);
    lastTime = time;

    window.sceneManager.update(dt);
    window.sceneManager.render();

    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);
});
