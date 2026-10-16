import { openCosmicExplorerDatabase } from '../../services/indexed-db.js';

const TRACK_STORE = 'musicTracks';

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

async function withStore(mode, action) {
  const database = await openCosmicExplorerDatabase();
  try {
    const transaction = database.transaction(TRACK_STORE, mode);
    const completed = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
    });
    const store = transaction.objectStore(TRACK_STORE);
    const result = await action(store);
    await completed;
    return result;
  } finally {
    database.close();
  }
}

export async function getAllMusicTracks() {
  return withStore('readonly', async (store) => {
    const records = await requestAsPromise(store.getAll());
    return records.sort((left, right) => Number(left.createdAt) - Number(right.createdAt));
  });
}

export async function getMusicTrack(id) {
  return withStore('readonly', (store) => requestAsPromise(store.get(id)));
}

export async function saveMusicTrack(record) {
  return withStore('readwrite', async (store) => {
    await requestAsPromise(store.put(record));
    return record;
  });
}

export async function deleteMusicTrack(id) {
  return withStore('readwrite', async (store) => {
    await requestAsPromise(store.delete(id));
    return id;
  });
}

export async function clearMusicTracks() {
  return withStore('readwrite', async (store) => {
    await requestAsPromise(store.clear());
  });
}
