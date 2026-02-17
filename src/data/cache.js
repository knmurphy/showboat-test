/**
 * IndexedDB-based cache for observation queries.
 * Avoids re-fetching identical queries.
 */

const DB_NAME = 'natura-map-cache';
const STORE_NAME = 'queries';
const DB_VERSION = 1;
const MAX_AGE_MS = 1000 * 60 * 60; // 1 hour

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function cacheKey(params) {
  return JSON.stringify(params, Object.keys(params).sort());
}

export async function getCached(params) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const key = cacheKey(params);
    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => {
        const entry = req.result;
        if (entry && (Date.now() - entry.timestamp) < MAX_AGE_MS) {
          resolve(entry.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCache(params, data) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      key: cacheKey(params),
      data,
      timestamp: Date.now()
    });
  } catch {
    // Cache write failure is non-critical
  }
}
