import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import GameScene from '../phaser/GameScene';

function PhaserGame({ gameState, simulatedPositions, paths, selectedRobot, onCellClick, onRobotSelect }) {
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const containerRef = useRef(null);
  const [gameSize, setGameSize] = useState({ width: 700, height: 700 });

  // Handle responsive sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const size = Math.min(containerWidth, 700);
        setGameSize({ width: size, height: size });

        if (gameRef.current) {
          gameRef.current.scale.resize(size, size);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!gameRef.current) {
      const config = {
        type: Phaser.WEBGL,
        width: gameSize.width,
        height: gameSize.height,
        parent: 'phaser-game',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        transparent: true,
        scene: [GameScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
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
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '700px',
        aspectRatio: '1 / 1',
        margin: '0 auto'
      }}
    >
      <div
        id="phaser-game"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

export default PhaserGame;
