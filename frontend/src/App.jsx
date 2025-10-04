import { useState, useEffect } from 'react';
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient
} from '@mysten/dapp-kit';
import { CONFIG } from './config';
import {
  simulateMovePath,
  getRouteDisplay,
  checkRouteSuccess,
  getDirectionToTarget
} from './helpers/gameHelpers';
import {
  createGameTransaction,
  submitRouteTransaction,
  loadGameFromBlockchain,
  waitForGameCreation
} from './helpers/suiHelpers';
import PhaserGame from './components/PhaserGame';
import RouteHistory from './components/RouteHistory';
import GameControls from './components/GameControls';
import GameInfo from './components/GameInfo';
import SuccessBanner from './components/SuccessBanner';

function App() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [gameState, setGameState] = useState(null);
  const [currentRoute, setCurrentRoute] = useState([]);
  const [selectedRobot, setSelectedRobot] = useState(0);
  const [gameObjectId, setGameObjectId] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [routeSuccess, setRouteSuccess] = useState(null);

  // Check route success whenever route or game state changes
  useEffect(() => {
    const success = checkRouteSuccess(gameState, currentRoute);
    setRouteSuccess(success);
  }, [currentRoute, gameState]);

  // Show status message
  const showStatus = (text, type) => {
    setStatusMessage({ text, type });
    if (type === 'success' || type === 'error') {
      setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
    }
  };

  // Create game
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

    const tx = createGameTransaction();

    signAndExecuteTransaction(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          console.log('Transaction result:', result);

          try {
            const gameId = await waitForGameCreation(suiClient, result.digest);

            if (gameId) {
              setGameObjectId(gameId);
              showStatus('✅ 게임이 생성되었습니다! ID: ' + gameId.slice(0, 8) + '...', 'success');
              setTimeout(() => loadGame(gameId), 2000);
            } else {
              showStatus('게임 객체를 찾을 수 없습니다', 'error');
            }
          } catch (error) {
            console.error('트랜잭션 조회 오류:', error);
            showStatus('트랜잭션 조회 실패: ' + error.message, 'error');
          }
        },
        onError: (error) => {
          console.error('게임 생성 오류:', error);
          showStatus('게임 생성 실패: ' + error.message, 'error');
        },
      }
    );
  };

  // Load game
  const loadGame = async (gameId) => {
    if (!gameId) {
      showStatus('게임 ID를 입력해주세요', 'error');
      return;
    }

    try {
      showStatus('게임 불러오는 중...', 'info');
      const state = await loadGameFromBlockchain(suiClient, gameId);

      if (state) {
        setGameState(state);
        showStatus('✅ 게임을 불러왔습니다!', 'success');
      } else {
        showStatus('게임 데이터를 파싱할 수 없습니다', 'error');
      }
    } catch (error) {
      showStatus('게임 불러오기 실패: ' + error.message, 'error');
      console.error(error);
    }
  };

  // Submit route
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

    const tx = submitRouteTransaction(gameObjectId, currentRoute);

    signAndExecuteTransaction(
      { transaction: tx },
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

  // Add direction (add robot index + direction pair)
  const addDirection = (direction) => {
    const newRoute = [...currentRoute, selectedRobot, direction];
    setCurrentRoute(newRoute);
  };

  // Undo direction (remove last pair)
  const undoDirection = () => {
    if (currentRoute.length >= 2) {
      setCurrentRoute(currentRoute.slice(0, -2));
    }
  };

  // Clear route
  const clearRoute = () => {
    setCurrentRoute([]);
  };

  // Click to move robot to position
  const handleCellClick = (targetPos) => {
    if (!gameState) return;

    const { mapSize } = gameState;
    const { simulatedPositions } = simulateMovePath(gameState, currentRoute);
    const currentPos = simulatedPositions[selectedRobot];

    if (currentPos === targetPos) return;

    const direction = getDirectionToTarget(currentPos, targetPos, mapSize);

    if (direction) {
      addDirection(direction);
    }
  };

  // Get simulation data
  const { paths, simulatedPositions } = simulateMovePath(gameState, currentRoute);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <h1>Ricochet Robots on Sui</h1>

      <div style={{
        display: 'flex',
        gap: '15px',
        maxWidth: '1600px',
        alignItems: 'flex-start',
        justifyContent: 'center'
      }}>
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

          <SuccessBanner routeSuccess={routeSuccess} gameState={gameState} />

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

          <GameInfo gameState={gameState} />
        </div>

        {/* Center - Game Board (Phaser) */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="legend" style={{ marginBottom: '10px' }}>
            <div className="legend-item"><span>🔴 Red</span></div>
            <div className="legend-item"><span>🟢 Green</span></div>
            <div className="legend-item"><span>🔵 Blue</span></div>
            <div className="legend-item"><span>🟡 Yellow</span></div>
            <div className="legend-item"><span>⭐ Target</span></div>
          </div>

          <PhaserGame
            gameState={gameState}
            simulatedPositions={simulatedPositions}
            paths={paths}
            selectedRobot={selectedRobot}
            onCellClick={handleCellClick}
            onRobotSelect={setSelectedRobot}
          />

          <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f8f9fa', borderRadius: '8px', maxWidth: '700px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              Click robot • Click cell • Robots slide until blocked
            </div>
          </div>
        </div>

        {/* Right Sidebar - Route Builder & History */}
        <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <GameControls
            getRouteDisplay={() => getRouteDisplay(currentRoute)}
            onUndo={undoDirection}
            onClear={clearRoute}
          />

          <RouteHistory
            gameState={gameState}
            paths={paths}
            simulatedPositions={simulatedPositions}
            selectedRobot={selectedRobot}
            onRobotSelect={setSelectedRobot}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
