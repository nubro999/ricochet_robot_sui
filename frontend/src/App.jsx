import { useState, useEffect } from 'react';
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { CONFIG } from './config';

function App() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const [gameState, setGameState] = useState(null);
  const [currentRoute, setCurrentRoute] = useState([]); // Format: [robotIdx, direction, robotIdx, direction, ...]
  const [selectedRobot, setSelectedRobot] = useState(0); // Currently selected robot to move
  const [gameObjectId, setGameObjectId] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [routeSuccess, setRouteSuccess] = useState(null); // {moves: number, robotIdx: number, position: number}

  // Check route success whenever route or game state changes
  useEffect(() => {
    checkRouteSuccess();
  }, [currentRoute, gameState]);

  // 상태 메시지 표시
  const showStatus = (text, type) => {
    setStatusMessage({ text, type });
    if (type === 'success' || type === 'error') {
      setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
    }
  };

  // 게임 생성
  const createGame = () => {
    if (!currentAccount) {
      showStatus('먼저 지갑을 연결해주세요', 'error');
      return;
    }

    if (CONFIG.PACKAGE_ID === 'YOUR_PACKAGE_ID_HERE') {
      showStatus('config.js에서 PACKAGE_ID를 설정해주세요!', 'error');
      return;
    }

    showStatus('게임 생성 중...', 'info');

    const tx = new Transaction();
    tx.moveCall({
      target: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::create_game`,
      arguments: [
        tx.object('0x8') // Random object is at 0x8
      ],
    });

    signAndExecuteTransaction(
      {
        transaction: tx,
      },
      {
        onSuccess: (result) => {
          console.log('Transaction result:', result);

          // digest를 사용해서 트랜잭션 결과 조회
          suiClient.waitForTransaction({
            digest: result.digest,
            options: {
              showEffects: true,
              showObjectChanges: true,
            }
          }).then((txResult) => {
            console.log('Transaction details:', txResult);
            console.log('Object changes:', txResult.objectChanges);

            const createdObject = txResult.objectChanges?.find(
              obj => obj.type === 'created' && obj.objectType.includes('game::Game')
            );

            if (createdObject) {
              const gameId = createdObject.objectId;
              setGameObjectId(gameId);
              showStatus('✅ 게임이 생성되었습니다! ID: ' + gameId.slice(0, 8) + '...', 'success');
              setTimeout(() => loadGame(gameId), 2000);
            } else {
              console.error('게임 객체를 찾을 수 없습니다. objectChanges:', txResult.objectChanges);
              showStatus('게임 객체를 찾을 수 없습니다', 'error');
            }
          }).catch((error) => {
            console.error('트랜잭션 조회 오류:', error);
            showStatus('트랜잭션 조회 실패: ' + error.message, 'error');
          });
        },
        onError: (error) => {
          console.error('게임 생성 오류:', error);
          showStatus('게임 생성 실패: ' + error.message, 'error');
        },
      }
    );
  };

  // 게임 불러오기
  const loadGame = async (gameId) => {
    if (!gameId) {
      showStatus('게임 ID를 입력해주세요', 'error');
      return;
    }

    try {
      showStatus('게임 불러오는 중...', 'info');

      const object = await suiClient.getObject({
        id: gameId,
        options: { showContent: true }
      });

      console.log('Game object:', object);

      if (object.data?.content?.fields) {
        const fields = object.data.content.fields;
        setGameState({
          mapSize: parseInt(fields.map_size),
          walls: fields.walls.map(w => parseInt(w)),
          robotPositions: fields.robot_positions.map(p => parseInt(p)),
          targetPosition: parseInt(fields.target_position),
          targetRobot: parseInt(fields.target_robot),
          winner: fields.winner?.fields?.vec?.[0] ? parseInt(fields.winner.fields.vec[0]) : null,
          bestMoveCount: parseInt(fields.best_move_count),
          scores: fields.scores.map(s => parseInt(s))
        });
        showStatus('✅ 게임을 불러왔습니다!', 'success');
      } else {
        showStatus('게임 데이터를 파싱할 수 없습니다', 'error');
      }
    } catch (error) {
      showStatus('게임 불러오기 실패: ' + error.message, 'error');
      console.error(error);
    }
  };

  // 경로 제출
  const submitRoute = () => {
    if (!currentAccount) {
      showStatus('먼저 지갑을 연결해주세요', 'error');
      return;
    }

    if (currentRoute.length === 0) {
      showStatus('경로를 만들어주세요', 'error');
      return;
    }

    if (!gameObjectId) {
      showStatus('게임 ID를 입력해주세요', 'error');
      return;
    }

    showStatus('경로 제출 중...', 'info');

    const tx = new Transaction();
    tx.moveCall({
      target: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::submit_route`,
      arguments: [
        tx.object(gameObjectId),
        tx.pure.u8(CONFIG.PLAYER_INDEX),
        tx.pure.vector('u8', currentRoute)
      ],
    });

    signAndExecuteTransaction(
      {
        transaction: tx,
      },
      {
        onSuccess: (result) => {
          console.log('Submit result:', result);
          showStatus('✅ 경로가 제출되었습니다!', 'success');
          setCurrentRoute([]);
          setTimeout(() => loadGame(gameObjectId), 2000);
        },
        onError: (error) => {
          console.error('경로 제출 오류:', error);
          showStatus('경로 제출 실패: ' + error.message, 'error');
        },
      }
    );
  };

  // Check if current route is successful
  const checkRouteSuccess = () => {
    if (!gameState || currentRoute.length === 0) {
      setRouteSuccess(null);
      return;
    }

    const { simulatedPositions } = simulateMovePath();
    const targetRobotPos = simulatedPositions[gameState.targetRobot];

    if (targetRobotPos === gameState.targetPosition) {
      const moveCount = currentRoute.length / 2;
      setRouteSuccess({
        moves: moveCount,
        robotIdx: gameState.targetRobot,
        position: targetRobotPos
      });
    } else {
      setRouteSuccess(null);
    }
  };

  // 방향 추가 (Ricochet Robots: add robot index + direction pair)
  const addDirection = (direction) => {
    const newRoute = [...currentRoute, selectedRobot, direction];
    setCurrentRoute(newRoute);
  };

  // 경로 되돌리기 (remove last pair: robot + direction)
  const undoDirection = () => {
    if (currentRoute.length >= 2) {
      setCurrentRoute(currentRoute.slice(0, -2));
    }
  };

  // 경로 초기화
  const clearRoute = () => {
    setCurrentRoute([]);
  };

  // 경로 표시 텍스트
  const getRouteDisplay = () => {
    if (currentRoute.length === 0) return '없음';

    const robotColors = ['🔴', '🟢', '🔵', '🟡'];
    const moves = [];
    for (let i = 0; i < currentRoute.length; i += 2) {
      const robotIdx = currentRoute[i];
      const direction = currentRoute[i + 1];
      const dirSymbol = direction === 8 ? '↑' : direction === 2 ? '↓' : direction === 4 ? '←' : '→';
      moves.push(`${robotColors[robotIdx]}${dirSymbol}`);
    }
    return `${moves.join(' ')} (${currentRoute.length / 2} moves)`;
  };

  // Helper: check if cell has wall in direction
  const hasWall = (wallBits, direction) => {
    const WALL_NORTH = 1, WALL_SOUTH = 2, WALL_WEST = 4, WALL_EAST = 8;
    const bit = direction === 'N' ? WALL_NORTH : direction === 'S' ? WALL_SOUTH :
                direction === 'W' ? WALL_WEST : WALL_EAST;
    return (wallBits & bit) !== 0;
  };

  // Simulate robot movement to get path traces and simulated positions
  const simulateMovePath = () => {
    if (!gameState || currentRoute.length === 0) {
      return { paths: [], simulatedPositions: [...(gameState?.robotPositions || [])] };
    }

    const { mapSize, walls, robotPositions } = gameState;
    const paths = []; // Array of {robotIdx, startPos, endPos, direction, positions[]}
    let tempPositions = [...robotPositions];

    for (let i = 0; i < currentRoute.length; i += 2) {
      const robotIdx = currentRoute[i];
      const direction = currentRoute[i + 1];

      let currentPos = tempPositions[robotIdx]; // Use UPDATED position
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

        if (direction === 8) { // UP
          canMove = row > 0 && !hasWall(wallBits, 'N');
          nextPos = currentPos - mapSize;
        } else if (direction === 2) { // DOWN
          canMove = row < mapSize - 1 && !hasWall(wallBits, 'S');
          nextPos = currentPos + mapSize;
        } else if (direction === 4) { // LEFT
          canMove = col > 0 && !hasWall(wallBits, 'W');
          nextPos = currentPos - 1;
        } else if (direction === 6) { // RIGHT
          canMove = col < mapSize - 1 && !hasWall(wallBits, 'E');
          nextPos = currentPos + 1;
        }

        if (!canMove) break;

        // Check for other robots at CURRENT temporary positions
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

      // IMPORTANT: Update the robot's position for next iteration
      tempPositions[robotIdx] = currentPos;
    }

    return { paths, simulatedPositions: tempPositions };
  };

  // Click to move robot to position
  const handleCellClick = (targetPos) => {
    if (!gameState) return;

    const { mapSize } = gameState;

    // Use simulated positions if there's an active route
    const { simulatedPositions } = simulateMovePath();
    const currentPos = simulatedPositions[selectedRobot];

    if (currentPos === targetPos) return;

    const currentRow = Math.floor(currentPos / mapSize);
    const currentCol = currentPos % mapSize;
    const targetRow = Math.floor(targetPos / mapSize);
    const targetCol = targetPos % mapSize;

    let direction = null;

    // Determine direction based on which axis the target is on
    if (targetCol === currentCol) {
      // Same column - vertical movement
      if (targetRow < currentRow) {
        direction = 8; // UP
      } else if (targetRow > currentRow) {
        direction = 2; // DOWN
      }
    } else if (targetRow === currentRow) {
      // Same row - horizontal movement
      if (targetCol < currentCol) {
        direction = 4; // LEFT
      } else if (targetCol > currentCol) {
        direction = 6; // RIGHT
      }
    }

    if (direction) {
      addDirection(direction);
    }
  };

  // 게임 보드 렌더링 (Ricochet Robots style)
  const renderGameBoard = () => {
    if (!gameState) return null;

    const { mapSize, walls, robotPositions, targetPosition, targetRobot } = gameState;
    const cells = [];
    const robotColors = ['🔴', '🟢', '🔵', '🟡'];
    const { paths, simulatedPositions } = simulateMovePath();

    // Build path map for rendering dotted lines
    const pathCellMap = new Map(); // position -> {robotIdx, isHorizontal, isVertical}

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
        content = robotColors[simRobotIdx];
      } else if (targetPosition === i) {
        className += ' target';
        content = robotColors[targetRobot] + '⭐';
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
              setSelectedRobot(clickedRobotIdx);
            } else {
              handleCellClick(i);
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
  };

  // Render route history for each robot
  const renderRouteHistory = () => {
    if (!gameState) return null;

    const { paths, simulatedPositions } = simulateMovePath();
    const robotColors = ['🔴', '🟢', '🔵', '🟡'];
    const robotNames = ['Red', 'Green', 'Blue', 'Yellow'];

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
              onClick={() => setSelectedRobot(robotIdx)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                  {robotColors[robotIdx]} {robotNames[robotIdx]}
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
  };

  return (
    <div style={{ padding: '15px', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h1 style={{ color: 'white', fontSize: '2em', margin: '0', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          🤖 Ricochet Robots on Sui
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '15px', maxWidth: '1500px', margin: '0 auto', alignItems: 'flex-start' }}>
        {/* Left Sidebar - Game Info & Controls */}
        <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="wallet-section">
            <div className="wallet-info">
              {currentAccount ? (
                <>
                  <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '0.9em' }}>✅ Connected</div>
                  <div className="wallet-address" style={{ fontSize: '0.75em' }}>
                    {currentAccount.address.slice(0, 8)}...{currentAccount.address.slice(-6)}
                  </div>
                </>
              ) : (
                <div style={{ color: '#666', fontSize: '0.9em' }}>❌ Not Connected</div>
              )}
            </div>
            <ConnectButton />
          </div>

          {statusMessage.text && (
            <div className={`status-message ${statusMessage.type}`}>
              {statusMessage.text}
            </div>
          )}

          {routeSuccess && (
            <div className="success-banner">
              <div style={{ fontSize: '1.5em', marginBottom: '10px' }}>🎉 Solution Found!</div>
              <div style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
                <div><strong>{['🔴 Red', '🟢 Green', '🔵 Blue', '🟡 Yellow'][routeSuccess.robotIdx]}</strong> reached target!</div>
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
          )}

          <div className="game-controls" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={createGame} disabled={!currentAccount}>
              🎲 New Game
            </button>
            <button onClick={() => loadGame(gameObjectId)} disabled={!gameObjectId}>
              📥 Load Game
            </button>
            <button
              onClick={submitRoute}
              disabled={!currentAccount || !gameObjectId || currentRoute.length === 0}
              style={{
                background: currentRoute.length > 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ccc'
              }}
            >
              ✅ Submit Route
            </button>
          </div>

          <div className="input-group">
            <label style={{ fontSize: '0.85em' }}>Game ID:</label>
            <input
              type="text"
              value={gameObjectId}
              onChange={(e) => setGameObjectId(e.target.value)}
              placeholder="Auto-filled"
              style={{ fontSize: '0.75em' }}
            />
          </div>

          {gameState && (
            <div className="info-card">
              <h3 style={{ fontSize: '1em' }}>📊 Game Info</h3>
              <p style={{ fontSize: '0.85em' }}>Board: {gameState.mapSize}×{gameState.mapSize}</p>
              <p style={{ fontSize: '0.85em' }}>Target: {['🔴', '🟢', '🔵', '🟡'][gameState.targetRobot]}</p>
              <p style={{ fontSize: '0.85em' }}>Best: {gameState.bestMoveCount === 255 ? '-' : `${gameState.bestMoveCount}`}</p>
              <p style={{ fontSize: '0.85em' }}>Winner: {gameState.winner !== null ? `P${gameState.winner + 1} 🏆` : 'In Progress'}</p>
            </div>
          )}
        </div>

        {/* Center - Game Board */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="legend" style={{ marginBottom: '10px' }}>
            <div className="legend-item"><span>🔴 Red</span></div>
            <div className="legend-item"><span>🟢 Green</span></div>
            <div className="legend-item"><span>🔵 Blue</span></div>
            <div className="legend-item"><span>🟡 Yellow</span></div>
            <div className="legend-item"><span>⭐ Target</span></div>
          </div>

          {renderGameBoard()}

          <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f8f9fa', borderRadius: '8px', maxWidth: '700px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              Click robot • Click cell/arrow • Robots slide until blocked
            </div>
          </div>
        </div>

        {/* Right Sidebar - Route Builder & History */}
        <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="route-builder">
            <h3 style={{ fontSize: '1.1em' }}>⚙️ Controls</h3>
            <p style={{ fontSize: '0.85em', color: '#666', margin: '8px 0' }}>
              Selected: <strong>{['🔴 Red', '🟢 Green', '🔵 Blue', '🟡 Yellow'][selectedRobot]}</strong>
            </p>

            <div style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[0, 1, 2, 3].map(idx => (
                <button
                  key={idx}
                  onClick={() => setSelectedRobot(idx)}
                  style={{
                    padding: '10px',
                    fontSize: '1.3em',
                    background: selectedRobot === idx ? '#667eea' : '#e0e0e0',
                    color: selectedRobot === idx ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {['🔴', '🟢', '🔵', '🟡'][idx]}
                </button>
              ))}
            </div>

            <div className="direction-buttons" style={{ maxWidth: '200px', margin: '0 auto' }}>
              <button onClick={() => addDirection(8)}>⬆️</button>
              <button onClick={() => addDirection(4)}>⬅️</button>
              <button style={{ background: '#ccc' }} disabled>🏠</button>
              <button onClick={() => addDirection(6)}>➡️</button>
              <button onClick={() => addDirection(2)}>⬇️</button>
            </div>

            <div className="route-controls" style={{ marginTop: '12px' }}>
              <button onClick={undoDirection} style={{ fontSize: '0.9em', padding: '8px 12px' }}>↩️ Undo</button>
              <button onClick={clearRoute} style={{ fontSize: '0.9em', padding: '8px 12px' }}>🗑️ Clear</button>
            </div>

            <div style={{ marginTop: '12px', fontSize: '0.85em', color: '#666' }}>
              <strong>Current:</strong> {getRouteDisplay()}
            </div>
          </div>

          {renderRouteHistory()}
        </div>
      </div>
    </div>
  );
}

export default App;