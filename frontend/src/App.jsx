import { useState } from 'react';
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
  const [currentRoute, setCurrentRoute] = useState([]);
  const [gameObjectId, setGameObjectId] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

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
    });

    signAndExecuteTransaction(
      {
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      },
      {
        onSuccess: (result) => {
          console.log('Transaction result:', result);
          const createdObject = result.objectChanges?.find(
            obj => obj.type === 'created' && obj.objectType.includes('Game')
          );

          if (createdObject) {
            const gameId = createdObject.objectId;
            setGameObjectId(gameId);
            showStatus('✅ 게임이 생성되었습니다!', 'success');
            setTimeout(() => loadGame(gameId), 2000);
          } else {
            showStatus('게임 객체를 찾을 수 없습니다', 'error');
          }
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
          playerPositions: fields.player_positions.map(p => parseInt(p)),
          tokenPosition: parseInt(fields.token_position),
          winner: fields.winner.fields?.vec?.[0] ? parseInt(fields.winner.fields.vec[0]) : null,
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

  // 방향 추가
  const addDirection = (direction) => {
    setCurrentRoute([...currentRoute, direction]);
  };

  // 경로 되돌리기
  const undoDirection = () => {
    setCurrentRoute(currentRoute.slice(0, -1));
  };

  // 경로 초기화
  const clearRoute = () => {
    setCurrentRoute([]);
  };

  // 경로 표시 텍스트
  const getRouteDisplay = () => {
    if (currentRoute.length === 0) return '없음';
    
    const directions = currentRoute.map(d => {
      switch(d) {
        case 8: return '↑';
        case 2: return '↓';
        case 4: return '←';
        case 6: return '→';
        default: return '?';
      }
    }).join(' ');
    return `${directions} (길이: ${currentRoute.length})`;
  };

  // 게임 보드 렌더링
  const renderGameBoard = () => {
    if (!gameState) return null;

    const { mapSize, walls, playerPositions, tokenPosition } = gameState;
    const cells = [];

    // 경로 시각화를 위한 위치 계산
    let pathPositions = new Set();
    if (currentRoute.length > 0) {
      let pos = playerPositions[CONFIG.PLAYER_INDEX];
      pathPositions.add(pos);
      
      for (let dir of currentRoute) {
        let newPos = pos;
        switch(dir) {
          case 8: newPos = pos - mapSize; break;
          case 2: newPos = pos + mapSize; break;
          case 4: newPos = pos - 1; break;
          case 6: newPos = pos + 1; break;
        }
        if (newPos >= 0 && newPos < mapSize * mapSize && !walls.includes(newPos)) {
          pathPositions.add(newPos);
          pos = newPos;
        }
      }
    }

    for (let i = 0; i < mapSize * mapSize; i++) {
      let className = 'cell';
      let content = '';

      if (walls.includes(i)) {
        className += ' wall';
      } else if (playerPositions[0] === i) {
        className += ' player0';
        content = '🔵';
      } else if (playerPositions[1] === i) {
        className += ' player1';
        content = '🔴';
      } else if (tokenPosition === i) {
        className += ' token';
        content = '⭐';
      } else if (pathPositions.has(i)) {
        className += ' path';
      }

      cells.push(
        <div key={i} className={className} title={`위치: ${i}`}>
          {content}
        </div>
      );
    }

    return <div className="game-board">{cells}</div>;
  };

  return (
    <div className="container">
      <h1>🎮 Sui Blockchain Maze Game</h1>
      <p className="subtitle">온체인 경로 찾기 게임 (@mysten/sui)</p>

      <div className="wallet-section">
        <div className="wallet-info">
          {currentAccount ? (
            <>
              <div style={{ color: '#28a745', fontWeight: 'bold' }}>✅ 지갑 연결됨</div>
              <div className="wallet-address">
                주소: {currentAccount.address.slice(0, 10)}...{currentAccount.address.slice(-8)}
              </div>
            </>
          ) : (
            <div style={{ color: '#666' }}>❌ 지갑이 연결되지 않았습니다</div>
          )}
        </div>
        <ConnectButton />
      </div>

      {statusMessage.text && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      <div className="game-controls">
        <button onClick={createGame} disabled={!currentAccount}>
          🎲 새 게임 생성
        </button>
        <button onClick={() => loadGame(gameObjectId)} disabled={!gameObjectId}>
          📥 게임 불러오기
        </button>
        <button onClick={submitRoute} disabled={!currentAccount || !gameObjectId}>
          ✅ 경로 제출
        </button>
      </div>

      <div className="input-group">
        <label>게임 객체 ID:</label>
        <input
          type="text"
          value={gameObjectId}
          onChange={(e) => setGameObjectId(e.target.value)}
          placeholder="생성 후 자동으로 입력됩니다"
        />
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-box" style={{ background: '#4CAF50' }}>🔵</div>
          <span>플레이어 1 (시작: 0)</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{ background: '#2196F3' }}>🔴</div>
          <span>플레이어 2 (시작: 99)</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{ background: '#FFD700' }}>⭐</div>
          <span>목표 (55)</span>
        </div>
        <div className="legend-item">
          <div className="legend-box" style={{ background: '#333' }}></div>
          <span>벽</span>
        </div>
      </div>

      {renderGameBoard()}

      {gameState && (
        <div className="game-info">
          <div className="info-card">
            <h3>📊 게임 정보</h3>
            <p>맵 크기: {gameState.mapSize}x{gameState.mapSize}</p>
            <p>벽 개수: {gameState.walls.length}</p>
            <p>승자: {gameState.winner !== null ? `플레이어 ${gameState.winner + 1} 🏆` : '진행 중'}</p>
          </div>
          <div className="info-card">
            <h3>🏆 점수</h3>
            <p>플레이어 1: {gameState.scores[0]}</p>
            <p>플레이어 2: {gameState.scores[1]}</p>
          </div>
        </div>
      )}

      <div className="route-builder">
        <h3>🗺️ 경로 만들기</h3>
        <p>방향키를 클릭하여 경로를 만드세요</p>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
          현재 플레이어: <strong>플레이어 {CONFIG.PLAYER_INDEX + 1}</strong>
        </p>

        <div className="direction-buttons">
          <button onClick={() => addDirection(8)}>⬆️ 상</button>
          <button onClick={() => addDirection(4)}>⬅️ 좌</button>
          <button style={{ background: '#ccc' }} disabled>🏠</button>
          <button onClick={() => addDirection(6)}>➡️ 우</button>
          <button onClick={() => addDirection(2)}>⬇️ 하</button>
        </div>

        <div className="route-controls">
          <button onClick={undoDirection}>↩️ 되돌리기</button>
          <button onClick={clearRoute}>🗑️ 초기화</button>
        </div>

        <div className="route-display">
          <strong>현재 경로:</strong> {getRouteDisplay()}
        </div>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '12px' }}>
        <h3 style={{ color: '#667eea', marginBottom: '10px' }}>📖 게임 방법</h3>
        <ol style={{ color: '#666', lineHeight: '1.8' }}>
          <li>위의 "Connect Wallet" 버튼으로 지갑을 연결합니다</li>
          <li>"새 게임 생성"을 클릭하여 게임을 시작합니다</li>
          <li>방향 버튼으로 경로를 만듭니다 (목표 ⭐ 위치로 이동)</li>
          <li>경로를 만들면 자동으로 보드에 표시됩니다</li>
          <li>"경로 제출"로 온체인에 제출합니다 (가스비 필요)</li>
          <li>먼저 제출한 플레이어가 승리합니다!</li>
        </ol>
      </div>
    </div>
  );
}

export default App;