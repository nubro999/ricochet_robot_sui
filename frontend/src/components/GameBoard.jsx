import { hasWall, isInCenterSquare, ROBOT_COLORS } from '../helpers/gameHelpers';

function GameBoard({ gameState, simulatedPositions, paths, selectedRobot, onCellClick, onRobotSelect }) {
  if (!gameState) return null;

  const { mapSize, walls, robotPositions, targetPosition, targetRobot } = gameState;
  const cells = [];

  // Build path map for rendering dotted lines
  const pathCellMap = new Map();

  paths.forEach(path => {
    const isVertical = path.direction === 8 || path.direction === 2;
    const isHorizontal = path.direction === 4 || path.direction === 6;

    path.positions.forEach(pos => {
      if (!pathCellMap.has(pos)) {
        pathCellMap.set(pos, { robotIdx: path.robotIdx, isHorizontal, isVertical });
      }
    });
  });

  for (let i = 0; i < mapSize * mapSize; i++) {
    let className = 'cell';
    let content = '';
    const wallBits = walls[i] || 0;

    // Check if cell is in center 4x4 square
    const row = Math.floor(i / mapSize);
    const col = i % mapSize;
    if (row >= 6 && row <= 9 && col >= 6 && col <= 9) {
      className += ' center-square';
    }

    // Add wall classes
    if (hasWall(wallBits, 'N')) className += ' wall-north';
    if (hasWall(wallBits, 'S')) className += ' wall-south';
    if (hasWall(wallBits, 'W')) className += ' wall-west';
    if (hasWall(wallBits, 'E')) className += ' wall-east';

    // Add path trace with dotted lines
    if (pathCellMap.has(i)) {
      const pathInfo = pathCellMap.get(i);
      if (pathInfo.isHorizontal) {
        className += ` path-trace-horizontal robot${pathInfo.robotIdx}`;
      }
      if (pathInfo.isVertical) {
        className += ` path-trace-vertical robot${pathInfo.robotIdx}`;
      }
    }

    // Show original robot positions as ghost (if they've moved)
    const origRobotIdx = robotPositions.findIndex(pos => pos === i);
    if (origRobotIdx !== -1 && robotPositions[origRobotIdx] !== simulatedPositions[origRobotIdx]) {
      className += ` original-robot robot${origRobotIdx}`;
    }

    // Check for SIMULATED (current) robot positions
    const simRobotIdx = simulatedPositions.findIndex(pos => pos === i);
    if (simRobotIdx !== -1) {
      className += ` robot robot${simRobotIdx}`;
      if (simRobotIdx === selectedRobot) className += ' selected';
      content = ROBOT_COLORS[simRobotIdx];
    } else if (targetPosition === i) {
      className += ' target';
      content = ROBOT_COLORS[targetRobot] + '⭐';
    }

    cells.push(
      <div
        key={i}
        className={className}
        title={`Pos: ${i} (Row ${Math.floor(i / mapSize)}, Col ${i % mapSize})`}
        onClick={() => {
          // Click on simulated position to select robot
          const clickedRobotIdx = simulatedPositions.findIndex(pos => pos === i);
          if (clickedRobotIdx !== -1) {
            onRobotSelect(clickedRobotIdx);
          } else {
            onCellClick(i);
          }
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className="game-board"
      style={{
        gridTemplateColumns: `repeat(${mapSize}, 1fr)`,
        gridTemplateRows: `repeat(${mapSize}, 1fr)`
      }}
    >
      {cells}
    </div>
  );
}

export default GameBoard;
