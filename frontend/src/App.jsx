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
      showStatus('Please connect your wallet first', 'error');
      return;
    }

    if (CONFIG.PACKAGE_ID === 'YOUR_PACKAGE_ID_HERE') {
      showStatus('Please set PACKAGE_ID in config.js!', 'error');
      return;
    }

    showStatus('Creating game...', 'info');

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
              showStatus('Game created! ID: ' + gameId.slice(0, 8) + '...', 'success');
              setTimeout(() => loadGame(gameId), 2000);
            } else {
              showStatus('Game object not found', 'error');
            }
          } catch (error) {
            console.error('Transaction query error:', error);
            showStatus('Transaction query failed: ' + error.message, 'error');
          }
        },
        onError: (error) => {
          console.error('Game creation error:', error);
          showStatus('Game creation failed: ' + error.message, 'error');
        },
      }
    );
  };

  // Load game
  const loadGame = async (gameId) => {
    if (!gameId) {
      showStatus('Please enter game ID', 'error');
      return;
    }

    try {
      showStatus('Loading game...', 'info');
      const state = await loadGameFromBlockchain(suiClient, gameId);

      if (state) {
        setGameState(state);
        showStatus('Game loaded!', 'success');
      } else {
        showStatus('Cannot parse game data', 'error');
      }
    } catch (error) {
      showStatus('Failed to load game: ' + error.message, 'error');
      console.error(error);
    }
  };

  // Submit route
  const submitRoute = () => {
    if (!currentAccount) {
      showStatus('Please connect your wallet first', 'error');
      return;
    }

    if (currentRoute.length === 0) {
      showStatus('Please create a route', 'error');
      return;
    }

    if (!gameObjectId) {
      showStatus('Please enter game ID', 'error');
      return;
    }

    showStatus('Submitting route...', 'info');

    const tx = submitRouteTransaction(gameObjectId, currentRoute);

    signAndExecuteTransaction(
      { transaction: tx },
      {
        onSuccess: (result) => {
          console.log('Submit result:', result);
          showStatus('Route submitted!', 'success');
          setCurrentRoute([]);
          setTimeout(() => loadGame(gameObjectId), 2000);
        },
        onError: (error) => {
          console.error('Route submission error:', error);
          showStatus('Route submission failed: ' + error.message, 'error');
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
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '3em' }}>
        <img src="/logo.png" alt="Logo" style={{ width: '120px', height: '120px', imageRendering: 'pixelated' }} />
        FIND THE MERBAE
      </h1>

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
                  <div style={{ color: '#A8FBD3', fontWeight: 'bold', fontSize: '0.9em' }}>Connected</div>
                  <div className="wallet-address" style={{ fontSize: '0.75em' }}>
                    {currentAccount.address.slice(0, 8)}...{currentAccount.address.slice(-6)}
                  </div>
                </>
              ) : (
                <div style={{ color: '#637AB9', fontSize: '0.9em' }}>Not Connected</div>
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
              NEW GAME
            </button>
            <button onClick={() => loadGame(gameObjectId)} disabled={!gameObjectId}>
              LOAD GAME
            </button>
            <button
              onClick={submitRoute}
              disabled={!currentAccount || !gameObjectId || currentRoute.length === 0}
              style={{
                background: currentRoute.length > 0 ? '#4FB7B3' : '#31326F',
                color: currentRoute.length > 0 ? '#31326F' : '#637AB9'
              }}
            >
              SUBMIT ROUTE
            </button>
          </div>

          <div className="input-group">
            <label style={{ fontSize: '0.85em', color: '#A8FBD3' }}>Game ID:</label>
            <input
              type="text"
              value={gameObjectId}
              onChange={(e) => setGameObjectId(e.target.value)}
              placeholder="Auto-filled"
              style={{
                fontSize: '0.75em',
                background: '#31326F',
                border: '2px solid #4FB7B3',
                borderRadius: '0',
                color: '#A8FBD3',
                padding: '8px'
              }}
            />
          </div>

          <GameInfo gameState={gameState} />
        </div>

        {/* Center - Game Board (Phaser) */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="legend" style={{ marginBottom: '10px' }}>
            <div className="legend-item" style={{ background: '#31326F', border: '2px solid #4FB7B3', borderRadius: '0', color: '#A8FBD3' }}>
              <span>Red</span>
            </div>
            <div className="legend-item" style={{ background: '#31326F', border: '2px solid #4FB7B3', borderRadius: '0', color: '#A8FBD3' }}>
              <span>Green</span>
            </div>
            <div className="legend-item" style={{ background: '#31326F', border: '2px solid #4FB7B3', borderRadius: '0', color: '#A8FBD3' }}>
              <span>Blue</span>
            </div>
            <div className="legend-item" style={{ background: '#31326F', border: '2px solid #4FB7B3', borderRadius: '0', color: '#A8FBD3' }}>
              <span>Yellow</span>
            </div>
            <div className="legend-item" style={{ background: '#31326F', border: '2px solid #4FB7B3', borderRadius: '0', color: '#A8FBD3' }}>
              <span>Target</span>
            </div>
          </div>

          <PhaserGame
            gameState={gameState}
            simulatedPositions={simulatedPositions}
            paths={paths}
            selectedRobot={selectedRobot}
            onCellClick={handleCellClick}
            onRobotSelect={setSelectedRobot}
          />

          <div style={{ marginTop: '10px', padding: '8px 12px', background: '#31326F', border: '2px solid #4FB7B3', borderRadius: '0', maxWidth: '700px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8em', color: '#A8FBD3' }}>
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
