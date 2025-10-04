import { ROBOT_COLORS } from '../helpers/gameHelpers';

function GameControls({ getRouteDisplay, onUndo, onClear }) {
  return (
    <div className="route-builder">
      <h3 style={{ fontSize: '1.1em' }}>⚙️ Controls</h3>

      <div className="route-controls" style={{ marginTop: '12px' }}>
        <button onClick={onUndo} style={{ fontSize: '0.9em', padding: '8px 12px' }}>
          ↩️ Undo
        </button>
        <button onClick={onClear} style={{ fontSize: '0.9em', padding: '8px 12px' }}>
          🗑️ Clear
        </button>
      </div>

      <div style={{ marginTop: '12px', fontSize: '0.85em', color: '#666' }}>
        <strong>Current:</strong> {getRouteDisplay()}
      </div>
    </div>
  );
}

export default GameControls;
