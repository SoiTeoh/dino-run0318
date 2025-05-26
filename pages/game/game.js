Page({
  data: {
    gameStarted: false,
    gameOver: false,
    score: 0,
    highScore: 0,
    finalScore: 0,
    scoreDigits: [0, 0, 0, 0, 0], // 实时分数的数字数组
    highScoreDigits: [0, 0, 0, 0, 0], // 最高分的数字数组
    finalScoreDigits: [0, 0, 0, 0, 0], // 最终分的数字数组
    dinoY: 0,
    isJumping: false,
    obstacles: [],
    cloud1X: 600,
    cloud2X: 1200,
    cloud1Waiting: false,
    cloud2Waiting: false,
    groundY: 0,
    cloudY: 0,
    canvasHeight: 0,
    canvasWidth: 0,
    lastObstacleX: 0,
  },

  onLoad() {
    this.initGame();
    this.loadAssets();
    this.ctx = wx.createCanvasContext('gameCanvas');
  },

  // 格式化分数为 5 位数字数组
  formatScoreDigits(num) {
    return num.toString().padStart(5, '0').split('').map(digit => parseInt(digit));
  },

  updateScoreDigits() {
    this.setData({ scoreDigits: this.formatScoreDigits(this.data.score) });
  },

  updateHighScoreDigits() {
    this.setData({ highScoreDigits: this.formatScoreDigits(this.data.highScore) });
  },

  updateFinalScoreDigits() {
    this.setData({ finalScoreDigits: this.formatScoreDigits(this.data.finalScore) });
  },

  // 加载资源（图片和音效）
  loadAssets() {
    // 加载跳跃音效
    this.jumpSound = wx.createInnerAudioContext();
    this.jumpSound.src = '/sounds/jump.mp3';
    this.jumpSound.onError((res) => {
      console.log('音效加载失败:', res.errMsg);
    });

    // 预加载图片
    const imagesToLoad = [
      '/images/game/ground.png',
      '/images/game/sprite.png',
      ...this.obstacleTypes.map(type => type.src),
    ];
    imagesToLoad.forEach(src => {
      wx.getImageInfo({
        src,
        success: () => console.log(`图片加载成功: ${src}`),
        fail: err => console.error(`图片加载失败: ${src}`, err),
      });
    });
  },

  // 初始化游戏
  initGame() {
    const windowInfo = wx.getWindowInfo();
    const canvasWidth = windowInfo.windowWidth;
    const canvasHeight = windowInfo.windowHeight;
    const groundHeight = 12;
    const groundY = canvasHeight * 2 / 3 - groundHeight;
    const cloudY = canvasHeight / 4;

    this.setData({
      gameStarted: false,
      gameOver: false,
      score: 0,
      finalScore: 0,
      scoreDigits: [0, 0, 0, 0, 0],
      finalScoreDigits: [0, 0, 0, 0, 0],
      dinoY: groundY,
      isJumping: false,
      obstacles: [],
      cloud1X: canvasWidth + Math.random() * 200,
      cloud2X: canvasWidth + 400 + Math.random() * 200,
      cloud1Waiting: false,
      cloud2Waiting: false,
      groundY: groundY,
      cloudY: cloudY,
      canvasHeight: canvasHeight,
      canvasWidth: canvasWidth,
      lastObstacleX: canvasWidth,
    });

    // 初始化游戏对象
    this.dino = {
      x: 50,
      y: 0,
      width: 44,
      height: 47,
      hitboxWidth: 42,
      hitboxHeight: 46,
      frameWidth: 44,
      frameHeight: 47,
      dy: 0,
      gravity: 0.5,
      jumpForce: -10,
      frameIndex: 0,
      frameCount: 5,
      frameTimer: 0,
      frameDelay: 2,
    };

    this.ground = {
      x: 0,
      width: 1200,
      height: 12,
      speed: 3,
    };

    this.obstacleTypes = [
      // 小仙人掌：17×35 像素
      { src: '/images/cactus01.png', width: 17, height: 35, hitboxWidth: 15, hitboxHeight: 30 },
      { src: '/images/cactus02.png', width: 17, height: 35, hitboxWidth: 15, hitboxHeight: 30 },
      { src: '/images/cactus03.png', width: 17, height: 35, hitboxWidth: 15, hitboxHeight: 30 },
      { src: '/images/cactus04.png', width: 17, height: 35, hitboxWidth: 15, hitboxHeight: 30 },
      { src: '/images/cactus05.png', width: 17, height: 35, hitboxWidth: 15, hitboxHeight: 30 },
      { src: '/images/cactus06.png', width: 17, height: 35, hitboxWidth: 15, hitboxHeight: 30 },
      // 大仙人掌：25×50 像素
      { src: '/images/cactus09.png', width: 25, height: 50, hitboxWidth: 20, hitboxHeight: 45 },
      { src: '/images/cactus10.png', width: 25, height: 50, hitboxWidth: 20, hitboxHeight: 45 },
      { src: '/images/cactus11.png', width: 25, height: 50, hitboxWidth: 20, hitboxHeight: 45 },
      { src: '/images/cactus12.png', width: 25, height: 50, hitboxWidth: 20, hitboxHeight: 45 },
    ];

    this.cloudSpeed = { min: 1, max: 2 };
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundLevel = 0;
    this.nextObstacleFrame = this.getRandomInterval();
    this.frame = 0;

    wx.createSelectorQuery()
      .select('.game-container')
      .node()
      .exec(res => {
        if (res[0] && res[0].node) {
          res[0].node.style.setProperty('--ground-y', `${groundY}px`);
        }
      });
  },

  // 获取随机障碍物生成间隔
  getRandomInterval() {
    const baseMin = 120;
    const baseMax = 240;
    const difficultyFactor = Math.max(0.5, 1 - this.data.score / 100);
    return Math.floor(Math.random() * (baseMax - baseMin) * difficultyFactor) + baseMin;
  },

  // 启动游戏
  startGame() {
    this.setData({
      gameStarted: true,
      gameOver: false,
      score: 0,
      obstacles: [],
    });
    this.frame = 0;
    this.gameLoop();
  },

  // 重新开始游戏
  restartGame() {
    this.setData({
      gameStarted: false,
      gameOver: false,
      score: 0,
      finalScore: 0,
      scoreDigits: [0, 0, 0, 0, 0],
      finalScoreDigits: [0, 0, 0, 0, 0],
      obstacles: [],
      cloud1X: this.canvasWidth + Math.random() * 200,
      cloud2X: this.canvasWidth + 400 + Math.random() * 200,
      cloud1Waiting: false,
      cloud2Waiting: false,
    });
  },

  // 触摸事件
  onTouchStart(e) {
    if (!this.data.gameStarted) {
      this.startGame();
      return;
    }
    if (this.data.gameOver) {
      this.initGame();
      return;
    }
    if (!this.data.isJumping) {
      this.setData({ isJumping: true });
      this.dino.dy = this.dino.jumpForce;
      this.jumpSound.play();
    }
  },

  // 游戏主循环
  gameLoop() {
    if (this.data.gameOver) return;

    this.update();
    this.draw();

    setTimeout(() => this.gameLoop(), 1000 / 60); // 60 FPS
  },

  // 更新障碍物
  updateObstacles() {
    let obstacles = this.data.obstacles;

    // 移除屏幕外的障碍物
    obstacles = obstacles.filter(ob => ob.x + ob.width > 0);

    // 移动障碍物
    obstacles.forEach(ob => {
      ob.x -= this.ground.speed;
    });

    // 生成新障碍物
    if (this.frame >= this.nextObstacleFrame) {
      const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
      obstacles.push({
        x: this.canvasWidth,
        y: this.data.groundY,
        width: type.width,
        height: type.height,
        hitboxWidth: type.hitboxWidth,
        hitboxHeight: type.hitboxHeight,
        src: type.src,
        passed: false,
      });
      this.nextObstacleFrame = this.frame + this.getRandomInterval();
    }

    this.setData({ obstacles });
  },

  // 碰撞检测
  checkCollision() {
    const dino = this.dino;
    const dinoLeft = dino.x + (dino.width - dino.hitboxWidth) / 2;
    const dinoRight = dinoLeft + dino.hitboxWidth;
    const dinoTop = this.data.dinoY - dino.hitboxHeight;
    const dinoBottom = this.data.dinoY;

    for (const ob of this.data.obstacles) {
      const obLeft = ob.x + (ob.width - ob.hitboxWidth) / 2;
      const obRight = obLeft + ob.hitboxWidth;
      const obTop = ob.y - ob.hitboxHeight;
      const obBottom = ob.y;

      if (dinoRight <= obLeft || dinoLeft >= obRight || dinoBottom <= obTop || dinoTop >= obBottom) {
        if (!ob.passed && ob.x + ob.width < dino.x) {
          ob.passed = true;
          this.setData({ score: this.data.score + 1 }, () => this.updateScoreDigits());
        }
        continue;
      }

      this.setData({
        gameOver: true,
        finalScore: this.data.score,
      }, () => {
        if (this.data.finalScore > this.data.highScore) {
          this.setData({ highScore: this.data.finalScore }, () => this.updateHighScoreDigits());
        }
        this.updateFinalScoreDigits();
      });
      break;
    }
  },

  // 更新游戏状态
  update() {
    if (this.data.gameOver) return;

    this.frame++;

    // 更新恐龙跳跃
    this.dino.dy += this.dino.gravity;
    this.dino.y += this.dino.dy;

    if (this.dino.y >= this.groundLevel) {
      this.dino.y = this.groundLevel;
      this.dino.dy = 0;
      this.setData({ isJumping: false, dinoY: this.data.groundY });
    } else {
      this.setData({ dinoY: this.data.groundY + this.dino.y });
    }

    // 更新恐龙动画
    if (!this.data.isJumping) {
      this.dino.frameTimer++;
      if (this.dino.frameTimer >= this.dino.frameDelay) {
        this.dino.frameTimer = 0;
        this.dino.frameIndex = (this.dino.frameIndex + 1) % this.dino.frameCount;
      }
    } else {
      this.dino.frameIndex = 0;
    }

    // 更新地面
    this.ground.x -= this.ground.speed;
    if (this.ground.x <= -this.ground.width) {
      this.ground.x = 0;
    }

    // 更新障碍物
    this.updateObstacles();

    // 检查碰撞
    this.checkCollision();

    // 更新云朵
    let cloud1X = this.data.cloud1X;
    let cloud2X = this.data.cloud2X;

    if (!this.data.cloud1Waiting) {
      cloud1X -= (this.cloudSpeed.min + Math.random() * (this.cloudSpeed.max - this.cloudSpeed.min));
      if (cloud1X < -42) {
        this.setData({ cloud1Waiting: true });
        setTimeout(() => {
          this.setData({ cloud1X: this.canvasWidth + Math.random() * 200, cloud1Waiting: false });
        }, 500);
      }
    }

    if (!this.data.cloud2Waiting) {
      cloud2X -= (this.cloudSpeed.min + Math.random() * (this.cloudSpeed.max - this.cloudSpeed.min));
      if (cloud2X < -42) {
        this.setData({ cloud2Waiting: true });
        setTimeout(() => {
          this.setData({ cloud2X: this.canvasWidth + 400 + Math.random() * 200, cloud2Waiting: false });
        }, 500);
      }
    }

    this.setData({ cloud1X, cloud2X });
  },

  // 统一绘制
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 绘制地面
    try {
      ctx.drawImage(
        '/images/game/ground.png',
        this.ground.x,
        this.data.groundY,
        this.ground.width,
        this.ground.height
      );
      ctx.drawImage(
        '/images/game/ground.png',
        this.ground.x + this.ground.width,
        this.data.groundY,
        this.ground.width,
        this.ground.height
      );
    } catch (e) {
      console.log('地面图片绘制失败:', e);
      ctx.setFillStyle('gray');
      ctx.fillRect(0, this.data.groundY, this.canvasWidth, this.ground.height);
    }

     // 绘制障碍物（向下移动 3 像素）
     try {
      this.data.obstacles.forEach(ob => {
        const offsetY = 3; // 向下移动 3 像素
        ctx.drawImage(ob.src, ob.x, (ob.y - ob.height) + offsetY, ob.width, ob.height);
      });
    } catch (e) {
      console.log('仙人掌绘制失败:', e);
      this.data.obstacles.forEach(ob => {
        const offsetY = 3; // 向下移动 3 像素
        ctx.setFillStyle('green');
        ctx.fillRect(ob.x, (ob.y - ob.height) + offsetY, ob.width, ob.height);
      });
    }

    // 绘制恐龙
    try {
      const sx = this.dino.frameIndex * this.dino.frameWidth;
      const adjustedY = this.data.dinoY - this.dino.height;
      ctx.drawImage(
        '/images/game/sprite.png',
        677 + sx,
        0,
        this.dino.frameWidth,
        this.dino.frameHeight,
        this.dino.x,
        adjustedY,
        this.dino.width,
        this.dino.height
      );
    } catch (e) {
      console.log('恐龙图片绘制失败:', e);
      ctx.setFillStyle('black');
      ctx.fillRect(this.dino.x, this.data.dinoY - this.dino.height, this.dino.width, this.dino.height);
    }

    ctx.draw();
  },

  // 错误处理
  onGameOverImageError(e) {
    console.log('Game Over 图片加载失败:', e.detail);
  },

  onRestartImageError(e) {
    console.log('Restart 图片加载失败:', e.detail);
  },
});