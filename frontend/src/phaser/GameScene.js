import Phaser from 'phaser';
import { hasWall, ROBOT_COLORS } from '../helpers/gameHelpers';

// 8x8 픽셀 고래 패턴 정의
const WHALE_PATTERN = [
    [0, 0, 0, 1, 1, 0, 0, 0], // 머리 위 물줄기 (생략)
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0], // 등
    [1, 1, 1, 1, 1, 1, 1, 1], // 몸통
    [1, 1, 1, 1, 1, 1, 1, 0], // 배와 지느러미 시작
    [0, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0, 0, 0], // 꼬리 시작
    [0, 0, 0, 1, 0, 0, 0, 0]  // 꼬리 끝
];

// 8x8 픽셀 보물상자 패턴 정의
const TREASURE_CHEST_PATTERN = [
    [0, 0, 1, 1, 1, 1, 0, 0], // 상자 뚜껑
    [0, 1, 1, 1, 1, 1, 1, 0], // 뚜껑 아래
    [1, 1, 0, 1, 1, 0, 1, 1], // 잠금 장치
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0] // 바닥
];

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

        // **로봇 색상 배열 (ROBOT_COLORS 대신 임시 정의)**
        // 실제 프로젝트에서 ROBOT_COLORS를 가져와야 합니다. 여기서는 하드코딩된 HEX 값을 사용합니다.
        // const colors = ROBOT_COLORS; 
        const colors = [0xff4444, 0x22cc22, 0x4444ff, 0xffcc00]; // Red, Green, Blue, Yellow

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
                    this.boardGraphics.lineStyle(2, colors[origRobotIdx], 0.3);
                    this.boardGraphics.strokeCircle(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize / 3);
                }

                // Draw current robot positions (WHALE)
                const simRobotIdx = this.simulatedPositions.findIndex(pos => pos === cellIndex);
                if (simRobotIdx !== -1) {
                    const pixelSize = this.cellSize / 8;

                    // Highlight selected robot
                    if (simRobotIdx === this.selectedRobot) {
                        this.highlightGraphics.fillStyle(0xffffff, 0.3);
                        this.highlightGraphics.fillRect(x, y, this.cellSize, this.cellSize);
                    }

                    // Draw pixel art robot (Whale pattern)
                    const centerX = x + this.cellSize / 2;
                    const centerY = y + this.cellSize / 2;

                    this.boardGraphics.fillStyle(colors[simRobotIdx], 1);

                    // ⭐ 고래 패턴 적용 ⭐
                    const robotPattern = WHALE_PATTERN;

                    for (let py = 0; py < 8; py++) {
                        for (let px = 0; px < 8; px++) {
                            if (robotPattern[py][px] === 1) {
                                this.boardGraphics.fillRect(
                                    centerX - 4 * pixelSize + px * pixelSize,
                                    centerY - 4 * pixelSize + py * pixelSize,
                                    pixelSize,
                                    pixelSize
                                );
                            }
                        }
                    }
                }

                // Draw target (TREASURE_CHEST, targetRobot 색상)
                if (targetPosition === cellIndex && !isCenterSquare) {
                    const pixelSize = this.cellSize / 8;
                    const centerX = x + this.cellSize / 2;
                    const centerY = y + this.cellSize / 2;

                    // ⭐ 타겟 로봇의 색상 가져오기 ⭐
                    const targetColor = colors[targetRobot];
                    
                    // ⭐ 보물상자 패턴 적용 및 색상 일치 ⭐
                    this.boardGraphics.fillStyle(targetColor, 1);

                    const targetPattern = TREASURE_CHEST_PATTERN;

                    for (let py = 0; py < 8; py++) {
                        for (let px = 0; px < 8; px++) {
                            if (targetPattern[py][px] === 1) {
                                this.boardGraphics.fillRect(
                                    centerX - 4 * pixelSize + px * pixelSize,
                                    centerY - 4 * pixelSize + py * pixelSize,
                                    pixelSize,
                                    pixelSize
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    drawPaths() {
        if (!this.paths || this.paths.length === 0) return;

        const colors = [0xff4444, 0x22cc22, 0x4444ff, 0xffcc00];

        this.paths.forEach(path => {
            const color = colors[path.robotIdx];

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
