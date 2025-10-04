import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import GameScene from '../phaser/GameScene';

function PhaserGame({ gameState, simulatedPositions, paths, selectedRobot, onCellClick, onRobotSelect }) {
  const gameRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!gameRef.current) {
      const config = {
        type: Phaser.WEBGL,
        width: 700,
        height: 700,
        parent: 'phaser-game',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        transparent: true,
        scene: [GameScene],
        scale: {
          mode: Phaser.Scale.NONE,
        },
        render: {
          antialias: true,
          pixelArt: false
        }
      };

      gameRef.current = new Phaser.Game(config);

      // Get scene after game is created
      setTimeout(() => {
        sceneRef.current = gameRef.current.scene.getScene('GameScene');
      }, 100);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current && gameState) {
      sceneRef.current.setGameData(gameState, simulatedPositions, paths, selectedRobot);
      sceneRef.current.setCallbacks(onCellClick, onRobotSelect);
    }
  }, [gameState, simulatedPositions, paths, selectedRobot, onCellClick, onRobotSelect]);

  return (
    <div
      id="phaser-game"
      style={{
        width: '700px',
        height: '700px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}
    />
  );
}

export default PhaserGame;
