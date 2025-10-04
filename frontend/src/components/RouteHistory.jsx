import { ROBOT_COLORS, ROBOT_NAMES } from '../helpers/gameHelpers';

function RouteHistory({ gameState, paths, simulatedPositions, selectedRobot, onRobotSelect }) {
  if (!gameState) return null;

  return (
    <div className="route-history">
      <h3 style={{ marginBottom: '15px', color: '#667eea' }}>🗺️ Robot Routes</h3>
      {[0, 1, 2, 3].map(robotIdx => {
        const robotPaths = paths.filter(p => p.robotIdx === robotIdx);
        const moves = robotPaths.length;
        const startPos = gameState.robotPositions[robotIdx];
        const endPos = simulatedPositions[robotIdx];

        return (
          <div
            key={robotIdx}
            style={{
              padding: '12px',
              marginBottom: '10px',
              background: selectedRobot === robotIdx ? '#f0f0ff' : '#fff',
              border: selectedRobot === robotIdx ? '2px solid #667eea' : '1px solid #e0e0e0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => onRobotSelect(robotIdx)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                {ROBOT_COLORS[robotIdx]} {ROBOT_NAMES[robotIdx]}
              </div>
              <div style={{ fontSize: '0.9em', color: '#666' }}>
                {moves} {moves === 1 ? 'move' : 'moves'}
              </div>
            </div>
            {robotPaths.length > 0 && (
              <div style={{ fontSize: '0.85em', color: '#666', lineHeight: '1.5' }}>
                <div>Start: pos {startPos}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '8px 0' }}>
                  {robotPaths.map((path, idx) => {
                    const dirSymbol = path.direction === 8 ? '↑' : path.direction === 2 ? '↓' :
                                     path.direction === 4 ? '←' : '→';
                    return (
                      <span
                        key={idx}
                        style={{
                          padding: '4px 8px',
                          background: '#e8e8e8',
                          borderRadius: '4px',
                          fontSize: '0.9em'
                        }}
                      >
                        {dirSymbol} → {path.endPos}
                      </span>
                    );
                  })}
                </div>
                <div>End: pos {endPos}</div>
              </div>
            )}
            {robotPaths.length === 0 && (
              <div style={{ fontSize: '0.85em', color: '#999', fontStyle: 'italic' }}>
                No moves yet
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default RouteHistory;
