import Phaser from 'phaser';
import { hasWall, ROBOT_COLORS } from '../helpers/gameHelpers';

// 8x8 pixel robot patterns - each color has unique design

// Red Robot - Octopus
const RED_ROBOT_PATTERN = [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 0, 1, 1, 1, 1, 0, 1], // Eyes
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 1, 1, 1], // Mouth
    [0, 1, 0, 1, 1, 0, 1, 0], // Tentacle tops
    [0, 1, 0, 1, 1, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0]
];

// Green Robot - Turtle
const GREEN_ROBOT_PATTERN = [
    [0, 0, 0, 1, 1, 0, 0, 0], // Head
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0], // Shell start
    [1, 1, 0, 1, 1, 0, 1, 1], // Shell pattern
    [1, 1, 1, 0, 0, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 0, 0, 1, 1, 0, 0, 1], // Legs
    [0, 0, 0, 0, 0, 0, 0, 0]
];

// Blue Robot - Fish
const BLUE_ROBOT_PATTERN = [
    [0, 0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 1, 1, 1, 1, 1], // Eye
    [1, 1, 1, 1, 1, 1, 1, 1], // Body
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 1, 1, 0, 0], // Tail
    [0, 0, 0, 1, 0, 1, 0, 0]
];

// Yellow Robot - Starfish
const YELLOW_ROBOT_PATTERN = [
    [0, 0, 0, 1, 1, 0, 0, 0], // Top arm
    [0, 0, 1, 1, 1, 1, 0, 0],
    [1, 0, 0, 1, 1, 0, 0, 1], // Side arms
    [1, 1, 1, 0, 0, 1, 1, 1], // Center with eye holes
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0], // Bottom arms
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0, 1, 0, 0]
];

// Treasure patterns for each color
const RED_TREASURE_PATTERN = [
    [0, 0, 1, 1, 1, 1, 0, 0], // Pearl in shell
    [0, 1, 1, 0, 0, 1, 1, 0],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 0, 1, 1, 0, 1, 1], // Pearl center
    [1, 1, 0, 0, 0, 0, 1, 1],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0]
];

const GREEN_TREASURE_PATTERN = [
    [0, 0, 1, 0, 0, 1, 0, 0], // Seaweed/kelp
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 1, 1, 0],
    [1, 1, 1, 0, 0, 0, 1, 1],
    [0, 1, 0, 0, 0, 0, 1, 0]
];

const BLUE_TREASURE_PATTERN = [
    [0, 0, 1, 1, 1, 1, 0, 0], // Treasure chest
    [0, 1, 0, 0, 0, 0, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 1, 1, 0, 0, 1], // Lock
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0]
];

const YELLOW_TREASURE_PATTERN = [
    [0, 0, 0, 1, 1, 0, 0, 0], // Star/gem
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [1, 0, 0, 1, 1, 0, 0, 1], // Diamond center
    [1, 0, 0, 1, 1, 0, 0, 1],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0]
];

const ROBOT_PATTERNS = [RED_ROBOT_PATTERN, GREEN_ROBOT_PATTERN, BLUE_ROBOT_PATTERN, YELLOW_ROBOT_PATTERN];
const TREASURE_PATTERNS = [RED_TREASURE_PATTERN, GREEN_TREASURE_PATTERN, BLUE_TREASURE_PATTERN, YELLOW_TREASURE_PATTERN];

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.gameState = null;
        this.simulatedPositions = [];
        this.paths = [];
        this.selectedRobot = 0;
        this.cellSize = 43.75; // Will be recalculated on resize
        this.boardOffsetX = 0;
        this.boardOffsetY = 0;
        this.onCellClickCallback = null;
        this.onRobotSelectCallback = null;
    }

    resize(width, height) {
        // Recalculate cell size based on current canvas size
        const mapSize = this.gameState ? this.gameState.mapSize : 16;
        const minDimension = Math.min(width, height);
        this.cellSize = minDimension / mapSize;

        // Center the board
        this.boardOffsetX = (width - (mapSize * this.cellSize)) / 2;
        this.boardOffsetY = (height - (mapSize * this.cellSize)) / 2;

        // Trigger re-render
        this.needsRender = true;
    }

    preload() {
        // Load logo image for target
        this.load.image('goal', '/goal.png');
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

        // Listen for scale resize events
        this.scale.on('resize', (gameSize) => {
            this.resize(gameSize.width, gameSize.height);
        });

        // Initial size calculation
        this.resize(this.scale.width, this.scale.height);
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

        // Hide logo initially
        if (this.logoSprite) {
            this.logoSprite.setVisible(false);
        }

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
        const colors = [0xff4444, 0x22cc22, 0x00BFFF, 0xffcc00]; // Red, Green, Bright Blue (Deep Sky Blue), Yellow

        // Draw cells
        for (let row = 0; row < mapSize; row++) {
            for (let col = 0; col < mapSize; col++) {
                const cellIndex = row * mapSize + col;
                const x = this.boardOffsetX + col * this.cellSize;
                const y = this.boardOffsetY + row * this.cellSize;

                // Check if center square
                const isCenterSquare = row >= 6 && row <= 9 && col >= 6 && col <= 9;

                // Draw cell background with new color palette
                this.boardGraphics.fillStyle(isCenterSquare ? 0x31326F : 0x637AB9, isCenterSquare ? 0.9 : 0.15);
                this.boardGraphics.fillRect(x, y, this.cellSize, this.cellSize);

                // Draw cell border with pixel-perfect grid
                this.boardGraphics.lineStyle(2, 0x4FB7B3, 0.3);
                this.boardGraphics.strokeRect(x, y, this.cellSize, this.cellSize);

                // Draw walls with coral-like thick appearance
                const wallBits = walls[cellIndex] || 0;
                const wallThickness = 8;

                // Coral colors - layered effect
                if (hasWall(wallBits, 'N')) {
                    this.drawCoralWall(x, y, x + this.cellSize, y, wallThickness, true);
                }
                if (hasWall(wallBits, 'S')) {
                    this.drawCoralWall(x, y + this.cellSize, x + this.cellSize, y + this.cellSize, wallThickness, true);
                }
                if (hasWall(wallBits, 'W')) {
                    this.drawCoralWall(x, y, x, y + this.cellSize, wallThickness, false);
                }
                if (hasWall(wallBits, 'E')) {
                    this.drawCoralWall(x + this.cellSize, y, x + this.cellSize, y + this.cellSize, wallThickness, false);
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

                    // Highlight selected robot with new color
                    if (simRobotIdx === this.selectedRobot) {
                        this.highlightGraphics.fillStyle(0xA8FBD3, 0.25);
                        this.highlightGraphics.fillRect(x, y, this.cellSize, this.cellSize);
                    }

                    // Draw pixel art robot (Whale pattern)
                    const centerX = x + this.cellSize / 2;
                    const centerY = y + this.cellSize / 2;

                    // Get unique pattern for this robot
                    const robotPattern = ROBOT_PATTERNS[simRobotIdx];

                    // Draw robot with its unique pattern
                    this.boardGraphics.fillStyle(colors[simRobotIdx], 1);

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

                // Draw target (clapping hands logo with colored background)
                if (targetPosition === cellIndex && !isCenterSquare) {
                    // Get target robot color
                    const targetColor = colors[targetRobot];

                    // Draw colored background for goal position
                    this.boardGraphics.fillStyle(targetColor, 0.3);
                    this.boardGraphics.fillRect(x, y, this.cellSize, this.cellSize);

                    // Draw border highlight
                    this.boardGraphics.lineStyle(3, targetColor, 0.8);
                    this.boardGraphics.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);

                    // Draw logo image at target position
                    const centerX = x + this.cellSize / 2;
                    const centerY = y + this.cellSize / 2;
                    const logoSize = this.cellSize * 0.6; // Logo is 60% of cell size

                    if (!this.logoSprite) {
                        this.logoSprite = this.add.image(centerX, centerY, 'goal');
                        this.logoSprite.setDisplaySize(logoSize, logoSize);
                    } else {
                        this.logoSprite.setPosition(centerX, centerY);
                        this.logoSprite.setDisplaySize(logoSize, logoSize);
                        this.logoSprite.setVisible(true);
                    }
                }
            }
        }
    }

    drawCoralWall(x1, y1, x2, y2, thickness, isHorizontal) {
        // Draw thick bright coral wall with solid fill
        const halfThick = thickness / 2;

        if (isHorizontal) {
            // Horizontal wall - bright coral base
            this.boardGraphics.fillStyle(0xB95E82, 1); // Bright coral pink
            this.boardGraphics.fillRect(x1, y1 - halfThick, x2 - x1, thickness);

            // Inner lighter stripe
            this.boardGraphics.fillStyle(0xF39F9F, 1); // Light pink
            this.boardGraphics.fillRect(x1 + 1, y1 - halfThick + 2, x2 - x1 - 2, thickness - 4);
        } else {
            // Vertical wall - bright coral base
            this.boardGraphics.fillStyle(0xB95E82, 1); // Bright coral pink
            this.boardGraphics.fillRect(x1 - halfThick, y1, thickness, y2 - y1);

            // Inner lighter stripe
            this.boardGraphics.fillStyle(0xF39F9F, 1); // Light pink
            this.boardGraphics.fillRect(x1 - halfThick + 2, y1 + 1, thickness - 4, y2 - y1 - 2);
        }

        // Add coral bumps/protrusions
        const length = isHorizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
        const segments = Math.floor(length / 12);

        for (let i = 0; i < segments; i++) {
            const t = (i + 0.5) / segments;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;

            // Coral bumps with varying sizes
            const bumpSize = 4 + Math.sin(i * 2.8) * 2;
            const bumpWidth = 4;

            if (isHorizontal) {
                // Add small dot-like bumps above and below
                this.boardGraphics.fillStyle(0xFFA07A, 1); // Light coral orange
                this.boardGraphics.fillRect(px - 1, py - halfThick - 2, 2, 2); // Small 2x2 dot above

                this.boardGraphics.fillStyle(0xB95E82, 1); // Darker coral
                this.boardGraphics.fillRect(px - 1, py + halfThick, 2, 2); // Small 2x2 dot below
            } else {
                // Add small dot-like bumps left and right
                this.boardGraphics.fillStyle(0xFFA07A, 1); // Light coral orange
                this.boardGraphics.fillRect(px - halfThick - 2, py - 1, 2, 2); // Small 2x2 dot left

                this.boardGraphics.fillStyle(0xB95E82, 1); // Darker coral
                this.boardGraphics.fillRect(px + halfThick, py - 1, 2, 2); // Small 2x2 dot right
            }
        }
    }

    drawPaths() {
        if (!this.paths || this.paths.length === 0) return;

        const colors = [0xff4444, 0x22cc22, 0x00BFFF, 0xffcc00]; // Match robot colors with bright blue

        this.paths.forEach(path => {
            const color = colors[path.robotIdx];

            // Solid line with 6px thickness (3x thicker than original 2px)
            this.pathGraphics.lineStyle(6, color, 0.7);

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

                // Draw solid line
                this.pathGraphics.lineBetween(x1, y1, x2, y2);
            }
        });
    }
}
