import { ROBOT_COLORS, ROBOT_NAMES } from '../helpers/gameHelpers';

function RouteHistory({ gameState, paths, simulatedPositions, selectedRobot, onRobotSelect }) {
  if (!gameState) return null;

  return (
    <div className="route-history">
      <h3 style={{ marginBottom: '15px', color: '#A8FBD3', fontSize: '1.1em' }}>Robot Routes</h3>
      {[0, 1, 2, 3].map(robotIdx => {
        const robotPaths = paths.filter(p => p.robotIdx === robotIdx);
        const moves = robotPaths.length;

        return (
          <div
            key={robotIdx}
            style={{
              padding: '8px',
              marginBottom: '8px',
              background: selectedRobot === robotIdx ? '#637AB9' : '#31326F',
              border: selectedRobot === robotIdx ? '3px solid #A8FBD3' : '2px solid #4FB7B3',
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => onRobotSelect(robotIdx)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#A8FBD3' }}>
                {ROBOT_COLORS[robotIdx]} {ROBOT_NAMES[robotIdx]}
              </div>
              <div style={{ fontSize: '0.75em', color: '#4FB7B3' }}>
                {moves} {moves === 1 ? 'move' : 'moves'}
              </div>
            </div>
            {robotPaths.length === 0 && (
              <div style={{ fontSize: '0.7em', color: '#637AB9', fontStyle: 'italic', marginTop: '4px' }}>
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
