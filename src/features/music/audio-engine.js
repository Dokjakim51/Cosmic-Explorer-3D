export class CosmicExplorerAudioEngine {
  #context = null;

  get ready() {
    return Boolean(this.#context);
  }

  async initializeFromUserGesture() {
    if (this.#context) return this.#context;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio API is not supported.');
    this.#context = new AudioContextClass();
    return this.#context;
  }

  async suspend() {
    if (this.#context?.state === 'running') await this.#context.suspend();
  }
}
