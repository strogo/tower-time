"use strict";

class ActionsHandler {
  constructor(tiles) {
    this.handleCanvas();
    this.handleButtonClicks();
    this.handleKeyListeners();
    this.handleTileListeners(tiles);
  }

  handleCanvas() {
    dom.canvas.addEventListener("mousemove", this.handleCanvasMove, false);
    dom.canvas.addEventListener("mouseover", this.handleCanvasOver, false);
    dom.canvas.addEventListener("mouseout", this.handleCanvasOut, false);
    dom.canvas.addEventListener("click", this.handleCanvasClick, false);
    dom.canvas.addEventListener("dblclick", this.handleCanvasDblClick, false);
  }

  handleCanvasMove(event) {
    this.mouseX = event.offsetX;
    this.mouseY = event.offsetY;
    const towers = game.towers;
    if (towers.length < 1) return;
    const tower = towers[towers.length - 1];
    if (!tower.placed && game.placingTower === true) {
      tower.location.x = this.mouseX;
      tower.location.y = this.mouseY;      
    }
  }

  handleCanvasOver() {
    if (game.towers.length < 1) return;
    game.towers[game.towers.length - 1].visible = true;
  }

  handleCanvasOut() {
    if (game.placingTower) {
      game.placingTower = false;
      game.towers.splice(game.towers.length - 1, 1);
    }
  }

  handleCanvasClick(event) {
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    const col = Math.floor(mouseX / game.cellSize);
    const row = Math.floor(mouseY / game.cellSize);

    const cell = game.grid[col][row];

    game.resetSelects();

    if (game.placingTower) {
      game.checkTowerPlacement(cell);
    } else {
      for (let i = 0; i < game.towers.length; i++) {
        let tower = game.towers[i];
        if (
          tower.location.x === cell.center.x &&
          tower.location.y === cell.center.y
        ) {
          if (tower.selected) {
            tower.deselect(true);
          } else {
            tower.select();
          }
        } else {
          tower.selected = false;
        }
      }
    }
  }

  handleCanvasDblClick(event) {
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    const gridCol = Math.floor(mouseX / game.cellSize);
    const gridRow = Math.floor(mouseY / game.cellSize);

    const cell = game.grid[gridCol][gridRow];

    game.resetSelects();

    for (let i = 0; i < game.towers.length; i++) {
      let tower = game.towers[i];
      if (
        tower.location.x === cell.center.x &&
        tower.location.y === cell.center.y
      ) {
        game.selectAllTowers(tower.type, tower.level);
        return;
      }
    }
  }

  handleButtonClicks() {
    dom.wave.addEventListener("click", this.waveClick, false);
    dom.auto.addEventListener("change", this.autoWaveToggle, false);
    dom.upgrade.addEventListener("click", this.upgradeClick, false);
    dom.sell.addEventListener("click", this.sellClick, false);
  }

  autoWaveToggle() {
    if (this.checked) {
      game.autoWave = true;
    } else {
      game.autoWave = false;
    }
  }

  waveClick() {
    if (!game.sendingWave && game.gameStarted && !game.gameOver) {
      game.wave += 1;
      game.sendingWave = true;
      game.waveTimer = 400;
      if (game.wave === 1) {
        dom.waveText.innerText = "Next Wave";
        dom.towerMenu.classList.remove("active");
        tutorial.showInfo("start");
      }
      dom.wave.classList.remove("clickable");
      game.nextWave();
    }
  }

  upgradeClick() {
    game.selectedTowers.forEach((tower) => {
      if (tower.canUpgrade) {
        if (game.bits - tower.upgrade >= 0) {
          game.bits -= tower.upgrade;
          game.cr -= tower.upgrade;
          tower.handleUpgrade();
        } else {
          game.actions.blinkBank();
        }
      }
    });
  }

  sellClick() {
    game.selectedTowers.forEach((tower) => {
      tower.deselect(false);
      game.bits += tower.upgrade / 2;
      game.cr += tower.upgrade / 2;
    });

    game.resetSelects();

    game.loadPaths();
    for (let c = 0; c < game.numCols; c++) {
      for (let r = 0; r < game.numRows; r++) {
        game.grid[c][r].loadAdjacentCells();
      }
    }

    game.path = game.getPath();
  }

  handleKeyListeners() {
    document.addEventListener("keydown", (event) => {
      if (event.keyCode === 27) {
        game.placingTower = false;
        if (game.selectedTowers.length) {
          game.resetSelects();
        }
        if (game.towers.length && !game.towers[game.towers.length - 1].placed) {
          game.towers.splice(game.towers.length - 1, 1);
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
      } else if (event.keyCode === 73) {
        tutorial.toggleTutorial();
      } else if (event.keyCode === 72) {
        tutorial.toggleHotkeys();
      }
    });
  }

  towerKey(towerNum) {
    game.placingTower = false;
    const towers = game.towers;
    if (towers.length && !towers[towers.length - 1].placed) {
      towers.pop();
    }
    game.tileDivs[towerNum].click();
    const currentTower = towers[towers.length - 1];
    if (!currentTower.placed) {
      currentTower.location = new Vector(dom.canvas.mouseX, dom.canvas.mouseY);
    }
    currentTower.visible = true;
  }

  handleTileListeners(tiles) {
    for (let i = 0; i < tiles.length; i++) {
      const tileDiv = tiles[i];
      tileDiv.addEventListener("mouseover", this.tileRollOver, false);
      tileDiv.addEventListener("mouseout", this.tileRollOut, false);
      tileDiv.addEventListener("click", this.tileClicked, false);
    }
  }

  tileRollOver() {
    game.showTowerDivInfo = this;
  }

  tileRollOut() {
    game.showTowerDivInfo = null;
  }

  tileClicked() {
    if (game.placingTower === true) {
      if (!game.towers[game.towers.length - 1].placed) {
        game.towers.splice(game.towers.length - 1, 1);
      }
    }
    if (game.bits >= this.cost) {
      game.createTower(this);
      game.currentTileDiv = this;
      game.placingTower = true;
      if (game.selectedTowers) {
        game.resetSelects();
      }
    } else {
      game.actions.blinkBank();
    }
  }

  blinkBank() {
    const bank = dom.bank;
    if (!bank.classList.contains("flashing")) {
      bank.classList.add("flashing");
      setTimeout(() => {
        bank.classList.remove("flashing");
      }, 1000);
    }
  }

  showTowerInfo() {
    const tower = this.getTower();
    this.toggleEditButtons(tower);
    if (!tower) return;

    let towerInfoTiles = dom.towerStats;

    for (let i = 0; i < towerInfoTiles.length; i++) {
      const title = towerInfoTiles[i];
      const value = document.createElement("p");

      if (i === 0) {
        title.innerHTML = "<h5>Type</h5>";
        value.innerHTML = tower.type.toUpperCase();
      } else if (i === 1) {
        title.innerHTML = "<h5>Damage</h5>";
        value.innerHTML = tower.damage;
      } else if (i === 2) {
        title.innerHTML = "<h5>Range</h5>";
        value.innerHTML = tower.range;
      } else if (i === 3) {
        title.innerHTML = "<h5>Speed</h5>";
        value.innerHTML = 2000 - tower.cooldown;
      } else if (i === 4) {
        title.innerHTML = "<h5>Next</h5>";
        if (tower.canUpgrade || game.showTowerDivInfo) {
          value.innerHTML = tower.upgrade + "¥";
        } else {
          value.innerHTML = "Max";
        }
      }

      title.appendChild(value);
    }
  }

  getTower() {
    return game.showTowerDivInfo
      ? game.showTowerDivInfo
      : game.selectedTowers[game.selectedTowers.length - 1];
  }

  toggleEditButtons(tower) {
    let upChange = dom.upgrade.style.opacity;
    let sellChange = dom.sell.style.opacity;

    if (tower) {
      dom.upgrade.style.opacity = tower.canUpgrade ? 100 : 0;
      dom.sell.style.opacity = tower.placed ? 100 : 0;
    } else {
      dom.upgrade.style.opacity = 0;
      dom.sell.style.opacity = 0;
    }

    if (upChange !== dom.upgrade.style.opacity) {
      dom.upgrade.classList.toggle("clickable");
    }
    if (sellChange !== dom.sell.style.opacity) {
      dom.sell.classList.toggle("clickable");
    }
  }

  updateStats() {
    for (let i = 0; i < dom.infoTiles.length; i++) {
      let title = dom.infoTiles[i];
      const value = document.createElement("p");

      if (title.innerHTML.includes("Bank")) {
        title.innerHTML = "<h4>Bank</h4> <br/>";
        value.innerHTML = game.bits + "¥";
      } else if (title.innerHTML.includes("Lives")) {
        title.innerHTML = "<h4>Lives</h4> <br/>";
        value.innerHTML = game.lives;
      } else if (title.innerHTML.includes("Score")) {
        title.innerHTML = "<h4>Score</h4> <br/>";
        value.innerHTML = game.score;
      } else if (title.innerHTML.includes("Wave")) {
        title.innerHTML = "<h4>Wave</h4> <br/>";
        value.innerHTML = game.wave;
      }
      title.appendChild(value);
    }
  }

  handleGameOver() {
    game.gameOver = true;
    game.context.fillStyle = "rgba(125, 125, 125, 0.6)";
    game.context.fillRect(0, 0, 840, 560);
    dom.gameOver.style.opacity = 100;
    dom.gameOver.style.width = "100%";
    dom.gameOver.style.height = "100%";
    dom.overTitle.style.display = "inline-block";
    const highscores = firebase
      .database()
      .ref("scores")
      .orderByChild("score")
      .limitToLast(10);
    game.f = game.score;
    let score = window.localStorage.getItem("score");
    if ((score && score < game.f) || !score) {
      score = game.f;
      window.localStorage.setItem("score", game.f);
    }
    dom.final.innerHTML = `Final Score: ${game.f}`;
    dom.local.innerHTML = `Local Highest: ${score}`;
    setTimeout(() => {
      dom.holder.style.opacity = 0;
      dom.gameOver.style.top = "15%";
      dom.overTitle.style.color = "rgb(171, 171, 171)";
      dom.terminal.style.display = "flex";
      dom.canvas.style.backgroundColor = "";
      dom.tutorial.style.opacity = 0;
      dom.topBar.style.opacity = 0;
      dom.bottomBar.style.opacity = 0;
      setTimeout(() => {
        dom.terminal.style.opacity = 100;
        scores.handleScores(highscores);
        setTimeout(() => {
          game.context.clearRect(0, 0, 840, 560);
        }, 1000);
      }, 1000);
    }, 1000);
  }

  newGame() {
    dom.gameOver.style.opacity = 0;
    dom.gameOver.style.width = "0px";
    dom.gameOver.style.height = "0px";
    dom.overTitle.style.display = "none";
    dom.terminal.style.display = "none";
    dom.holder.style.opacity = 100;
    dom.footer.style.opacity = 100;
    dom.gameOver.style.top = "40%";
    dom.progress.style.width = "0%";
    dom.terminal.removeChild(dom.terminal.lastChild);
    while (dom.scores.firstChild) {
      dom.scores.removeChild(dom.scores.lastChild);
    }
    while (dom.towerMenu.firstChild) {
      dom.towerMenu.removeChild(dom.towerMenu.lastChild);
    }
    dom.auto.checked = false;
    dom.waveText.innerText = "First Wave";
    dom.wave.classList.remove("active");
    dom.topBar.style.opacity = 0;
    dom.bottomBar.style.opacity = 0;
    dom.play.style.display = "";
    dom.startText.style.display = "flex";
    if (dom.tutorialOpen) {
      tutorial.toggleTutorial();
    }
    if (dom.hotkeysOpen) {
      tutorial.toggleHotkeys();
    }
    game = new Game();
  }
}
