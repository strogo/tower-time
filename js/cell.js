"use strict";

class Cell {
  constructor(id, grid, size, context, wallImg, selectImg, col, row) {
    this.id = id;
    this.grid = grid;
    this.size = size;
    this.location = new Vector(col * this.size, row * this.size);
    this.center = new Vector(
      this.location.x + this.size / 2,
      this.location.y + this.size / 2
    );
    this.context = context;
    this.col = col;
    this.row = row;

    // * images
    this.wallImg = wallImg;
    this.selectImg = selectImg;
    this.img = this.wallImg;

    // * path finding
    this.adjacent = [];
    this.smallestAdjacent = null;
    this.value = -1;

    // * manage state
    this.static = false;
    this.occupied = false;
    this.attacked = false;
    this.selected = false;

    // * manage attack state
    this.attackDamage = null;
    this.attackSlow = false;
    this.attackTimeout = 0;

    // * show invalid placement
    this.cancelled = false;
    this.cancTimeout = 0;
  }

  loadAdjacentCells() {
    // * up
    if (
      this.row > 0 &&
      !this.occupied &&
      !this.grid[this.col][this.row - 1].occupied
    ) {
      this.adjacent.push(this.grid[this.col][this.row - 1]);
    }
    // * right
    if (
      this.col < this.grid.length - 1 &&
      !this.occupied &&
      !this.grid[this.col + 1][this.row].occupied
    ) {
      this.adjacent.push(this.grid[this.col + 1][this.row]);
    }
    // * down
    if (
      this.row < this.grid[this.col].length - 1 &&
      !this.occupied &&
      !this.grid[this.col][this.row + 1].occupied
    ) {
      this.adjacent.push(this.grid[this.col][this.row + 1]);
    }
    // * left
    if (
      this.col > 0 &&
      !this.occupied &&
      !this.grid[this.col - 1][this.row].occupied
    ) {
      this.adjacent.push(this.grid[this.col - 1][this.row]);
    }
  }

  getShortestRoute() {
    let smallest, idx;
    for (let i = 0; i < this.adjacent.length; i++) {
      if (this.adjacent[i].value < smallest || smallest === undefined) {
        smallest = this.adjacent[i].value;
        idx = i;
      }
    }
    this.smallestAdjacent = this.adjacent[idx];
  }

  attack(damage, slow) {
    this.attacked = true;
    this.attackDamage = damage;
    this.attackSlow = slow;
    this.attackTimeout = 2 + slow;
  }

  cancel() {
    this.occupied = false;
    this.cancelled = true;
    this.cancTimeout = 3;
  }

  timeout() {
    this.cancTimeout--;
    if (this.cancTimeout <= 0) {
      this.cancelled = false;
    }
  }

  run() {
    this.checkAttack();
    this.render();
  }

  checkAttack() {
    if (this.attacked) {
      this.attackTimeout--;
      if (this.attackTimeout <= 0) {
        this.attacked = false;
      }
    }
  }

  render() {
    if (this.static || this.occupied) {
      this.renderImage("img");
      return;
    }

    if (this.cancelled) {
      this.context.fillStyle = "rgba(255, 255, 255, 0.6)";
      this.timeout();
      this.context.fillRect(
        this.location.x,
        this.location.y,
        this.size,
        this.size
      );
    }

    // this.showGridNums(); // * display grid lines and pathing values
  }

  renderImage(img) {
    this.context.save();
    this.context.translate(this.center.x, this.center.y);
    this.context.drawImage(this[img], -this[img].width / 2, -this[img].height / 2);
    this.context.restore();
  }

  showGridNums() {
    this.context.strokeStyle = "#333333";
    this.context.fillStyle = "#333333";
    this.context.lineWidth = 1;
    this.context.strokeRect(
      this.location.x,
      this.location.y,
      this.size,
      this.size
    );
    this.context.fillText(
      this.value,
      this.location.x + 15,
      this.location.y + 15
    );
  }
}
