import { appStore } from '../../store/app-store.js';
import { clearMusicTracks, deleteMusicTrack, getAllMusicTracks, getMusicTrack, saveMusicTrack } from './music-library.js';

const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'webm'];
const MAX_FILE_SIZE = 250 * 1024 * 1024;

function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `track-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stripExtension(name) {
  return String(name || '').replace(/\.[^.]+$/, '').trim() || 'Untitled track';
}

function parseFilename(name) {
  const clean = stripExtension(name).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = clean.split(/\s+-\s+/);
  if (parts.length >= 2) {
    return { artist: parts.shift().trim(), title: parts.join(' - ').trim() };
  }
  return { artist: 'Local artist', title: clean };
}

function isAudioFile(file) {
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase();
  return Boolean(file && file.size > 0 && file.size <= MAX_FILE_SIZE && (String(file.type || '').startsWith('audio/') || AUDIO_EXTENSIONS.includes(extension)));
}

function publicTrack(record) {
  if (!record) return null;
  const { blob, ...metadata } = record;
  return structuredClone(metadata);
}

function readDuration(blob) {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(blob);
    const finish = (duration = 0) => {
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute('src');
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    const timeout = window.setTimeout(() => finish(0), 5000);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => {
      window.clearTimeout(timeout);
      finish(audio.duration);
    }, { once: true });
    audio.addEventListener('error', () => {
      window.clearTimeout(timeout);
      finish(0);
    }, { once: true });
    audio.src = objectUrl;
  });
}

class MusicPlayer {
  #audio;
  #tracks = [];
  #currentTrackId = null;
  #objectUrl = null;
  #listeners = new Set();
  #initialized = false;
  #initializePromise = null;
  #audioContext = null;
  #sourceNode = null;
  #analyser = null;
  #lastError = null;

  constructor() {
    this.#audio = new Audio();
    this.#audio.preload = 'metadata';
    this.#audio.volume = appStore.getState().volume ?? 0.7;
    this.#audio.addEventListener('play', () => {
      appStore.setState({ soundEnabled: true });
      this.#emit();
    });
    this.#audio.addEventListener('pause', () => this.#emit());
    this.#audio.addEventListener('timeupdate', () => this.#emit());
    this.#audio.addEventListener('durationchange', () => this.#emit());
    this.#audio.addEventListener('volumechange', () => {
      appStore.setState({ volume: this.#audio.volume, soundEnabled: !this.#audio.muted });
      this.#emit();
    });
    this.#audio.addEventListener('ended', () => this.#handleEnded());
    this.#audio.addEventListener('error', () => {
      this.#lastError = this.#audio.error?.message || 'The selected audio file could not be played.';
      this.#emit();
    });
  }

  async initialize() {
    if (this.#initialized) return this.getState();
    if (this.#initializePromise) return this.#initializePromise;
    this.#initializePromise = (async () => {
      try {
        const records = await getAllMusicTracks();
        this.#tracks = records.map(publicTrack);
        const storedId = appStore.getState().musicCurrentTrackId;
        this.#currentTrackId = this.#tracks.some((track) => track.id === storedId)
          ? storedId
          : this.#tracks[0]?.id ?? null;
        if (this.#currentTrackId) await this.#loadSource(this.#currentTrackId, false);
      } catch (error) {
        this.#lastError = error.message;
      } finally {
        this.#initialized = true;
        this.#emit();
      }
      return this.getState();
    })();
    return this.#initializePromise;
  }

  getState() {
    const store = appStore.getState();
    return {
      initialized: this.#initialized,
      tracks: structuredClone(this.#tracks),
      currentTrackId: this.#currentTrackId,
      currentTrack: this.#tracks.find((track) => track.id === this.#currentTrackId) ?? null,
      isPlaying: !this.#audio.paused && !this.#audio.ended,
      currentTime: Number.isFinite(this.#audio.currentTime) ? this.#audio.currentTime : 0,
      duration: Number.isFinite(this.#audio.duration) ? this.#audio.duration : (this.#tracks.find((track) => track.id === this.#currentTrackId)?.duration ?? 0),
      volume: this.#audio.volume,
      muted: this.#audio.muted,
      shuffle: Boolean(store.musicShuffle),
      repeat: store.musicRepeat || 'off',
      error: this.#lastError
    };
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.getState());
    return () => this.#listeners.delete(listener);
  }

  #emit() {
    const snapshot = this.getState();
    this.#listeners.forEach((listener) => listener(snapshot));
    window.dispatchEvent(new CustomEvent('cosmic-explorer:music-state', { detail: snapshot }));
  }

  async #initializeAudioGraph() {
    if (this.#analyser) {
      if (this.#audioContext?.state === 'suspended') await this.#audioContext.resume();
      return this.#analyser;
    }
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.#audioContext = new AudioContextClass();
    this.#sourceNode = this.#audioContext.createMediaElementSource(this.#audio);
    this.#analyser = this.#audioContext.createAnalyser();
    this.#analyser.fftSize = 256;
    this.#analyser.smoothingTimeConstant = 0.82;
    this.#sourceNode.connect(this.#analyser);
    this.#analyser.connect(this.#audioContext.destination);
    return this.#analyser;
  }

  getAnalyser() {
    return this.#analyser;
  }

  async addFiles(fileList) {
    await this.initialize();
    const files = [...fileList].filter(isAudioFile);
    const rejected = [...fileList].length - files.length;
    const added = [];
    for (const file of files) {
      const parsed = parseFilename(file.name);
      const duration = await readDuration(file);
      const record = {
        id: createId(),
        title: parsed.title,
        artist: parsed.artist,
        album: 'Local Library',
        fileName: file.name,
        type: file.type || 'audio/*',
        size: file.size,
        duration,
        createdAt: Date.now() + added.length,
        accentSeed: Math.floor(Math.random() * 360),
        blob: file
      };
      await saveMusicTrack(record);
      const metadata = publicTrack(record);
      this.#tracks.push(metadata);
      added.push(metadata);
    }
    if (!this.#currentTrackId && added[0]) {
      await this.selectTrack(added[0].id, { play: false });
    }
    this.#emit();
    return { added, rejected };
  }

  async #loadSource(id, preserveTime = false) {
    const record = await getMusicTrack(id);
    if (!record?.blob) throw new Error('The audio file is no longer available in the local library.');
    const previousTime = preserveTime ? this.#audio.currentTime : 0;
    if (this.#objectUrl) URL.revokeObjectURL(this.#objectUrl);
    this.#objectUrl = URL.createObjectURL(record.blob);
    this.#audio.src = this.#objectUrl;
    this.#audio.addEventListener('loadedmetadata', () => {
      const measuredDuration = Number.isFinite(this.#audio.duration) ? this.#audio.duration : 0;
      const track = this.#tracks.find((item) => item.id === id);
      if (track && measuredDuration > 0 && Math.abs((track.duration || 0) - measuredDuration) > 0.5) {
        track.duration = measuredDuration;
        saveMusicTrack({ ...record, duration: measuredDuration }).catch(() => {});
      }
      if (previousTime > 0) this.#audio.currentTime = Math.min(previousTime, measuredDuration || previousTime);
      this.#emit();
    }, { once: true });
    this.#audio.load();
  }

  async selectTrack(id, { play = false } = {}) {
    await this.initialize();
    if (!this.#tracks.some((track) => track.id === id)) return false;
    const changed = id !== this.#currentTrackId;
    this.#lastError = null;
    if (changed || !this.#audio.src) {
      this.#audio.pause();
      this.#currentTrackId = id;
      appStore.setState({ musicCurrentTrackId: id });
      await this.#loadSource(id, false);
    }
    this.#emit();
    if (play) await this.play();
    return true;
  }

  async play() {
    await this.initialize();
    if (!this.#currentTrackId && this.#tracks[0]) await this.selectTrack(this.#tracks[0].id, { play: false });
    if (!this.#currentTrackId) return false;
    try {
      await this.#initializeAudioGraph();
      await this.#audio.play();
      this.#lastError = null;
      this.#emit();
      return true;
    } catch (error) {
      this.#lastError = error.message;
      this.#emit();
      return false;
    }
  }

  pause() {
    this.#audio.pause();
  }

  async togglePlay() {
    if (this.#audio.paused) return this.play();
    this.pause();
    return true;
  }

  seek(seconds) {
    if (!Number.isFinite(seconds)) return;
    const duration = Number.isFinite(this.#audio.duration) ? this.#audio.duration : seconds;
    this.#audio.currentTime = Math.max(0, Math.min(seconds, duration));
    this.#emit();
  }

  setVolume(value) {
    const normalized = Math.max(0, Math.min(1, Number(value)));
    this.#audio.volume = normalized;
    this.#audio.muted = normalized === 0;
  }

  toggleMute() {
    this.#audio.muted = !this.#audio.muted;
    this.#emit();
  }

  setShuffle(enabled) {
    appStore.setState({ musicShuffle: Boolean(enabled) });
    this.#emit();
  }

  cycleRepeat() {
    const current = appStore.getState().musicRepeat || 'off';
    const next = current === 'off' ? 'all' : current === 'all' ? 'one' : 'off';
    appStore.setState({ musicRepeat: next });
    this.#emit();
    return next;
  }

  #getAdjacentId(direction) {
    if (!this.#tracks.length) return null;
    const state = appStore.getState();
    if (state.musicShuffle && this.#tracks.length > 1) {
      const alternatives = this.#tracks.filter((track) => track.id !== this.#currentTrackId);
      return alternatives[Math.floor(Math.random() * alternatives.length)]?.id ?? this.#currentTrackId;
    }
    const index = Math.max(0, this.#tracks.findIndex((track) => track.id === this.#currentTrackId));
    const nextIndex = (index + direction + this.#tracks.length) % this.#tracks.length;
    return this.#tracks[nextIndex]?.id ?? null;
  }

  async next({ fromEnded = false } = {}) {
    const repeat = appStore.getState().musicRepeat || 'off';
    if (fromEnded && repeat === 'one') {
      this.seek(0);
      return this.play();
    }
    const currentIndex = this.#tracks.findIndex((track) => track.id === this.#currentTrackId);
    if (fromEnded && repeat === 'off' && currentIndex === this.#tracks.length - 1 && !appStore.getState().musicShuffle) {
      this.pause();
      this.seek(0);
      return false;
    }
    const id = this.#getAdjacentId(1);
    if (!id) return false;
    await this.selectTrack(id, { play: true });
    return true;
  }

  async previous() {
    if (this.#audio.currentTime > 4) {
      this.seek(0);
      return true;
    }
    const id = this.#getAdjacentId(-1);
    if (!id) return false;
    await this.selectTrack(id, { play: true });
    return true;
  }

  async #handleEnded() {
    await this.next({ fromEnded: true });
  }

  async removeTrack(id) {
    await this.initialize();
    const index = this.#tracks.findIndex((track) => track.id === id);
    if (index < 0) return false;
    const wasCurrent = id === this.#currentTrackId;
    if (wasCurrent) this.#audio.pause();
    await deleteMusicTrack(id);
    this.#tracks.splice(index, 1);
    if (wasCurrent) {
      this.#currentTrackId = this.#tracks[index]?.id ?? this.#tracks[index - 1]?.id ?? null;
      appStore.setState({ musicCurrentTrackId: this.#currentTrackId });
      if (this.#currentTrackId) await this.#loadSource(this.#currentTrackId, false);
      else {
        if (this.#objectUrl) URL.revokeObjectURL(this.#objectUrl);
        this.#objectUrl = null;
        this.#audio.removeAttribute('src');
        this.#audio.load();
      }
    }
    this.#emit();
    return true;
  }

  async clearLibrary() {
    this.#audio.pause();
    await clearMusicTracks();
    this.#tracks = [];
    this.#currentTrackId = null;
    appStore.setState({ musicCurrentTrackId: null });
    if (this.#objectUrl) URL.revokeObjectURL(this.#objectUrl);
    this.#objectUrl = null;
    this.#audio.removeAttribute('src');
    this.#audio.load();
    this.#emit();
  }
}

export const musicPlayer = new MusicPlayer();
