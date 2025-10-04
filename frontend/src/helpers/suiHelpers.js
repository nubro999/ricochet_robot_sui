// Sui blockchain interaction helpers
import { Transaction } from '@mysten/sui/transactions';
import { CONFIG } from '../config';

// Create a new game transaction
export const createGameTransaction = () => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::create_game`,
    arguments: [
      tx.object('0x8') // Random object
    ],
  });
  return tx;
};

// Submit route transaction
export const submitRouteTransaction = (gameObjectId, route) => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::submit_route`,
    arguments: [
      tx.object(gameObjectId),
      tx.pure.u8(CONFIG.PLAYER_INDEX),
      tx.pure.vector('u8', route)
    ],
  });
  return tx;
};

// Parse game state from Sui object
export const parseGameState = (object) => {
  if (!object.data?.content?.fields) {
    return null;
  }

  const fields = object.data.content.fields;
  return {
    mapSize: parseInt(fields.map_size),
    walls: fields.walls.map(w => parseInt(w)),
    robotPositions: fields.robot_positions.map(p => parseInt(p)),
    targetPosition: parseInt(fields.target_position),
    targetRobot: parseInt(fields.target_robot),
    winner: fields.winner?.fields?.vec?.[0] ? parseInt(fields.winner.fields.vec[0]) : null,
    bestMoveCount: parseInt(fields.best_move_count),
    scores: fields.scores.map(s => parseInt(s))
  };
};

// Load game from blockchain
export const loadGameFromBlockchain = async (suiClient, gameId) => {
  const object = await suiClient.getObject({
    id: gameId,
    options: { showContent: true }
  });

  return parseGameState(object);
};

// Wait for transaction and find created game object
export const waitForGameCreation = async (suiClient, digest) => {
  const txResult = await suiClient.waitForTransaction({
    digest,
    options: {
      showEffects: true,
      showObjectChanges: true,
    }
  });

  const createdObject = txResult.objectChanges?.find(
    obj => obj.type === 'created' && obj.objectType.includes('game::Game')
  );

  return createdObject?.objectId || null;
};
