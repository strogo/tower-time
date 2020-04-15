"use strict";

window.addEventListener("load", init, false);

var tt;
var tutorial;
var scores;

function init() {
  tt = new Game();
  tutorial = new Tutorial();
  scores = new Scores();
  window.setTimeout(animate, 100);
}

function animate() {
  tt.run();
  window.requestAnimationFrame(animate);
}

class Game {
  constructor() {
    // game objects
    this.grid = [];
    this.towers = [];
    this.attacks = [];

    // creep management
    this.creeps = [];
    this.stages = {};

    // game stats
    this.lives = 20;
    this.bits = 200;
    this.score = 0;
    this.wave = 0;
    this.gameOver = false;

    // increase difficulty
    this.multiplier = 1;
    this.creepHealth = this.wave * 400 * this.multiplier;

    // canvas handlers
    this.canvas = document.querySelector("#game-canvas");
    this.canvas.addEventListener(
      "mousemove",
      this.handleCanvasMouseMoved,
      false
    );
    this.canvas.addEventListener(
      "mouseover",
      this.handleCanvasMouseOver,
      false
    );
    this.canvas.addEventListener("mouseout", this.handleCanvasMouseOut, false);
    this.canvas.addEventListener("click", this.handleCanvasMouseClicked, false);
    this.canvas.addEventListener(
      "dblclick",
      this.handleCanvasMouseDoubleClicked,
      false
    );
    this.context = this.canvas.getContext("2d");

    // init
    this.handleGameStart();
    this.gameStarted = false;

    // music
    // this.handleSoundButton();
    // this.muted = false;

    // auto send waves
    this.handleAutoWaveButton();
    this.autoWave = false;
    this.sendingWave = false;

    // grid specs
    this.numBlocks = 40;
    this.cellSize = this.mobile ? 20 : 40;
    this.numCols = 20;
    this.numRows = 13;
    this.start = null;
    this.goal = null;

    // load buttons
    this.waveButton = document.querySelector("#wave-button");
    this.tileDivs = this.createTiles();
    this.handleTileCallbacks(this.tileDivs);
    this.handleStartClick();
    this.handleEditClicks();
    this.handleKeyCallbacks();

    // Dijkstra's
    this.validated = false;
    this.loadGrid();
    this.loadPaths();

    // track towers
    this.placingTower = false;
    this.selectedTower = null;
    this.towersArr = [];

    // show tower tile info
    this.showTowerStats = false;

    // anti-cheat
    this.cr = 220;
    this.c = 0;
    this.f;
  }

  handleStartClick() {
    this.waveButton.addEventListener("click", this.startClick, false);
  }

  startClick() {
    tt.wave += 1;
    if (tt.wave === 1) {
      this.innerText = "Next Wave";
      document.querySelector("#towers").classList.remove("active");
      tutorial.showInfo("start");
    }
    tt.nextWave();
  }

  nextWave() {
    tt.cr -= tt.bits;
    tt.bits = Math.ceil(tt.bits / 5) * 5;
    tt.cr += tt.bits;
    if (tt.wave % 10 === 0) {
      tt.multiplier += 0.5;
    }
    if (tt.wave % 30 === 0) {
      tt.multiplier += 0.5;
    }
    tt.creepHealth = tt.wave * 400 * tt.multiplier;
    tt.bits += 5 * tt.wave;
    tt.cr += 5 * tt.wave;
    tt.loadCreeps(20);
  }

  handleKeyCallbacks() {
    document.addEventListener("keydown", (event) => {
      if (event.keyCode === 27) {
        tt.placingTower = false;
        if (tt.selectedTower) {
          tt.selectedTower.selected = false;
          tt.selectedTower = null;
        }
        if (tt.towers.length && !tt.towers[tt.towers.length - 1].placed) {
          tt.towers.splice(tt.towers.length - 1, 1);
        }
      } else if (event.keyCode === 49) {
        this.towerKey(0);
      } else if (event.keyCode === 50) {
        this.towerKey(1);
      } else if (event.keyCode === 51) {
        this.towerKey(2);
      } else if (event.keyCode === 52) {
        this.towerKey(3);
      } else if (event.keyCode === 83) {
        this.sellClick();
      } else if (event.keyCode === 81) {
        this.upgradeClick();
      }
    });
  }

  towerKey(towerNum) {
    tt.placingTower = false;
    const towers = tt.towers;
    if (towers.length && !towers[towers.length - 1].placed) {
      towers.splice(towers.length - 1, 1);
    }
    this.tileDivs[towerNum].click();
    const currentTower = towers[towers.length - 1];
    if (currentTower.location.x === 0 && currentTower.location.y === 0) {
      currentTower.location = new Vector(tt.canvas.mouseX, tt.canvas.mouseY);
    }
    currentTower.visible = true;
  }

  // handleSoundButton() {
  //   const muteButton = document.querySelector("#mute-button");
  //   muteButton.addEventListener("click", this.audioToggle, false);
  // }

  // audioToggle() {
  //   if (tt.muted) {
  //     this.classList.add("mute-off");
  //     this.classList.remove("mute-on");
  //     tt.muted = false;
  //     music.play();
  //   } else {
  //     this.classList.add("mute-on");
  //     this.classList.remove("mute-off");
  //     tt.muted = true;
  //     music.stop();
  //   }
  // }

  handleAutoWaveButton() {
    const autoWave = document.querySelector("input[name=auto-wave]");
    autoWave.addEventListener("change", this.autoWaveToggle, false);
  }

  autoWaveToggle() {
    if (this.checked) {
      tt.autoWave = true;
    } else {
      tt.autoWave = false;
    }
  }

  handleEditClicks() {
    const upgradeButton = document.querySelector("#upgrade-button");
    const sellButton = document.querySelector("#sell-button");
    upgradeButton.addEventListener("click", this.upgradeClick, false);
    sellButton.addEventListener("click", this.sellClick, false);
  }

  upgradeClick() {
    if (tt.towersArr.length) {
      tt.towersArr.forEach((tower) => {
        if (tower.canUpgrade && tt.bits - tower.upgrade >= 0) {
          tt.bits -= tower.upgrade;
          tt.cr -= tower.upgrade;
          tower.handleUpgrade();
        }
      });
    } else if (tt.selectedTower) {
      const tower = tt.selectedTower;
      if (tower.canUpgrade && tt.bits - tower.upgrade >= 0) {
        tt.bits -= tower.upgrade;
        tt.cr -= tower.upgrade;
        tower.handleUpgrade();
      }
    }
  }

  sellClick() {
    if (tt.towersArr.length) {
      tt.towersArr.forEach((tower) => {
        const gridCol = Math.floor(tower.location.x / tt.cellSize);
        const gridRow = Math.floor(tower.location.y / tt.cellSize);

        const cell = tt.grid[gridCol][gridRow];
        cell.occupied = false;
        tower.removed = true;
        tt.bits += tower.upgrade / 2;
        tt.cr += tower.upgrade / 2;
      });

      tt.selectedTower = null;
      tt.towersArr = [];

      tt.loadPaths();
      for (let c = 0; c < tt.numCols; c++) {
        for (let r = 0; r < tt.numRows; r++) {
          tt.grid[c][r].loadAdjacentCells();
        }
      }
    } else if (tt.selectedTower) {
      const tower = tt.selectedTower;

      const gridCol = Math.floor(tower.location.x / tt.cellSize);
      const gridRow = Math.floor(tower.location.y / tt.cellSize);

      const cell = tt.grid[gridCol][gridRow];
      cell.occupied = false;

      tt.loadPaths();
      for (let c = 0; c < tt.numCols; c++) {
        for (let r = 0; r < tt.numRows; r++) {
          tt.grid[c][r].loadAdjacentCells();
        }
      }

      tower.removed = true;
      tt.selectedTower = null;
      tt.bits += tower.upgrade / 2;
      tt.cr += tower.upgrade / 2;
    }
  }

  handleCanvasMouseMoved(event) {
    this.mouseX = event.offsetX;
    this.mouseY = event.offsetY;
    const towers = tt.towers;
    if (towers.length < 1) return;
    const tower = towers[towers.length - 1];
    if (!tower.placed && tt.placingTower === true) {
      tower.location.x = this.mouseX;
      tower.location.y = this.mouseY;
    }
  }

  handleCanvasMouseOver() {
    if (tt.towers.length < 1) return;
    tt.towers[tt.towers.length - 1].visible = true;
  }

  handleCanvasMouseOut() {
    if (tt.placingTower) {
      tt.placingTower = false;
      tt.towers.splice(tt.towers.length - 1, 1);
    }
  }

  handleCanvasMouseClicked(event) {
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    const gridCol = Math.floor(mouseX / tt.cellSize);
    const gridRow = Math.floor(mouseY / tt.cellSize);

    const cell = tt.grid[gridCol][gridRow];

    if (tt.placingTower) {
      tt.checkTowerPlacement(cell);
    } else {
      for (let i = 0; i < tt.towers.length; i++) {
        let tower = tt.towers[i];
        if (
          tower.location.x === cell.center.x &&
          tower.location.y === cell.center.y
        ) {
          tower.selected = !tower.selected;
          if (tower.selected) {
            tt.selectedTower = tower;
          }
        } else {
          tower.selected = false;
        }
      }
      tt.towersArr = [];
    }
  }

  checkTowerPlacement(cell) {
    if (!cell.occupied && cell !== tt.goal && cell !== tt.start) {
      cell.occupied = true;
      tt.loadPaths();

      if (this.checkPaths() && this.checkRoute()) {
        tt.placeTower(cell.center);
      } else {
        cell.cancel();
        tt.loadPaths();
      }
    }
  }

  checkPaths() {
    return tt.creeps.every((creep) => {
      const route = [creep.currentCell];
      while (route.length) {
        const currCell = route.pop();
        if (currCell) {
          if (currCell.value === -1) {
            continue;
          } else if (currCell === tt.goal) {
            return true
            break;
          }
          route.push(currCell.smallestAdjacent);
        }
      }
      return false;
    });
  }

  checkRoute() {
    const route = [tt.start];

    while (route.length) {
      const cell = route.pop();
      if (cell.value === -1) {
        continue;
      } else if (cell === tt.goal) {
        return true;
      }
      route.push(cell.smallestAdjacent);
    }

    return false;
  }

  handleCanvasMouseDoubleClicked(event) {
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    const gridCol = Math.floor(mouseX / tt.cellSize);
    const gridRow = Math.floor(mouseY / tt.cellSize);

    const cell = tt.grid[gridCol][gridRow];

    for (let i = 0; i < tt.towers.length; i++) {
      let tower = tt.towers[i];
      if (
        tower.location.x === cell.center.x &&
        tower.location.y === cell.center.y
      ) {
        tt.selectAllTowers(tower.type, tower.upgradeLevel);
        return;
      }
    }
  }

  selectAllTowers(type, level) {
    tt.towersArr = [];
    for (let i = 0; i < tt.towers.length; i++) {
      let tower = tt.towers[i];
      if (tower.type === type && tower.upgradeLevel === level) {
        tt.towersArr.push(tower);
        tower.selected = true;
      }
    }
  }

  createTiles() {
    const tileDivs = [];
    for (let i = 0; i < 4; i++) {
      const tileDiv = document.createElement("div");

      let tileImgPath;
      let boardImgPath;
      let attackImgPath;
      let cost;
      let upgrade;
      let type;
      let range;
      let cooldown;
      let damage;
      let speed;

      if (i === 0) {
        tileImgPath = "images/earth/earth-tower-1.png";
        boardImgPath = "images/earth/earth-tower-1.png";
        attackImgPath = "images/earth/green-tower-atk-1.png";
        cost = 15;
        upgrade = 30;
        type = "earth";
        range = 100;
        cooldown = 1000;
        damage = 30;
        speed = 8;
      } else if (i === 1) {
        tileImgPath = "images/water/blue-tower-1.png";
        boardImgPath = "images/water/blue-tower-1.png";
        attackImgPath = "images/water/blue-tower-atk-1.png";
        cost = 30;
        upgrade = 60;
        type = "water";
        range = 120;
        cooldown = 300;
        damage = 10;
        speed = 1;
      } else if (i === 2) {
        tileImgPath = "images/fire/red-tower-1.png";
        boardImgPath = "images/fire/red-tower-1.png";
        attackImgPath = "images/fire/red-tower-atk-1.png";
        cost = 50;
        upgrade = 100;
        type = "fire";
        range = 100;
        cooldown = 200;
        damage = 20;
        speed = 10;
      } else if (i === 3) {
        tileImgPath = "images/air/yellow-tower-1.png";
        boardImgPath = "images/air/yellow-tower-1.png";
        attackImgPath = "images/air/yellow-tower-atk-1.png";
        cost = 100;
        upgrade = 200;
        type = "air";
        range = 150;
        cooldown = 2000;
        damage = 120;
        speed = 16;
      }

      tileDiv.tileDivImg = new Image();
      tileDiv.tileDivImg.src = boardImgPath;

      tileDiv.tileDivAttackImg = new Image();
      tileDiv.tileDivAttackImg.src = attackImgPath;

      document.querySelector("#towers").appendChild(tileDiv);

      tileDiv.cost = cost;
      tileDiv.upgrade = upgrade;
      tileDiv.id = i;
      tileDiv.type = type;
      tileDiv.range = range;
      tileDiv.cooldown = cooldown;
      tileDiv.damage = damage;
      tileDiv.speed = speed;
      tileDivs.push(tileDiv);

      const tileImg = new Image();
      tileImg.src = tileImgPath;
      tileDiv.appendChild(tileImg);

      const towerName = document.createElement("p");

      if (i === 0) {
        towerName.innerText = "15 ¥";
      } else if (i === 1) {
        towerName.innerText = "30 ¥";
      } else if (i === 2) {
        towerName.innerText = "50 ¥";
      } else if (i === 3) {
        towerName.innerText = "100 ¥";
      }

      tileDiv.appendChild(towerName);
    }
    return tileDivs;
  }

  handleTileCallbacks(tiles) {
    for (let i = 0; i < tiles.length; i++) {
      const tileDiv = tiles[i];
      tileDiv.addEventListener("mouseover", this.tileRollOver, false);
      tileDiv.addEventListener("mouseout", this.tileRollOut, false);
      tileDiv.addEventListener("click", this.tileClicked, false);
    }
  }

  tileRollOver() {
    if (tt.selectedTower) {
      tt.selectedTower.selected = false;
      tt.selectedTower = null;
    }

    this.showTowerStats = true;
    let towerInfoTiles = document.querySelectorAll(
      "#tower-details > .detail-tile"
    );
    for (let i = 0; i < towerInfoTiles.length; i++) {
      const info = towerInfoTiles[i];
      const value = document.createElement("p");
      value.style.fontSize = "10pt";

      if (info.innerHTML.includes("Type")) {
        info.innerHTML = "<h5>Type</h5>";
        value.innerHTML = this.type;
      } else if (info.innerHTML.includes("Range")) {
        info.innerHTML = "<h5>Range</h5>";
        value.innerHTML = this.range;
      } else if (info.innerHTML.includes("Damage")) {
        info.innerHTML = "<h5>Damage</h5>";
        value.innerHTML = this.damage;
      } else if (info.innerHTML.includes("Cooldown")) {
        info.innerHTML = "<h5>Cooldown</h5>";
        value.innerHTML = this.cooldown;
      } else if (info.innerHTML.includes("Next")) {
        info.innerHTML = "<h5>Next</h5>";
        value.innerHTML = this.upgrade + " ¥";
      }

      info.appendChild(value);
    }
  }

  tileRollOut() {
    this.showTowerStats = false;
  }

  tileClicked() {
    if (tt.placingTower === true) {
      if (!tt.towers[tt.towers.length - 1].placed) {
        tt.towers.splice(tt.towers.length - 1, 1);
      }
    }
    if (tt.bits >= this.cost) {
      tt.createTower(this);
      tt.currentTileDiv = this;
      tt.placingTower = true;
      if (tt.selectedTower) {
        tt.selectedTower.selected = false;
        tt.selectedTower = null;
      }
    } else {
      const bank = document.querySelector("#info-bits");
      if (!bank.classList.contains("flashing")) {
        bank.classList.add("flashing");
        setTimeout(() => {
          bank.classList.remove("flashing");
        }, 1000);
      }
    }
  }

  createTower(tileDiv) {
    const tower = new Tower(
      tileDiv.cost,
      tileDiv.upgrade,
      tileDiv.tileDivImg,
      tileDiv.tileDivAttackImg,
      tileDiv.type,
      tileDiv.range,
      tileDiv.damage,
      tileDiv.cooldown,
      tileDiv.speed
    );
    this.towers.push(tower);
  }

  placeTower(location) {
    const tower = tt.towers[tt.towers.length - 1];
    tower.location = new Vector(location.x, location.y);
    this.bits -= tower.cost;
    this.cr -= tower.cost;
    tower.placed = true;
    tt.placingTower = false;
  }

  updateInfo() {
    let infoTiles = document.querySelectorAll("#info > .info-tile");
    for (let i = 0; i < infoTiles.length; i++) {
      let info = infoTiles[i];
      const value = document.createElement("p");
      value.style.fontSize = "10pt";

      if (info.innerHTML.indexOf("Bank") != -1) {
        info.innerHTML = "<h4>Bank</h4> <br/>";
        value.innerHTML = this.bits + "	¥";
      } else if (info.innerHTML.indexOf("Lives") != -1) {
        info.innerHTML = "<h4>Lives</h4> <br/>";
        value.innerHTML = this.lives;
      } else if (info.innerHTML.indexOf("Score") != -1) {
        info.innerHTML = "<h4>Score</h4> <br/>";
        value.innerHTML = this.score;
      } else if (info.innerHTML.indexOf("Wave") != -1) {
        info.innerHTML = "<h4>Wave</h4> <br/>";
        value.innerHTML = this.wave;
      } else if (info.innerHTML.indexOf("Enemy") != -1) {
        info.innerHTML = "<h4>Enemy</h4> <br/>";
        value.innerHTML = this.creepHealth;
      }
      info.appendChild(value);
    }
  }

  showTowerInfo() {
    let towerInfoTiles = document
      .querySelector("#tower-details")
      .getElementsByClassName("detail-tile");
    let towerEditButtons = document
      .querySelector("#edit-tower-buttons")
      .getElementsByClassName("edit-button");
    if (tt.selectedTower) {
      towerEditButtons[0].style.opacity = 100;
      towerEditButtons[1].style.opacity = 100;
      for (let i = 0; i < towerInfoTiles.length; i++) {
        let info = towerInfoTiles[i];

        if (info.innerHTML.indexOf("Type") != -1) {
          info.innerHTML = "<h5>Type</h5>";
          const value = document.createElement("p");
          value.style.fontSize = "10pt";
          value.innerHTML = tt.selectedTower.type;
          info.appendChild(value);
        } else if (info.innerHTML.indexOf("Range") != -1) {
          info.innerHTML = "<h5>Range</h5>";
          const value = document.createElement("p");
          value.style.fontSize = "10pt";
          value.innerHTML = tt.selectedTower.range;
          info.appendChild(value);
        } else if (info.innerHTML.indexOf("Damage") != -1) {
          info.innerHTML = "<h5>Damage</h5>";
          const value = document.createElement("p");
          value.style.fontSize = "10pt";
          value.innerHTML = tt.selectedTower.damage;
          info.appendChild(value);
        } else if (info.innerHTML.indexOf("Cooldown") != -1) {
          info.innerHTML = "<h5>Cooldown</h5>";
          const value = document.createElement("p");
          value.style.fontSize = "10pt";
          value.innerHTML = tt.selectedTower.cooldown;
          info.appendChild(value);
        } else if (info.innerHTML.indexOf("Next") != -1) {
          info.innerHTML = "<h5>Next</h5>";
          const value = document.createElement("p");
          value.style.fontSize = "10pt";
          if (tt.selectedTower.canUpgrade) {
            value.innerHTML = tt.selectedTower.upgrade + " ¥";
          } else {
            value.innerHTML = "Max";
          }
          info.appendChild(value);
        }
        if (!tt.selectedTower.canUpgrade) {
          towerEditButtons[0].style.opacity = 0;
        }
      }
    } else {
      towerEditButtons[0].style.opacity = 0;
      towerEditButtons[1].style.opacity = 0;
    }
  }

  loadGrid() {
    let id = 0;

    for (let c = 0; c < this.numCols; c++) {
      this.grid.push([]);
      for (let r = 0; r < this.numRows; r++) {
        this.grid[c].push(
          new Cell(this.grid, this.cellSize, this.context, id++, c, r)
        );
      }
    }
    this.initPosts();
    this.initBlocks();
  }

  initPosts() {
    this.start = this.grid[Math.floor(Math.random() * 1) + 1][
      Math.floor(Math.random() * 10) + 1
    ];
    this.goal = this.grid[Math.floor(Math.random() * 5) + 15][
      Math.floor(Math.random() * 12) + 1
    ];
    this.start.static = true;
    this.goal.static = true;
    this.goal.value = 0;
  }

  initBlocks() {
    this.setBlocks();
    for (let i = 0; i < this.numBlocks; i++) {
      const randRow = Math.floor(Math.random() * 20);
      const randCol = Math.floor(Math.random() * 13);
      const cell = this.grid[randRow][randCol];
      if (cell !== this.start && cell !== this.goal) {
        const rock = new Image();
        rock.src = `/images/rocks/rock-${Math.ceil(Math.random() * 3)}.png`;
        cell.occupied = true;
        cell.static = true;
        cell.img = rock;
        cell.angle = Math.random();
      } else {
        i--;
      }
    }
  }

  setBlocks() {
    const wallImg = new Image();
    wallImg.src = "/images/tower-wall-filled.png";

    for (let c = 0; c < this.numCols; c++) {
      for (let r = 0; r < this.numRows; r++) {
        const cell = this.grid[c][r];
        cell.occupied = false;
        cell.static = false;
        cell.img = wallImg;
        cell.angle = 0;
      }
    }
  }

  loadPaths() {
    this.grid.forEach((col) => {
      col.forEach((cell) => {
        if (cell !== this.goal) {
          cell.value = -1;
          cell.adjacent = [];
        }
      });
    });
    for (let c = 0; c < this.numCols; c++) {
      for (let r = 0; r < this.numRows; r++) {
        this.grid[c][r].loadAdjacentCells();
      }
    }
    const checkCells = [this.goal];
    while (checkCells.length) {
      const current = checkCells.shift();
      for (let i = 0; i < current.adjacent.length; i++) {
        const cell = current.adjacent[i];
        if (cell.value === -1) {
          checkCells.push(cell);
          cell.value = current.value + 1;
        }
      }
    }
    for (let col = 0; col < this.grid.length; col++) {
      for (let row = 0; row < this.grid[col].length; row++) {
        if (!this.grid[col][row].occupied) {
          this.grid[col][row].getShortestRoute();
        }
      }
    }
    if (!this.validated) {
      this.ensureValidMap();
    }
  }

  ensureValidMap() {
    let checkBlock = false;

    for (let c = 0; c < this.numCols; c++) {
      for (let r = 0; r < this.numRows; r++)
        if (this.grid[c][r].value === -1 && !this.grid[c][r].occupied) {
          checkBlock = true;
        }
    }

    if (checkBlock) {
      this.initBlocks();
      this.loadPaths();
    } else {
      this.validated = true;
    }
  }

  loadCreeps(numCreeps) {
    const creeps = [];
    for (let i = 0; i < numCreeps; i++) {
      const location = this.start.center.copy();
      const creep = new Creep(location, this.multiplier);
      creeps.push(creep);
    }
    this.stages[this.wave] = [creeps, new Date() - 1500];
  }

  sendCreeps() {
    for (const wave in this.stages) {
      const creeps = this.stages[wave][0];
      if (creeps.length) {
        const curr = new Date();
        const lastSent = this.stages[wave][1];
        if (curr - lastSent > 1500) {
          tt.creeps.push(creeps.shift());
          this.stages[wave][1] = curr;
        }
      } else {
        delete this.stages[wave];
      }
    }
  }

  checkHit(attack) {
    const gridCol = Math.floor(attack.location.x / tt.cellSize);
    const gridRow = Math.floor(attack.location.y / tt.cellSize);
    if (tt.grid[gridCol] && tt.grid[gridCol][gridRow]) {
      const cell = tt.grid[gridCol][gridRow];
      cell.attack(attack.damage, attack.type === "water");
      for (let j = 0; j < this.creeps.length; j++) {
        if (cell === this.creeps[j].currentCell) {
          if (attack.type !== "Air") {
            attack.hit = true;
          }
        }
      }
    }
  }

  checkWave() {
    if (tt.autoWave && !tt.sendingWave && !tt.creeps.length) {
      tt.waveButton.click();
      tt.sendingWave = true;
      setTimeout(() => {
        tt.sendingWave = false;
      }, 1000);
    }
    if (!tt.creeps.length && !tt.sendingWave && tt.wave > 0) {
      tt.waveButton.classList.add("active");
    } else {
      tt.waveButton.classList.remove("active");
    }
    if (tt.wave === 0 && tt.bits < 50) {
      document.querySelector("#towers").classList.remove("active");
      document.querySelector("#info-bits").classList.remove("active");
      tt.waveButton.classList.add("active");
      tutorial.showInfo("canvas");
    }
  }

  checkStats() {
    if (this.cr !== this.lives + this.score + this.bits + this.c) {
      console.log("oh so you think you're clever");
      this.score = 0;
      this.bits = 0;
      this.lives = 1;
      this.cr = this.lives + this.score + this.bits + this.c;
    }
  }

  handleGameStart() {
    const towerEditButtons = document.querySelectorAll(
      "#edit-tower-buttons > .edit-button"
    );
    towerEditButtons[0].style.opacity = 0;
    towerEditButtons[1].style.opacity = 0;
    this.context.textAlign = "center";
    const title = new Image();
    title.src = "images/splash/tower-time-title.png";
    title.onload = () =>
      this.context.drawImage(
        title,
        this.canvas.width / 2 - title.width / 2,
        30
      );
    this.addPlayButton();
    this.context.font = "27px Trebuchet MS";
    this.context.fillStyle = "#333";
    this.context.font = "18px Trebuchet MS";
    this.context.fillStyle = "rgba(68, 74, 110, 1)";
    this.context.font = "25px Trebuchet MS";
    this.context.fillStyle = "#333";
    this.context.fillText("Tower Abilities", 400, 340);
    this.context.font = "15px Trebuchet MS";
    this.context.fillStyle = "rgba(68, 74, 110, 1)";
    this.context.fillText(
      "Earth: None     Water: Slows Enemies     Fire: Fast Attack     Air: Through Attack",
      400,
      370
    );
    this.context.font = "25px Trebuchet MS";
    this.context.fillStyle = "#333";
    this.context.fillText("Optional Hotkeys", 400, 425);
    this.context.font = "15px Trebuchet MS";
    this.context.fillStyle = "rgba(68, 74, 110, 1)";
    this.context.fillText(
      "Earth: 1    Water: 2    Fire: 3    Air: 4    Upgrade: Q    Sell: S    Deselect: Esc",
      400,
      455
    );
    this.context.fillText("hover over anything to get tooltips", 400, 500);
  }

  addPlayButton() {
    const playButton = document.querySelector("#play-button");
    playButton.style.backgroundImage =
      "url('../images/splash/play-button.png')";
    playButton.addEventListener("mouseover", () => {
      playButton.style.backgroundImage =
        "url('../images/splash/play-button-hover.png')";
    });
    playButton.addEventListener("mouseout", () => {
      playButton.style.backgroundImage =
        "url('../images/splash/play-button.png')";
    });
    playButton.addEventListener("mousedown", () => {
      playButton.style.backgroundImage =
        "url('../images/splash/play-button-pressed.png')";
    });
    playButton.addEventListener("mouseup", () => {
      playButton.style.backgroundImage =
        "url('../images/splash/play-button-hover.png')";
    });
    playButton.addEventListener("click", (e) => {
      e.preventDefault();
      playButton.style.backgroundImage =
        "url('../images/splash/play-button-hover.png')";
      setTimeout(() => this.handleStart(playButton), 300);
    });
  }

  handleStart(playButton) {
    playButton.style.display = "none";
    tt.gameStarted = true;
    tt.handleGameStart();
    tt.run();
    document.querySelector("canvas").style.backgroundColor =
      "rgba(187, 186, 186, 0.8)";
    document.querySelector("#towers").classList.add("active");
    document.querySelector("#game-controls").style.opacity = 100;
    document.querySelector("#content-box").style.opacity = 100;
    document.querySelector("#tutorial-window").style.opacity = 100;
  }

  handleGameOver() {
    document.querySelector("#wave-button").style.opacity = 0;
    const highscores = firebase
      .database()
      .ref("scores")
      .orderByChild("score")
      .limitToLast(10);
    setTimeout(() => {
      this.canvas.classList.add("over");
    }, 3000);
    tt.f = tt.score;
    setTimeout(() => {
      const gameOverScreen = document.createElement("div");
      gameOverScreen.classList.add("game-over");
      document
        .querySelector("#canvas-wrapper")
        .replaceChild(gameOverScreen, this.canvas);
      setTimeout(() => {
        gameOverScreen.classList.add("scores");
        setTimeout(() => {
          document.querySelector("#wave-button").style.opacity = 100;
          scores.handleScores(gameOverScreen, highscores);
        }, 500);
      }, 500);
    }, 5000);

    this.context.fillStyle = "rgba(125, 125, 125, 0.7)";
    this.context.fillRect(0, 0, 800, 520);
    this.context.font = "100px Trebuchet MS";
    this.context.fillStyle = "#333";
    this.context.textAlign = "center";
    this.context.fillText("Game Over", 400, 210);
    this.context.font = "40px Trebuchet MS";
    this.context.fillStyle = "#333";
    this.context.textAlign = "center";
    this.context.fillText(`Final Score: ${this.score}`, 400, 280);
    this.context.font = "25px Trebuchet MS";
    this.lives = 0;
    this.gameOver = true;
    const waveButton = document.querySelector("#wave-button");
    waveButton.innerText = "New Game";
    waveButton.addEventListener("click", this.newGame, false);
    waveButton.classList.add("active");
    tutorial.showInfo("game-over");
  }

  newGame() {
    const gameOverScreen = document.querySelector(".game-over");
    const newCanvas = document.createElement("canvas");
    const playButton = document.querySelector("#play-button");
    const waveButton = document.querySelector("#wave-button");
    const towers = document.querySelector("#towers");
    waveButton.removeEventListener("click", tt.newGame, false);
    newCanvas.id = "game-canvas";
    newCanvas.width = 800;
    newCanvas.height = 520;
    document
      .querySelector("#canvas-wrapper")
      .replaceChild(newCanvas, gameOverScreen);
    while (towers.firstChild) {
      towers.removeChild(towers.lastChild);
    }
    waveButton.innerText = "First Wave";
    waveButton.classList.remove("active");
    document.querySelector("#game-controls").style.opacity = 0;
    document.querySelector("#content-box").style.opacity = 0;
    document.querySelector("#tutorial-window").style.opacity = 0;
    playButton.style.display = "";
    tt = new Game();
  }

  
  // stepTimeout() { 
    // TODO maybe
  // }

  run() {
    this.updateInfo();
    this.checkStats();

    if (!this.gameOver && this.gameStarted) {
      this.render();
      this.showTowerInfo();
      this.checkWave();
      this.sendCreeps();
      for (let c = 0; c < this.numCols; c++) {
        for (let r = 0; r < this.numRows; r++) this.grid[c][r].run();
      }
      for (let i = 0; i < this.towers.length; i++) {
        let tower = this.towers[i];
        if (!tower.removed) {
          tower.run();
        } else {
          this.towers.splice(i, 1);
        }
      }
      for (let i = 0; i < this.creeps.length; i++) {
        let creep = this.creeps[i];
        if (creep.alive) {
          creep.run();
        } else {
          this.creeps.splice(i, 1);
        }
      }
      for (let i = 0; i < this.attacks.length; i++) {
        let attack = this.attacks[i];
        this.checkHit(attack);
        if (!attack.hit) {
          attack.run();
        } else {
          this.attacks.splice(i, 1);
        }
      }
      if (this.lives <= 0) {
        setTimeout(this.handleGameOver(), 1000);
      }
    }
  }

  render() {
    this.context.clearRect(0, 0, 800, 520);
  }
}
