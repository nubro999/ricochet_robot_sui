import { useState } from 'react';
import { ROBOT_COLORS, ROBOT_NAMES } from '../helpers/gameHelpers';

function RouteHistory({ gameState, paths, simulatedPositions, selectedRobot, onRobotSelect }) {
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  if (!gameState) {
    return (
      <div className="route-history">
        <button
          onClick={() => setShowHowToPlay(!showHowToPlay)}
          style={{
            width: '100%',
            padding: '12px',
            background: '#637AB9',
            color: '#A8FBD3',
            border: '3px solid #4FB7B3',
            fontSize: '0.9em',
            marginBottom: showHowToPlay ? '15px' : '0'
          }}
        >
          {showHowToPlay ? '▼' : '▶'} HOW TO PLAY
        </button>

        {showHowToPlay && (
          <div style={{
            padding: '15px',
            background: '#31326F',
            border: '2px solid #A8FBD3',
            borderRadius: '0',
            fontSize: '0.8em',
            lineHeight: '1.8'
          }}>
            <div style={{ color: '#4FB7B3' }}>
              <div style={{ marginBottom: '10px', color: '#A8FBD3', fontWeight: 'bold' }}>
                🎮 GAMEPLAY
              </div>
              <div style={{ marginBottom: '8px' }}>
                1. Tap a robot below
              </div>
              <div style={{ marginBottom: '8px' }}>
                2. Tap a cell on map
              </div>
              <div style={{ marginBottom: '8px' }}>
                3. Robot slides until blocked
              </div>
              <div style={{ marginBottom: '15px' }}>
                4. Get target robot to goal
              </div>

              <div style={{ marginBottom: '10px', color: '#A8FBD3', fontWeight: 'bold' }}>
                🎯 OBJECTIVE
              </div>
              <div style={{ marginBottom: '8px' }}>
                Move the colored robot to the matching goal in the fewest moves possible!
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

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
