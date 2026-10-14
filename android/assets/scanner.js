/**
 * Storage & Audio Autoscan Engine
 * Dot Music Player - 100% Offline
 * Author: Developed by S. M. Mahmud Iqbal
 */

class StorageManager {
  constructor() {
    this.dbName = 'DotMusicPlayerDB';
    this.dbVersion = 2;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('artist', 'artist', { unique: false });
          trackStore.createIndex('album', 'album', { unique: false });
          trackStore.createIndex('favorite', 'favorite', { unique: false });
        }
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async saveTrack(track) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tracks', 'readwrite');
      const store = tx.objectStore('tracks');
      const record = { ...track };
      delete record.file;
      const req = store.put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveAllTracks(tracks) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tracks', 'readwrite');
      const store = tx.objectStore('tracks');
      tracks.forEach(track => {
        const record = { ...track };
        delete record.file;
        store.put(record);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllTracks() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tracks', 'readonly');
      const store = tx.objectStore('tracks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteTrack(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tracks', 'readwrite');
      const store = tx.objectStore('tracks');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clearAllTracks() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['tracks', 'handles'], 'readwrite');
      tx.objectStore('tracks').clear();
      tx.objectStore('handles').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async toggleFavorite(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tracks', 'readwrite');
      const store = tx.objectStore('tracks');
      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result;
        if (item) {
          item.favorite = !item.favorite;
          store.put(item);
          resolve(item.favorite);
        } else {
          resolve(false);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // File System Directory Handle Persistence
  async saveDirectoryHandle(handle) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction('handles', 'readwrite');
        const store = tx.objectStore('handles');
        store.put({ id: 'primary_dir', handle: handle, name: handle.name });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (e) {
        resolve(); // Some browsers do not support structured clone of handles
      }
    });
  }

  async getSavedDirectoryHandle() {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('handles', 'readonly');
        const store = tx.objectStore('handles');
        const req = store.get('primary_dir');
        req.onsuccess = () => resolve(req.result ? req.result.handle : null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Playlist Management
  async savePlaylist(playlist) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('playlists', 'readwrite');
      const store = tx.objectStore('playlists');
      store.put(playlist);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllPlaylists() {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('playlists', 'readonly');
      const store = tx.objectStore('playlists');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async saveSetting(key, val) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key, val });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getSetting(key, defaultVal = null) {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.val : defaultVal);
      req.onerror = () => resolve(defaultVal);
    });
  }
}

class AutoScanner {
  constructor(storageManager) {
    this.storage = storageManager;
    this.supportedExtensions = ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'opus', 'webm', 'wma'];
    this.isScanning = false;
    this.cancelRequested = false;
    window.memoryFiles = window.memoryFiles || new Map();
  }

  isAudioFile(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  generateTrackId(file, path = '') {
    return `dot_${path || ''}_${file.name}_${file.size}_${file.lastModified}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  async scanDirectoryPicker(onProgress) {
    if (!window.showDirectoryPicker) {
      throw new Error('FILE_SYSTEM_PICKER_NOT_SUPPORTED');
    }

    this.isScanning = true;
    this.cancelRequested = false;
    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker({
        id: 'dot-music-scan',
        mode: 'read',
        startIn: 'music'
      });
      // Try persisting handle for future sessions
      await this.storage.saveDirectoryHandle(dirHandle);
    } catch (e) {
      this.isScanning = false;
      if (e.name === 'AbortError') return [];
      throw e;
    }

    const collectedFiles = [];
    const walkDirectory = async (handle, path = '') => {
      if (this.cancelRequested) return;
      for await (const entry of handle.values()) {
        if (this.cancelRequested) break;
        if (entry.kind === 'file') {
          if (this.isAudioFile(entry.name)) {
            const file = await entry.getFile();
            collectedFiles.push({ file, path: `${path}/${entry.name}`, fileHandle: entry });
            if (onProgress && collectedFiles.length % 5 === 0) {
              onProgress({
                stage: 'discovering',
                foundCount: collectedFiles.length,
                currentFile: entry.name
              });
            }
          }
        } else if (entry.kind === 'directory') {
          const lowerName = entry.name.toLowerCase();
          if (!['node_modules', '.git', '$recycle.bin', 'system volume information', 'windows', 'appdata'].includes(lowerName)) {
            await walkDirectory(entry, `${path}/${entry.name}`);
          }
        }
      }
    };

    await walkDirectory(dirHandle, dirHandle.name);
    return await this.processDiscoveredFiles(collectedFiles, onProgress);
  }

  async scanFileInput(fileList, onProgress) {
    this.isScanning = true;
    this.cancelRequested = false;
    const collectedFiles = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (this.isAudioFile(file.name)) {
        collectedFiles.push({ file, path: file.webkitRelativePath || file.name });
      }
    }

    return await this.processDiscoveredFiles(collectedFiles, onProgress);
  }

  async scanDataTransfer(items, onProgress) {
    this.isScanning = true;
    this.cancelRequested = false;
    const collectedFiles = [];

    const traverseEntry = async (entry, path = '') => {
      if (this.cancelRequested) return;
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file) => {
            if (this.isAudioFile(file.name)) {
              collectedFiles.push({ file, path: `${path}/${file.name}` });
              if (onProgress && collectedFiles.length % 5 === 0) {
                onProgress({
                  stage: 'discovering',
                  foundCount: collectedFiles.length,
                  currentFile: file.name
                });
              }
            }
            resolve();
          }, () => resolve());
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readEntries = async () => {
          return new Promise((resolve) => {
            dirReader.readEntries(async (entries) => {
              if (entries.length === 0) {
                resolve();
              } else {
                for (const subEntry of entries) {
                  await traverseEntry(subEntry, `${path}/${entry.name}`);
                }
                await readEntries();
                resolve();
              }
            }, () => resolve());
          });
        };
        await readEntries();
      }
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) await traverseEntry(entry);
      } else if (item.getAsFile) {
        const file = item.getAsFile();
        if (file && this.isAudioFile(file.name)) {
          collectedFiles.push({ file, path: file.name });
        }
      }
    }

    return await this.processDiscoveredFiles(collectedFiles, onProgress);
  }

  async processDiscoveredFiles(collectedList, onProgress) {
    const tracks = [];
    const total = collectedList.length;

    for (let i = 0; i < total; i++) {
      if (this.cancelRequested) break;
      const { file, path } = collectedList[i];
      const id = this.generateTrackId(file, path);

      window.memoryFiles.set(id, file);

      let metadata = {};
      try {
        metadata = await ID3Parser.parse(file);
      } catch (err) {
        metadata = {
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          album: 'Local Music',
          genre: 'Audio',
          format: ID3Parser.detectFormat(file.name, file.type),
          size: file.size
        };
      }

      const track = {
        id,
        path,
        name: file.name,
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
        artist: metadata.artist || 'Unknown Artist',
        album: metadata.album || 'Local Music',
        year: metadata.year || '',
        genre: metadata.genre || 'Audio',
        trackNumber: metadata.track || '',
        format: metadata.format || 'Audio',
        size: file.size,
        lastModified: file.lastModified,
        picture: metadata.picture || null,
        favorite: false,
        duration: metadata.duration || 0,
        file: file
      };

      tracks.push(track);

      // Yield event loop every 15 items for non-blocking UI
      if (i % 15 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }

      if (onProgress) {
        onProgress({
          stage: 'parsing',
          total,
          current: i + 1,
          percent: Math.round(((i + 1) / total) * 100),
          currentTrack: track
        });
      }
    }

    await this.storage.saveAllTracks(tracks);
    this.isScanning = false;
    return tracks;
  }

  cancel() {
    this.cancelRequested = true;
    this.isScanning = false;
  }
}

if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
  window.AutoScanner = AutoScanner;
}
