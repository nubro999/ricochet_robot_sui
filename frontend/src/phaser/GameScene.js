import Phaser from 'phaser';
import { hasWall, ROBOT_COLORS } from '../helpers/gameHelpers';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.gameState = null;
    this.simulatedPositions = [];
    this.paths = [];
    this.selectedRobot = 0;
    this.cellSize = 43.75; // 700 / 16 = 43.75
    this.boardOffsetX = 0;
    this.boardOffsetY = 0;
    this.onCellClickCallback = null;
    this.onRobotSelectCallback = null;
  }

  preload() {
    // No assets to preload
  }

  create() {
    // Create graphics for drawing
    this.boardGraphics = this.add.graphics();
    this.pathGraphics = this.add.graphics();
    this.highlightGraphics = this.add.graphics();

    // Create text objects container
    this.robotTexts = [];
    this.targetText = null;

    // Enable input
    this.input.on('pointerdown', (pointer) => {
      this.handleClick(pointer.x, pointer.y);
    });

    // Initial render flag
    this.needsRender = true;
  }

  update() {
    if (this.needsRender) {
      this.render();
      this.needsRender = false;
    }
  }

  setGameData(gameState, simulatedPositions, paths, selectedRobot) {
    this.gameState = gameState;
    this.simulatedPositions = simulatedPositions;
    this.paths = paths;
    this.selectedRobot = selectedRobot;
    this.needsRender = true;
  }

  setCallbacks(onCellClick, onRobotSelect) {
    this.onCellClickCallback = onCellClick;
    this.onRobotSelectCallback = onRobotSelect;
  }

  handleClick(x, y) {
    if (!this.gameState) return;

    const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
    const row = Math.floor((y - this.boardOffsetY) / this.cellSize);

    if (row < 0 || row >= this.gameState.mapSize || col < 0 || col >= this.gameState.mapSize) {
      return;
    }

    const cellIndex = row * this.gameState.mapSize + col;

    // Check if clicked on a robot
    const clickedRobotIdx = this.simulatedPositions.findIndex(pos => pos === cellIndex);
    if (clickedRobotIdx !== -1 && this.onRobotSelectCallback) {
      this.onRobotSelectCallback(clickedRobotIdx);
    } else if (this.onCellClickCallback) {
      this.onCellClickCallback(cellIndex);
    }
  }

  render() {
    if (!this.gameState || !this.boardGraphics) return;

    this.boardGraphics.clear();
    this.pathGraphics.clear();
    this.highlightGraphics.clear();

    // Clear old texts
    if (this.robotTexts) {
      this.robotTexts.forEach(text => {
        if (text && text.destroy) text.destroy();
      });
    }
    this.robotTexts = [];
    if (this.targetText && this.targetText.destroy) {
      this.targetText.destroy();
      this.targetText = null;
    }

    const { mapSize, walls, robotPositions, targetPosition, targetRobot } = this.gameState;

    // Draw path traces
    this.drawPaths();

    // Draw cells
    for (let row = 0; row < mapSize; row++) {
      for (let col = 0; col < mapSize; col++) {
        const cellIndex = row * mapSize + col;
        const x = this.boardOffsetX + col * this.cellSize;
        const y = this.boardOffsetY + row * this.cellSize;

        // Check if center square
        const isCenterSquare = row >= 6 && row <= 9 && col >= 6 && col <= 9;

        // Draw cell background
        this.boardGraphics.fillStyle(isCenterSquare ? 0x000000 : 0xffffff, isCenterSquare ? 0.8 : 0.2);
        this.boardGraphics.fillRect(x, y, this.cellSize, this.cellSize);

        // Draw cell border
        this.boardGraphics.lineStyle(1, 0xe8e8e8, 0.5);
        this.boardGraphics.strokeRect(x, y, this.cellSize, this.cellSize);

        // Draw walls
        const wallBits = walls[cellIndex] || 0;
        this.boardGraphics.lineStyle(4, 0x000000, 1);

        if (hasWall(wallBits, 'N')) {
          this.boardGraphics.lineBetween(x, y, x + this.cellSize, y);
        }
        if (hasWall(wallBits, 'S')) {
          this.boardGraphics.lineBetween(x, y + this.cellSize, x + this.cellSize, y + this.cellSize);
        }
        if (hasWall(wallBits, 'W')) {
          this.boardGraphics.lineBetween(x, y, x, y + this.cellSize);
        }
        if (hasWall(wallBits, 'E')) {
          this.boardGraphics.lineBetween(x + this.cellSize, y, x + this.cellSize, y + this.cellSize);
        }

        // Draw original robot positions (ghost)
        const origRobotIdx = robotPositions.findIndex(pos => pos === cellIndex);
        if (origRobotIdx !== -1 && robotPositions[origRobotIdx] !== this.simulatedPositions[origRobotIdx]) {
          const colors = [0xff4444, 0x22cc22, 0x4444ff, 0xffcc00];
          this.boardGraphics.lineStyle(2, colors[origRobotIdx], 0.3);
          this.boardGraphics.strokeCircle(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize / 3);
        }

        // Draw current robot positions
        const simRobotIdx = this.simulatedPositions.findIndex(pos => pos === cellIndex);
        if (simRobotIdx !== -1) {
          const colors = [0xff4444, 0x22cc22, 0x4444ff, 0xffcc00];

          // Highlight selected robot
          if (simRobotIdx === this.selectedRobot) {
            this.highlightGraphics.fillStyle(0x667eea, 0.4);
            this.highlightGraphics.fillRect(x, y, this.cellSize, this.cellSize);
          }

          // Draw robot circle
          this.boardGraphics.fillStyle(colors[simRobotIdx], 1);
          this.boardGraphics.fillCircle(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize / 3);

          // Add robot emoji text
          const robotText = this.add.text(
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            ROBOT_COLORS[simRobotIdx],
            {
              fontSize: '24px',
              align: 'center'
            }
          );
          robotText.setOrigin(0.5);
          this.robotTexts.push(robotText);
        }

        // Draw target
        if (targetPosition === cellIndex && !isCenterSquare) {
          this.boardGraphics.fillStyle(0xFFD700, 0.6);
          this.boardGraphics.fillRect(x, y, this.cellSize, this.cellSize);

          this.targetText = this.add.text(
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            ROBOT_COLORS[targetRobot] + '⭐',
            {
              fontSize: '20px',
              align: 'center'
            }
          );
          this.targetText.setOrigin(0.5);
        }
      }
    }
  }

  drawPaths() {
    if (!this.paths || this.paths.length === 0) return;

    const colors = [0xff4444, 0x22cc22, 0x4444ff, 0xffcc00];

    this.paths.forEach(path => {
      const color = colors[path.robotIdx];
      const isVertical = path.direction === 8 || path.direction === 2;

      this.pathGraphics.lineStyle(2, color, 0.5);

      for (let i = 0; i < path.positions.length - 1; i++) {
        const pos1 = path.positions[i];
        const pos2 = path.positions[i + 1];

        const row1 = Math.floor(pos1 / this.gameState.mapSize);
        const col1 = pos1 % this.gameState.mapSize;
        const row2 = Math.floor(pos2 / this.gameState.mapSize);
        const col2 = pos2 % this.gameState.mapSize;

        const x1 = this.boardOffsetX + col1 * this.cellSize + this.cellSize / 2;
        const y1 = this.boardOffsetY + row1 * this.cellSize + this.cellSize / 2;
        const x2 = this.boardOffsetX + col2 * this.cellSize + this.cellSize / 2;
        const y2 = this.boardOffsetY + row2 * this.cellSize + this.cellSize / 2;

        // Draw dotted line
        const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const steps = Math.floor(distance / 5);

        for (let j = 0; j < steps; j += 2) {
          const t1 = j / steps;
          const t2 = Math.min((j + 1) / steps, 1);
          const segX1 = x1 + (x2 - x1) * t1;
          const segY1 = y1 + (y2 - y1) * t1;
          const segX2 = x1 + (x2 - x1) * t2;
          const segY2 = y1 + (y2 - y1) * t2;

          this.pathGraphics.lineBetween(segX1, segY1, segX2, segY2);
        }
      }
    });
  }
}
