import { ROBOT_COLORS } from '../helpers/gameHelpers';

function SuccessBanner({ routeSuccess, gameState }) {
  if (!routeSuccess) return null;

  return (
    <div className="success-banner">
      <div style={{ fontSize: '1.5em', marginBottom: '10px' }}>🎉 Solution Found!</div>
      <div style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
        <div>
          <strong>{ROBOT_COLORS[routeSuccess.robotIdx]} {['Red', 'Green', 'Blue', 'Yellow'][routeSuccess.robotIdx]}</strong> reached target!
        </div>
        <div>Moves: <strong>{routeSuccess.moves}</strong></div>
        <div>Position: <strong>{routeSuccess.position}</strong></div>
        {gameState.bestMoveCount < 255 && (
          <div style={{ marginTop: '8px', color: routeSuccess.moves < gameState.bestMoveCount ? '#28a745' : '#666' }}>
            {routeSuccess.moves < gameState.bestMoveCount ?
              `🏆 New best! (Previous: ${gameState.bestMoveCount})` :
              `Current best: ${gameState.bestMoveCount} moves`}
          </div>
        )}
        <div style={{ marginTop: '10px', fontSize: '0.85em', color: '#667eea' }}>
          ✅ Ready to submit to blockchain!
        </div>
      </div>
    </div>
  );
}

export default SuccessBanner;
