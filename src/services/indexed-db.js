const DATABASE_NAME = 'cosmic-explorer';
const DATABASE_VERSION = 2;

export function openCosmicExplorerDatabase() {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('musicMetadata')) {
        database.createObjectStore('musicMetadata', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('cache')) {
        database.createObjectStore('cache', { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains('musicTracks')) {
        const musicTracks = database.createObjectStore('musicTracks', { keyPath: 'id' });
        musicTracks.createIndex('createdAt', 'createdAt');
        musicTracks.createIndex('artist', 'artist');
        musicTracks.createIndex('title', 'title');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'));
  });
}
