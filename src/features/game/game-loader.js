export async function loadCosmicDefender() {
  // Phaser will be dynamically imported in Phase 6 only after the player opens the game.
  return {
    status: 'prepared',
    start() {
      throw new Error('Cosmic Defender gameplay is scheduled for Phase 6.');
    }
  };
}
