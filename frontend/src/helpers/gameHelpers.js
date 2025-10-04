// Game logic helper functions

export const WALL_NORTH = 1;
export const WALL_SOUTH = 2;
export const WALL_WEST = 4;
export const WALL_EAST = 8;

export const DIR_UP = 8;
export const DIR_DOWN = 2;
export const DIR_LEFT = 4;
export const DIR_RIGHT = 6;

export const ROBOT_COLORS = ['🔴', '🟢', '🔵', '🟡'];
export const ROBOT_NAMES = ['Red', 'Green', 'Blue', 'Yellow'];

// Check if cell has wall in direction
export const hasWall = (wallBits, direction) => {
  const bit = direction === 'N' ? WALL_NORTH : direction === 'S' ? WALL_SOUTH :
              direction === 'W' ? WALL_WEST : WALL_EAST;
  return (wallBits & bit) !== 0;
};

// Simulate robot movement to get path traces and simulated positions
export const simulateMovePath = (gameState, currentRoute) => {
  if (!gameState || currentRoute.length === 0) {
    return { paths: [], simulatedPositions: [...(gameState?.robotPositions || [])] };
  }

  const { mapSize, walls, robotPositions } = gameState;
  const paths = []; // Array of {robotIdx, startPos, endPos, direction, positions[]}
  let tempPositions = [...robotPositions];

  for (let i = 0; i < currentRoute.length; i += 2) {
    const robotIdx = currentRoute[i];
    const direction = currentRoute[i + 1];

    let currentPos = tempPositions[robotIdx];
    const startPos = currentPos;
    const positions = [];

    // Simulate sliding
    while (true) {
      positions.push(currentPos);

      const row = Math.floor(currentPos / mapSize);
      const col = currentPos % mapSize;
      const wallBits = walls[currentPos] || 0;

      let canMove = false;
      let nextPos = currentPos;

      if (direction === DIR_UP) {
        canMove = row > 0 && !hasWall(wallBits, 'N');
        nextPos = currentPos - mapSize;
      } else if (direction === DIR_DOWN) {
        canMove = row < mapSize - 1 && !hasWall(wallBits, 'S');
        nextPos = currentPos + mapSize;
      } else if (direction === DIR_LEFT) {
        canMove = col > 0 && !hasWall(wallBits, 'W');
        nextPos = currentPos - 1;
      } else if (direction === DIR_RIGHT) {
        canMove = col < mapSize - 1 && !hasWall(wallBits, 'E');
        nextPos = currentPos + 1;
      }

      if (!canMove) break;

      // Check for other robots at current temporary positions
      if (tempPositions.some((pos, idx) => idx !== robotIdx && pos === nextPos)) {
        break;
      }

      currentPos = nextPos;
    }

    paths.push({
      robotIdx,
      startPos,
      endPos: currentPos,
      direction,
      positions
    });

    // Update the robot's position for next iteration
    tempPositions[robotIdx] = currentPos;
  }

  return { paths, simulatedPositions: tempPositions };
};

// Get route display text
export const getRouteDisplay = (currentRoute) => {
  if (currentRoute.length === 0) return '없음';

  const moves = [];
  for (let i = 0; i < currentRoute.length; i += 2) {
    const robotIdx = currentRoute[i];
    const direction = currentRoute[i + 1];
    const dirSymbol = direction === DIR_UP ? '↑' : direction === DIR_DOWN ? '↓' :
                     direction === DIR_LEFT ? '←' : '→';
    moves.push(`${ROBOT_COLORS[robotIdx]}${dirSymbol}`);
  }
  return `${moves.join(' ')} (${currentRoute.length / 2} moves)`;
};

// Check if current route is successful
export const checkRouteSuccess = (gameState, currentRoute) => {
  if (!gameState || currentRoute.length === 0) {
    return null;
  }

  const { simulatedPositions } = simulateMovePath(gameState, currentRoute);
  const targetRobotPos = simulatedPositions[gameState.targetRobot];

  if (targetRobotPos === gameState.targetPosition) {
    const moveCount = currentRoute.length / 2;
    return {
      moves: moveCount,
      robotIdx: gameState.targetRobot,
      position: targetRobotPos
    };
  }

  return null;
};

// Determine direction from current position to target
export const getDirectionToTarget = (currentPos, targetPos, mapSize) => {
  const currentRow = Math.floor(currentPos / mapSize);
  const currentCol = currentPos % mapSize;
  const targetRow = Math.floor(targetPos / mapSize);
  const targetCol = targetPos % mapSize;

  // Same column - vertical movement
  if (targetCol === currentCol) {
    if (targetRow < currentRow) return DIR_UP;
    if (targetRow > currentRow) return DIR_DOWN;
  }

  // Same row - horizontal movement
  if (targetRow === currentRow) {
    if (targetCol < currentCol) return DIR_LEFT;
    if (targetCol > currentCol) return DIR_RIGHT;
  }

  return null;
};

// Check if position is in center square
export const isInCenterSquare = (pos, mapSize) => {
  const row = Math.floor(pos / mapSize);
  const col = pos % mapSize;
  return row >= 6 && row <= 9 && col >= 6 && col <= 9;
};
