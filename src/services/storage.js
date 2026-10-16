const STORAGE_PREFIX = 'cosmic-explorer:';

function getStorage() {
  try {
    const storage = window.localStorage;
    const probe = `${STORAGE_PREFIX}probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function createStorage(namespace, version = 1) {
  const prefix = `${STORAGE_PREFIX}${namespace}:v${version}:`;

  return {
    available: Boolean(getStorage()),
    read(key, fallback = null) {
      const storage = getStorage();
      if (!storage) return fallback;
      try {
        const value = storage.getItem(`${prefix}${key}`);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      const storage = getStorage();
      if (!storage) return false;
      try {
        storage.setItem(`${prefix}${key}`, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      const storage = getStorage();
      if (!storage) return false;
      try {
        storage.removeItem(`${prefix}${key}`);
        return true;
      } catch {
        return false;
      }
    }
  };
}
