import { ROBOT_COLORS } from '../helpers/gameHelpers';

function GameControls({ getRouteDisplay, onUndo, onClear }) {
  return (
    <div className="route-builder">
      <h3 style={{ fontSize: '1.1em' }}>Controls</h3>

      <div className="route-controls" style={{ marginTop: '12px' }}>
        <button onClick={onUndo} style={{ fontSize: '0.9em', padding: '8px 12px' }}>
          UNDO
        </button>
        <button onClick={onClear} style={{ fontSize: '0.9em', padding: '8px 12px' }}>
          CLEAR
        </button>
      </div>

      <div style={{ marginTop: '12px', fontSize: '0.85em', color: '#4FB7B3' }}>
        <strong style={{ color: '#A8FBD3' }}>Current:</strong> {getRouteDisplay()}
      </div>
    </div>
  );
}

export default GameControls;
