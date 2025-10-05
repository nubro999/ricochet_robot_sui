import { ROBOT_COLORS } from '../helpers/gameHelpers';

function GameInfo({ gameState }) {
  if (!gameState) return null;

  return (
    <div className="info-card">
      <h3 style={{ fontSize: '1em' }}>Game Info</h3>
      <p style={{ fontSize: '0.85em' }}>Board: {gameState.mapSize}×{gameState.mapSize}</p>
      <p style={{ fontSize: '0.85em' }}>Target: {ROBOT_COLORS[gameState.targetRobot]}</p>
      <p style={{ fontSize: '0.85em' }}>
        Best: {gameState.bestMoveCount === 255 ? '-' : `${gameState.bestMoveCount}`}
      </p>
      <p style={{ fontSize: '0.85em' }}>
        Winner: {gameState.winner !== null ? `P${gameState.winner + 1}` : 'In Progress'}
      </p>
    </div>
  );
}

export default GameInfo;
