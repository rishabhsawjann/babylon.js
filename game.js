(function () {
  var canvas = document.getElementById('renderCanvas');
  var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

  var cellSize = 1;
  var gridCells = 20;
  var halfGrid = gridCells / 2;
  var stepIntervalMs = 130;
  var groundSize = gridCells * cellSize;

  var COLOR_SNAKE_HEAD = new BABYLON.Color3(0.1, 0.9, 0.1);
  var COLOR_SNAKE_BODY = new BABYLON.Color3(0.1, 0.6, 0.1);
  var COLOR_FOOD = new BABYLON.Color3(0.9, 0.1, 0.1);

  var DIRECTIONS = {
    // Up should move away (north), Down toward camera (south)
    ArrowUp:    { x: 0, z: 1 },
    ArrowDown:  { x: 0, z: -1 },
    ArrowLeft:  { x: -1, z: 0 },
    ArrowRight: { x: 1, z: 0 },
    w: { x: 0, z: 1 },
    s: { x: 0, z: -1 },
    a: { x: -1, z: 0 },
    d: { x: 1, z: 0 }
  };

  var scene, ui, scoreText;
  var snakeMeshes = [];
  var snakeCells = [];
  var currentDirection = { x: 1, z: 0 };
  var bufferedDirection = null;
  var foodMesh = null;
  var score = 0;
  var gameOver = false;
  var stepAccumulator = 0;

  function gridToWorld(gx, gz) {
    return new BABYLON.Vector3(
      gx * cellSize,
      cellSize * 0.5,
      gz * cellSize
    );
  }

  function isInsideBounds(gx, gz) {
    return (
      gx >= -halfGrid &&
      gx < halfGrid &&
      gz >= -halfGrid &&
      gz < halfGrid
    );
  }

  function respawnFood() {
    var occupied = new Set(snakeCells.map(function (c) { return c.gx + ',' + c.gz; }));
    var maxAttempts = 200;
    var gx, gz, key;
    for (var i = 0; i < maxAttempts; i++) {
      gx = Math.floor(Math.random() * gridCells) - halfGrid;
      gz = Math.floor(Math.random() * gridCells) - halfGrid;
      key = gx + ',' + gz;
      if (!occupied.has(key)) {
        var pos = gridToWorld(gx, gz);
        foodMesh.position.copyFrom(pos);
        foodMesh.metadata = { gx: gx, gz: gz };
        return;
      }
    }
    for (gz = -halfGrid; gz < halfGrid; gz++) {
      for (gx = -halfGrid; gx < halfGrid; gx++) {
        key = gx + ',' + gz;
        if (!occupied.has(key)) {
          var p = gridToWorld(gx, gz);
          foodMesh.position.copyFrom(p);
          foodMesh.metadata = { gx: gx, gz: gz };
          return;
        }
      }
    }
  }

  function createScene() {
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.02, 1);

    var camera = new BABYLON.ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3,
      gridCells * 1.2,
      new BABYLON.Vector3(0, 0, 0),
      scene
    );
    camera.lowerBetaLimit = 0.3;
    camera.upperBetaLimit = Math.PI / 2.1;
    camera.attachControl(canvas, true);
    // Keep a stable view so movement directions stay consistent
    camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    camera.inputs.removeByType("ArcRotateCameraPointersInput");
    camera.panningSensibility = 0;
    camera.allowUpsideDown = false;
    // Lock orientation so 'up' on the keyboard always maps to world -Z on screen
    camera.alpha = -Math.PI / 2;
    camera.beta = Math.PI / 3;
    camera.lowerAlphaLimit = camera.alpha;
    camera.upperAlphaLimit = camera.alpha;
    camera.lowerBetaLimit = camera.beta;
    camera.upperBetaLimit = camera.beta;

    var light = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.9;

    var ground = BABYLON.MeshBuilder.CreateGround('ground', { width: groundSize, height: groundSize }, scene);
    var groundMat = new BABYLON.StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.12);
    groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
    ground.material = groundMat;

    var grid = BABYLON.MeshBuilder.CreateGround('grid', { width: groundSize, height: groundSize, subdivisions: gridCells }, scene);
    var gridMat = new BABYLON.StandardMaterial('gridMat', scene);
    gridMat.wireframe = true;
    gridMat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.16);
    gridMat.specularColor = new BABYLON.Color3(0, 0, 0);
    grid.material = gridMat;
    grid.position.y = 0.001;

    var wallMat = new BABYLON.StandardMaterial('wallMat', scene);
    wallMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
    wallMat.alpha = 0.7;
    var wallThickness = 0.2;
    var wallHeight = 1;

    function makeWall(name, w, h, d, pos) {
      var wbox = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
      wbox.material = wallMat;
      wbox.position = pos.clone();
      return wbox;
    }

    makeWall(
      'wallN',
      groundSize,
      wallHeight,
      wallThickness,
      new BABYLON.Vector3(0, wallHeight / 2, -halfGrid * cellSize - wallThickness / 2)
    );
    makeWall(
      'wallS',
      groundSize,
      wallHeight,
      wallThickness,
      new BABYLON.Vector3(0, wallHeight / 2, halfGrid * cellSize + wallThickness / 2)
    );
    makeWall(
      'wallW',
      wallThickness,
      wallHeight,
      groundSize,
      new BABYLON.Vector3(-halfGrid * cellSize - wallThickness / 2, wallHeight / 2, 0)
    );
    makeWall(
      'wallE',
      wallThickness,
      wallHeight,
      groundSize,
      new BABYLON.Vector3(halfGrid * cellSize + wallThickness / 2, wallHeight / 2, 0)
    );

    ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');
    scoreText = new BABYLON.GUI.TextBlock();
    scoreText.text = 'Score: 0';
    scoreText.color = 'white';
    scoreText.fontSize = 28;
    scoreText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    scoreText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    scoreText.paddingLeft = 20;
    scoreText.paddingTop = 16;
    ui.addControl(scoreText);

    var gameOverText = new BABYLON.GUI.TextBlock('gameOverText');
    gameOverText.text = 'Game Over\nPress R to Restart';
    gameOverText.color = 'white';
    gameOverText.fontSize = 42;
    gameOverText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    gameOverText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    gameOverText.alpha = 0;
    ui.addControl(gameOverText);
    scene.metadata = { gameOverText: gameOverText };

    var startLen = 3;
    snakeMeshes = [];
    snakeCells = [];

    for (var i = 0; i < startLen; i++) {
      var isHead = i === 0;
      var seg = BABYLON.MeshBuilder.CreateBox('snake_' + i, { size: cellSize * 0.95 }, scene);
      var sm = new BABYLON.StandardMaterial('snakeMat_' + i, scene);
      sm.diffuseColor = isHead ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;
      sm.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
      seg.material = sm;

      // Place head at x=1 and trail to the left so moving +X doesn't collide
      var gx = 1 - i;
      var gz = 0;
      snakeCells.push({ gx: gx, gz: gz });
      seg.position = gridToWorld(gx, gz);
      snakeMeshes.push(seg);
    }

    foodMesh = BABYLON.MeshBuilder.CreateBox('food', { size: cellSize * 0.8 }, scene);
    var fm = new BABYLON.StandardMaterial('foodMat', scene);
    fm.diffuseColor = COLOR_FOOD;
    fm.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    foodMesh.material = fm;
    respawnFood();

    // Input handling: buffer only one change per step and accept upper/lowercase
    window.addEventListener('keydown', function (e) {
      var key = e.key;
      var lk = key.length === 1 ? key.toLowerCase() : key;
      var isControlKey = !!(DIRECTIONS[lk] || DIRECTIONS[key]);
      if (isControlKey) { e.preventDefault(); }
      if (gameOver && (key === 'r' || key === 'R')) {
        restartGame();
        return;
      }
      var dir = DIRECTIONS[lk] || DIRECTIONS[key];
      if (!dir) return;

      // If a direction is already buffered for this step, ignore subsequent presses
      if (bufferedDirection) return;
      var tryingReverse = (dir.x === -currentDirection.x && dir.z === -currentDirection.z);
      if (tryingReverse) return;

      bufferedDirection = { x: dir.x, z: dir.z };
    });

    return scene;
  }

  function step() {
    if (gameOver) return;

    if (bufferedDirection) {
      currentDirection = bufferedDirection;
      bufferedDirection = null;
    }

    var head = snakeCells[0];
    var newHead = {
      gx: head.gx + currentDirection.x,
      gz: head.gz + currentDirection.z
    };

    if (!isInsideBounds(newHead.gx, newHead.gz)) {
      return endGame();
    }

    for (var i = 0; i < snakeCells.length; i++) {
      if (snakeCells[i].gx === newHead.gx && snakeCells[i].gz === newHead.gz) {
        return endGame();
      }
    }

    var ateFood = (foodMesh.metadata && foodMesh.metadata.gx === newHead.gx && foodMesh.metadata.gz === newHead.gz);

    snakeCells.unshift(newHead);

    if (!ateFood) {
      snakeCells.pop();
      var tailMesh = snakeMeshes.pop();
      snakeMeshes.unshift(tailMesh);
    } else {
      score += 1;
      updateScore();
      var newSeg = BABYLON.MeshBuilder.CreateBox('snake_' + (snakeMeshes.length), { size: cellSize * 0.95 }, scene);
      var sm = new BABYLON.StandardMaterial('snakeMat_' + (snakeMeshes.length), scene);
      sm.diffuseColor = COLOR_SNAKE_BODY;
      sm.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
      newSeg.material = sm;
      snakeMeshes.unshift(newSeg);
      respawnFood();
    }

    for (var j = 0; j < snakeMeshes.length; j++) {
      var mat = snakeMeshes[j].material;
      mat.diffuseColor = (j === 0) ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;
    }

    for (var k = 0; k < snakeMeshes.length; k++) {
      var cell = snakeCells[k];
      var mesh = snakeMeshes[k];
      var target = gridToWorld(cell.gx, cell.gz);
      mesh.position.copyFrom(target);
    }
  }

  function updateScore() {
    scoreText.text = 'Score: ' + score;
  }

  function endGame() {
    gameOver = true;
    var got = scene.metadata.gameOverText;
    got.alpha = 1;

    snakeMeshes.forEach(function (m) {
      m.material.alpha = 0.6;
    });
    foodMesh.material.alpha = 0.6;
  }

  function restartGame() {
    snakeMeshes.forEach(function (m) { m.dispose(); });
    snakeMeshes = [];
    snakeCells = [];
    currentDirection = { x: 1, z: 0 };
    bufferedDirection = null;
    score = 0;
    updateScore();
    gameOver = false;

    var startLen = 3;
    for (var i = 0; i < startLen; i++) {
      var isHead = i === 0;
      var seg = BABYLON.MeshBuilder.CreateBox('snake_' + i, { size: cellSize * 0.95 }, scene);
      var sm = new BABYLON.StandardMaterial('snakeMat_' + i, scene);
      sm.diffuseColor = isHead ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;
      sm.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
      seg.material = sm;

      // Place head at x=1 and trail to the left so moving +X doesn't collide
      var gx = 1 - i;
      var gz = 0;
      snakeCells.push({ gx: gx, gz: gz });
      seg.position = gridToWorld(gx, gz);
      snakeMeshes.push(seg);
    }

    foodMesh.material.alpha = 1;
    snakeMeshes.forEach(function (m) { m.material.alpha = 1; });
    respawnFood();

    scene.metadata.gameOverText.alpha = 0;
  }

  scene = createScene();

  engine.runRenderLoop(function () {
    var dt = scene.getEngine().getDeltaTime();
    if (!gameOver) {
      stepAccumulator += dt;
      while (stepAccumulator >= stepIntervalMs) {
        step();
        stepAccumulator -= stepIntervalMs;
      }
    }
    scene.render();
  });

  window.addEventListener('resize', function () {
    engine.resize();
  });
})();


