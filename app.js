/**
 * Dot Music Player - Core Application Logic
 * 100% Offline Nothing OS Styled Audio Player
 * Author: Developed by S. M. Mahmud Iqbal
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Instances
  const storage = new StorageManager();
  const scanner = new AutoScanner(storage);
  const audioEngine = new AudioEngine();
  
  const asciiContainer = document.getElementById('ascii-visualizer');
  const visualizerCard = document.getElementById('visualizer-card');
  const visualizer = new AsciiVisualizer(asciiContainer, audioEngine);

  // Application State
  const state = {
    library: [],
    playQueue: [],
    currentTrackIndex: -1,
    currentFilter: 'all', // 'all', 'favorites', 'folders', 'queue'
    sortOrder: 'title-asc',
    searchTerm: '',
    isShuffle: false,
    repeatMode: 'all', // 'off', 'all', 'one'
    isFullscreenVis: false,
    isLyricsOpen: false,
    hapticStrength: localStorage.getItem('dot_haptic') || 'crisp',
    ambientMeshEnabled: localStorage.getItem('dot_mesh') !== 'false',
    accentColor: localStorage.getItem('dot_accent') || '#e52b2b',
    crossfadeSec: parseInt(localStorage.getItem('dot_crossfade') || '0', 10),
    sleepTimerId: null,
    sleepTimerMinutes: 0,
    sleepTimerEndsAt: null
  };

  // DOM Elements
  const el = {
    clock: document.getElementById('header-clock'),
    trackCount: document.getElementById('header-track-count'),
    btnAutoScan: document.getElementById('btn-autoscan'),
    btnScanFolder: document.getElementById('btn-scan-folder'),
    btnScanFiles: document.getElementById('btn-scan-files'),
    btnDemoSynth: document.getElementById('btn-demo-synth'),
    btnClearLibrary: document.getElementById('btn-clear-library'),
    btnExportLib: document.getElementById('btn-export-lib'),
    folderInput: document.getElementById('folder-input'),
    filesInput: document.getElementById('files-input'),
    dropZone: document.getElementById('scan-drop-box'),
    searchInput: document.getElementById('search-input'),
    sortSelect: document.getElementById('sort-select'),
    trackList: document.getElementById('track-list-scroll'),
    libraryTabs: document.querySelectorAll('.tab-btn'),
    // Mobile Navigation Drawers
    btnToggleLibrary: document.getElementById('btn-toggle-library'),
    btnToggleEq: document.getElementById('btn-toggle-eq'),
    sidebarPanel: document.getElementById('sidebar-panel'),
    tuningPanel: document.getElementById('tuning-panel'),
    // Visualizer controls
    visModeTabs: document.querySelectorAll('.vis-tab-pill'),
    visModeLabel: document.getElementById('vis-mode-label'),
    btnCycleVis: document.getElementById('btn-cycle-vis'),
    btnVisTheme: document.getElementById('btn-vis-theme'),
    btnFullscreenVis: document.getElementById('btn-fullscreen-vis'),
    btnToggleLyrics: document.getElementById('btn-toggle-lyrics'),
    lyricsDisplay: document.getElementById('lyrics-display'),
    lyricsCurrentLine: document.getElementById('lyrics-current-line'),
    lyricsScroll: document.getElementById('lyrics-scroll'),
    // Now playing
    albumArt: document.getElementById('now-playing-art'),
    heroTitle: document.getElementById('hero-title'),
    heroArtist: document.getElementById('hero-artist'),
    heroFormat: document.getElementById('hero-format'),
    heroSize: document.getElementById('hero-size'),
    // Scrub bar
    timeCurrent: document.getElementById('time-current'),
    timeTotal: document.getElementById('time-total'),
    seekSlider: document.getElementById('seek-slider'),
    // Playback buttons
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnShuffle: document.getElementById('btn-shuffle'),
    btnRepeat: document.getElementById('btn-repeat'),
    btnSpeed: document.getElementById('btn-speed'),
    volSlider: document.getElementById('vol-slider'),
    btnMute: document.getElementById('btn-mute'),
    // Floating Mini-Player
    miniPlayerBar: document.getElementById('mini-player-bar'),
    miniSeekLine: document.getElementById('mini-seek-line'),
    miniAlbumArt: document.getElementById('mini-album-art'),
    miniTrackTitle: document.getElementById('mini-track-title'),
    miniTrackArtist: document.getElementById('mini-track-artist'),
    miniBtnPlay: document.getElementById('mini-btn-play'),
    miniBtnNext: document.getElementById('mini-btn-next'),
    miniPlayerLeft: document.getElementById('mini-player-left'),
    // Tuning & EQ
    presetPills: document.querySelectorAll('.preset-pill'),
    eqSliders: document.querySelectorAll('.eq-slider-vertical'),
    panSlider: document.getElementById('pan-slider'),
    btnBassBoostToggle: document.getElementById('btn-bass-boost-toggle'),
    bassBoostSlider: document.getElementById('bass-boost-slider'),
    bassBoostVal: document.getElementById('bass-boost-val'),
    reverbPills: document.querySelectorAll('.reverb-pill'),
    reverbMixSlider: document.getElementById('reverb-mix-slider'),
    reverbMixVal: document.getElementById('reverb-mix-val'),
    reverbCurrentBadge: document.getElementById('reverb-current-badge'),
    telemSampleRate: document.getElementById('telem-sample-rate'),
    telemChannels: document.getElementById('telem-channels'),
    telemState: document.getElementById('telem-state'),
    telemBuffer: document.getElementById('telem-buffer'),
    peakBarL: document.getElementById('peak-bar-l'),
    peakBarR: document.getElementById('peak-bar-r'),
    peakDbL: document.getElementById('peak-db-l'),
    peakDbR: document.getElementById('peak-db-r'),
    sleepTimerSelect: document.getElementById('sleep-timer-select'),
    sleepTimerBadge: document.getElementById('sleep-timer-badge'),
    // Modals & Toasts
    scanModal: document.getElementById('scan-modal'),
    scanProgressFill: document.getElementById('scan-progress-fill'),
    scanProgressText: document.getElementById('scan-progress-text'),
    scanConsole: document.getElementById('scan-console'),
    btnScanCancel: document.getElementById('btn-scan-cancel'),
    shortcutsModal: document.getElementById('shortcuts-modal'),
    btnShortcuts: document.getElementById('btn-shortcuts'),
    btnShortcutsClose: document.getElementById('btn-shortcuts-close'),
    // Customization Matrix Modal
    btnSettings: document.getElementById('btn-settings'),
    settingsModal: document.getElementById('settings-modal'),
    btnSettingsClose: document.getElementById('btn-settings-close'),
    themeColorBtns: document.querySelectorAll('.theme-color-btn'),
    themeColorLabel: document.getElementById('theme-color-label'),
    btnToggleMesh: document.getElementById('btn-toggle-mesh'),
    hapticSelect: document.getElementById('haptic-select'),
    crossfadeSelect: document.getElementById('crossfade-select'),
    ambientCanvas: document.getElementById('ambient-canvas'),
    toastNotice: document.getElementById('toast-notice')
  };

  const SVG_ICONS = {
    play: `<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="7,4 20,12 7,20"/></svg>`,
    pause: `<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="4.5" height="16" rx="1"/><rect x="14.5" y="4" width="4.5" height="16" rx="1"/></svg>`,
    volume: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    volumeMute: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
    repeat: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`,
    repeatOne: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><circle cx="12" cy="12" r="2.2" fill="var(--accent-red)" stroke="none"/></svg>`,
    star: `<svg class="icon-svg star-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    folder: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    queueAdd: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
  };

  // 1. Initialize Storage & Visualizer
  try {
    await storage.init();
    visualizer.start();
  } catch (e) {
    console.error('Storage or Visualizer init error:', e);
  }

  // Global callback for Native Android MediaStore audio scan
  window.onAndroidAudioScanned = async (tracks) => {
    if (typeof tracks === 'string') {
      try { tracks = JSON.parse(tracks); } catch (e) { tracks = []; }
    }
    if (Array.isArray(tracks)) {
      const isSong = window.isMusicTrack || (t => true);
      const songTracks = tracks.filter(t => isSong(t));
      const filteredCount = tracks.length - songTracks.length;

      logScanConsole(`Discovered ${tracks.length} device audio files.`);
      if (filteredCount > 0) {
        logScanConsole(`Filtered out ${filteredCount} non-music / short audio / call recording files.`);
      }

      if (songTracks.length > 0) {
        if (el.scanProgressFill) el.scanProgressFill.style.width = '100%';
        if (el.scanProgressText) el.scanProgressText.textContent = `INDEXED ${songTracks.length} SONGS (>=1.5M)`;
        logScanConsole(`Saving ${songTracks.length} genuine music songs to offline library...`);
        await storage.saveAllTracks(songTracks);
        await reloadLibrary();
        showToast(`AUTOSCAN: ${songTracks.length} SONGS LOADED`);
      } else {
        if (el.scanProgressText) el.scanProgressText.textContent = 'NO SONGS (>=1.5M) DETECTED';
        showToast('AUTOSCAN: NO SONGS FOUND ON DEVICE');
      }
      setTimeout(closeScanModal, 1000);
    }
  };

  function triggerHaptic(ms = 15) {
    if (state.hapticStrength === 'off') return;
    let actualMs = ms;
    if (state.hapticStrength === 'light') actualMs = Math.max(1, Math.round(ms * 0.5));
    else if (state.hapticStrength === 'heavy') actualMs = Math.round(ms * 2.0);

    if (window.AndroidApp && window.AndroidApp.vibrate) {
      window.AndroidApp.vibrate(actualMs);
    } else if (navigator.vibrate) {
      navigator.vibrate(actualMs);
    }
  }

  // If running inside Android native app, automatically trigger scan on startup
  if (window.AndroidApp && window.AndroidApp.isAndroidApp()) {
    setTimeout(() => {
      window.AndroidApp.scanDeviceAudio();
    }, 300);
  }

  // Live Header Clock
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    if (el.clock) el.clock.textContent = `${h}:${m}:${s}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  function showToast(message, duration = 2500) {
    if (!el.toastNotice) return;
    el.toastNotice.textContent = message;
    el.toastNotice.classList.add('show');
    setTimeout(() => {
      el.toastNotice.classList.remove('show');
    }, duration);
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  // 2. Load Tracks from IndexedDB and Sanitize Library
  async function reloadLibrary() {
    let tracks = await storage.getAllTracks();
    const isSong = window.isMusicTrack || (t => true);
    const validSongs = [];
    const invalidIds = [];

    tracks.forEach((t) => {
      if (isSong(t)) {
        validSongs.push(t);
      } else {
        invalidIds.push(t.id);
      }
    });

    if (invalidIds.length > 0) {
      for (const id of invalidIds) {
        await storage.deleteTrack(id);
      }
      console.log(`[Auto-Sanitizer] Cleaned ${invalidIds.length} non-music / short audio tracks from offline storage.`);
      tracks = validSongs;
    }

    state.library = tracks;
    updateTrackCountBadge();
    renderTrackList();
  }

  function updateTrackCountBadge() {
    if (el.trackCount) {
      el.trackCount.textContent = `${state.library.length} TRACKS`;
    }
  }

  // 3. Render Track List with Filter, Search & Sort
  function getFilteredTracks() {
    let list = [...state.library];

    if (state.currentFilter === 'favorites') {
      list = list.filter(t => t.favorite);
    }

    if (state.searchTerm) {
      const q = state.searchTerm.toLowerCase();
      list = list.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q)) ||
        (t.album && t.album.toLowerCase().includes(q)) ||
        (t.name && t.name.toLowerCase().includes(q))
      );
    }

    // Sort order
    list.sort((a, b) => {
      switch (state.sortOrder) {
        case 'title-asc':
          return (a.title || a.name || '').localeCompare(b.title || b.name || '');
        case 'title-desc':
          return (b.title || b.name || '').localeCompare(a.title || a.name || '');
        case 'artist-asc':
          return (a.artist || '').localeCompare(b.artist || '');
        case 'album-asc':
          return (a.album || '').localeCompare(b.album || '');
        case 'size-desc':
          return (b.size || 0) - (a.size || 0);
        default:
          return 0;
      }
    });

    return list;
  }

  function getFolderGroups() {
    const map = new Map();
    state.library.forEach((track) => {
      let folder = track.folder;
      if (!folder && track.filePath) {
        const parts = track.filePath.split(/[/\\]/);
        if (parts.length > 1) {
          folder = parts[parts.length - 2];
        }
      }
      if (!folder) {
        folder = track.album && track.album !== 'Local Audio' ? track.album : 'Internal Storage';
      }
      if (!map.has(folder)) {
        map.set(folder, []);
      }
      map.get(folder).push(track);
    });
    return Array.from(map.entries()).map(([name, tracks]) => ({ name, tracks }));
  }

  function renderTrackList() {
    if (!el.trackList) return;

    if (state.library.length === 0) {
      el.trackList.innerHTML = `
        <div class="empty-library-state">
          <div class="empty-icon-ascii">[ · · · ]</div>
          <div class="empty-title">NO SONGS FOUND YET</div>
          <div class="empty-subtitle">AUTOSCAN DEVICE STORAGE TO FIND AND PLAY YOUR SONGS</div>
          <button class="btn btn-accent empty-scan-btn" id="btn-empty-scan">
            <span>[·]</span> AUTOSCAN DEVICE
          </button>
        </div>
      `;
      const emptyBtn = el.trackList.querySelector('#btn-empty-scan');
      if (emptyBtn) emptyBtn.addEventListener('click', handleAutoScan);
      return;
    }

    if (state.currentFilter === 'folders') {
      const groups = getFolderGroups();
      el.trackList.innerHTML = '';
      if (groups.length === 0) {
        el.trackList.innerHTML = `
          <div style="padding: 20px; text-align: center; color: var(--text-muted);">
            NO FOLDERS DETECTED
          </div>
        `;
        return;
      }

      groups.forEach((g) => {
        const card = document.createElement('div');
        card.className = 'folder-card';
        card.innerHTML = `
          <div class="folder-card-left">
            <div class="folder-icon-wrap">${SVG_ICONS.folder}</div>
            <div>
              <div class="folder-name">${g.name}</div>
              <div class="folder-count">${g.tracks.length} TRACKS // ${formatBytes(g.tracks.reduce((acc, t) => acc + (t.size || 0), 0))}</div>
            </div>
          </div>
          <button class="btn" style="padding: 4px 10px; font-size: 9px;">PLAY</button>
        `;
        card.addEventListener('click', () => {
          if (g.tracks.length > 0) {
            playTrackById(g.tracks[0].id);
          }
        });
        el.trackList.appendChild(card);
      });
      return;
    }

    if (state.currentFilter === 'queue') {
      el.trackList.innerHTML = '';
      if (state.playQueue.length === 0) {
        el.trackList.innerHTML = `
          <div style="padding: 30px; text-align: center; color: var(--text-muted);">
            <div style="font-family: var(--font-ndot); font-size: 11px; margin-bottom: 6px;">PLAYBACK QUEUE EMPTY</div>
            <div style="font-size: 10px;">TAP [+] ON ANY TRACK TO ADD IT TO UP NEXT</div>
          </div>
        `;
        return;
      }

      const queueHeader = document.createElement('div');
      queueHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; font-size: 10px; color: var(--text-secondary);';
      queueHeader.innerHTML = `
        <span>UP NEXT (${state.playQueue.length} TRACKS)</span>
        <button class="btn" id="btn-clear-queue" style="font-size: 9px; padding: 2px 6px;">CLEAR</button>
      `;
      el.trackList.appendChild(queueHeader);
      const clearBtn = queueHeader.querySelector('#btn-clear-queue');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          state.playQueue = [];
          renderTrackList();
          showToast('QUEUE CLEARED');
        });
      }

      state.playQueue.forEach((track, qIdx) => {
        const item = document.createElement('div');
        item.className = 'track-item';
        item.innerHTML = `
          <div class="track-item-left">
            <span style="font-family: var(--font-ndot); font-size: 10px; color: var(--accent-red); width: 16px;">${qIdx + 1}</span>
            <div class="track-meta-wrap">
              <div class="track-title">${track.title || track.name}</div>
              <div class="track-artist">${track.artist || 'Unknown'} // ${track.album || 'Local'}</div>
            </div>
          </div>
          <button class="btn" style="padding: 3px 8px; font-size: 9px;">PLAY</button>
        `;
        item.addEventListener('click', () => {
          state.playQueue.splice(qIdx, 1);
          playTrackById(track.id);
        });
        el.trackList.appendChild(item);
      });
      return;
    }

    const tracks = getFilteredTracks();

    if (tracks.length === 0 && state.library.length > 0) {
      el.trackList.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-muted);">
          NO MATCHING TRACKS FOUND
        </div>
      `;
      return;
    }

    el.trackList.innerHTML = '';
    const currentTrack = state.library[state.currentTrackIndex];

    tracks.forEach((track) => {
      const isActive = currentTrack && currentTrack.id === track.id;
      const item = document.createElement('div');
      item.className = `track-item ${isActive ? 'active' : ''}`;

      const coverHtml = track.picture 
        ? `<img class="track-cover-mini" src="${track.picture}" alt="Art"/>`
        : `<img class="track-cover-mini" src="icon.svg" alt="Art"/>`;

      item.innerHTML = `
        <div class="track-item-left">
          ${coverHtml}
          <div class="track-meta-wrap">
            <div class="track-title">${track.title || track.name}${isActive ? '<span class="now-playing-bars"><span></span><span></span><span></span></span>' : ''}</div>
            <div class="track-artist">${track.artist || 'Unknown'} // ${track.album || 'Local'}</div>
          </div>
        </div>
        <div class="track-meta-right">
          <span>${formatBytes(track.size)}</span>
          <button class="track-action-btn queue-add-btn" data-id="${track.id}" title="Add to Up Next Queue">
            ${SVG_ICONS.queueAdd}
          </button>
          <button class="fav-star-btn ${track.favorite ? 'active' : ''}" data-id="${track.id}" aria-label="Toggle favorite">
            ${SVG_ICONS.star}
          </button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.queue-add-btn')) {
          e.stopPropagation();
          triggerHaptic(15);
          state.playQueue.push(track);
          showToast(`[+] "${(track.title || track.name).slice(0, 20)}" QUEUED`);
          return;
        }
        if (e.target.closest('.fav-star-btn')) {
          e.stopPropagation();
          toggleFavorite(track.id);
          return;
        }
        playTrackById(track.id);
      });

      el.trackList.appendChild(item);
    });
  }

  async function toggleFavorite(trackId) {
    const isFav = await storage.toggleFavorite(trackId);
    const track = state.library.find(t => t.id === trackId);
    if (track) track.favorite = isFav;
    renderTrackList();
    showToast(isFav ? '[·] ADDED TO FAVORITES' : 'REMOVED FROM FAVORITES');
  }

  // 4. Playback Logic
  async function playTrackById(trackId) {
    const idx = state.library.findIndex(t => t.id === trackId);
    if (idx !== -1) {
      state.currentTrackIndex = idx;
      await loadAndPlayCurrentTrack();
      if (window.innerWidth < 1024) {
        switchTab('view-player');
      }
    }
  }

  async function loadAndPlayCurrentTrack() {
    const track = state.library[state.currentTrackIndex];
    if (!track) return;

    let file = track.file;
    if (!file && window.memoryFiles && window.memoryFiles.has(track.id)) {
      file = window.memoryFiles.get(track.id);
    }

    if (!file && !track.url && !track.contentUri) {
      showToast('FILE ACCESS NEEDED: CLICK [AUTOSCAN DEVICE] TO CONNECT');
      return;
    }

    try {
      await audioEngine.loadTrack(track);
      await audioEngine.play();
      updateNowPlayingUI(track);
      renderTrackList();
      setupMediaSession(track);
      if (window.AndroidApp && window.AndroidApp.updatePlaybackState) {
        window.AndroidApp.updatePlaybackState(
          true,
          track.title || track.name,
          track.artist || 'Unknown Artist',
          track.album || 'Local Storage'
        );
      }
      showToast(`PLAYING: ${track.title}`);
    } catch (err) {
      console.warn('Playback error:', err);
      showToast('PLAYBACK ERROR: ' + err.message);
    }
  }

  function setupMediaSession(track) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || track.name,
        artist: track.artist || 'Unknown Artist',
        album: track.album || 'Local Storage',
        artwork: track.picture ? [{ src: track.picture, sizes: '512x512', type: 'image/jpeg' }] : []
      });

      navigator.mediaSession.setActionHandler('play', () => audioEngine.play());
      navigator.mediaSession.setActionHandler('pause', () => audioEngine.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNextTrack());
      navigator.mediaSession.setActionHandler('seekbackward', () => audioEngine.seek(audioEngine.audio.currentTime - 10));
      navigator.mediaSession.setActionHandler('seekforward', () => audioEngine.seek(audioEngine.audio.currentTime + 10));
    }
  }

  function updateNowPlayingUI(track) {
    if (el.heroTitle) el.heroTitle.textContent = track.title || track.name;
    if (el.heroArtist) el.heroArtist.textContent = `${track.artist || 'Unknown Artist'} — ${track.album || 'Local Audio'}`;
    if (el.heroFormat) el.heroFormat.textContent = track.format || 'AUDIO';
    if (el.heroSize) el.heroSize.textContent = formatBytes(track.size);

    if (el.albumArt) {
      el.albumArt.src = track.picture || 'icon.svg';
      el.albumArt.style.display = 'block';
    }

    if (el.btnPlayPause) {
      el.btnPlayPause.innerHTML = SVG_ICONS.pause;
      el.btnPlayPause.setAttribute('title', 'Pause (Space)');
    }

    // Update Floating Mini-Player
    if (el.miniTrackTitle) el.miniTrackTitle.textContent = track.title || track.name;
    if (el.miniTrackArtist) el.miniTrackArtist.textContent = `${track.artist || 'Unknown Artist'} // ${track.album || 'Local'}`;
    if (el.miniAlbumArt) el.miniAlbumArt.src = track.picture || 'icon.svg';
    if (el.miniBtnPlay) el.miniBtnPlay.innerHTML = SVG_ICONS.pause;

    const activePanel = document.querySelector('.view-panel.active');
    if (activePanel && activePanel.id !== 'view-player' && el.miniPlayerBar) {
      el.miniPlayerBar.classList.add('visible');
    }

    if (el.lyricsCurrentLine) {
      el.lyricsCurrentLine.textContent = `▶ ${(track.title || track.name).toUpperCase()}`;
    }
  }

  function playNextTrack() {
    triggerHaptic(15);
    if (state.library.length === 0) return;

    if (state.playQueue.length > 0) {
      const nextTrack = state.playQueue.shift();
      const idx = state.library.findIndex(t => t.id === nextTrack.id);
      if (idx !== -1) {
        state.currentTrackIndex = idx;
        loadAndPlayCurrentTrack();
        return;
      }
    }

    if (state.isShuffle) {
      state.currentTrackIndex = Math.floor(Math.random() * state.library.length);
    } else {
      state.currentTrackIndex = (state.currentTrackIndex + 1) % state.library.length;
    }
    loadAndPlayCurrentTrack();
  }

  function playPrevTrack() {
    triggerHaptic(15);
    if (state.library.length === 0) return;
    if (audioEngine.audio.currentTime > 3) {
      audioEngine.seek(0);
      return;
    }
    if (state.isShuffle) {
      state.currentTrackIndex = Math.floor(Math.random() * state.library.length);
    } else {
      state.currentTrackIndex = (state.currentTrackIndex - 1 + state.library.length) % state.library.length;
    }
    loadAndPlayCurrentTrack();
  }

  // Audio Engine Hooks
  audioEngine.onTimeUpdate = (current, total) => {
    if (el.timeCurrent) el.timeCurrent.textContent = formatTime(current);
    if (el.timeTotal) el.timeTotal.textContent = formatTime(total);
    if (total > 0) {
      const pct = (current / total) * 100;
      if (el.seekSlider) {
        el.seekSlider.style.setProperty('--seek-pct', `${pct}%`);
        if (!el.seekSlider.matches(':active')) {
          el.seekSlider.value = (current / total) * 1000;
        }
      }
      if (el.miniSeekLine) {
        el.miniSeekLine.style.setProperty('--mini-progress', `${pct}%`);
      }
    }
  };

  audioEngine.onTrackEnded = () => {
    if (state.repeatMode === 'one') {
      audioEngine.seek(0);
      audioEngine.play();
    } else if (state.playQueue.length > 0) {
      const nextTrack = state.playQueue.shift();
      const idx = state.library.findIndex(t => t.id === nextTrack.id);
      if (idx !== -1) {
        state.currentTrackIndex = idx;
        loadAndPlayCurrentTrack();
      } else {
        playNextTrack();
      }
    } else if (state.repeatMode === 'all') {
      playNextTrack();
    } else {
      if (state.currentTrackIndex < state.library.length - 1) {
        playNextTrack();
      } else {
        audioEngine.pause();
      }
    }
  };

  audioEngine.onPlayStateChange = (isPlaying) => {
    if (el.btnPlayPause) {
      el.btnPlayPause.innerHTML = isPlaying ? SVG_ICONS.pause : SVG_ICONS.play;
      el.btnPlayPause.classList.toggle('playing', isPlaying);
    }
    if (el.miniBtnPlay) {
      el.miniBtnPlay.innerHTML = isPlaying ? SVG_ICONS.pause : SVG_ICONS.play;
    }
    if (el.albumArt) {
      el.albumArt.classList.toggle('playing', isPlaying);
    }
    renderTrackList();
    const currentTrack = state.library[state.currentTrackIndex];
    if (window.AndroidApp && window.AndroidApp.updatePlaybackState) {
      const title = currentTrack ? (currentTrack.title || currentTrack.name) : 'Dot Music Player';
      const artist = currentTrack ? (currentTrack.artist || 'Unknown Artist') : 'Offline Audio';
      const album = currentTrack ? (currentTrack.album || 'Local Storage') : 'Nothing OS';
      window.AndroidApp.updatePlaybackState(isPlaying, title, artist, album);
    }
  };

  window.playNextTrack = playNextTrack;
  window.playPrevTrack = playPrevTrack;
  window.audioEngine = audioEngine;

  // 5. Controls Bindings
  if (el.btnPlayPause) {
    el.btnPlayPause.addEventListener('click', () => {
      triggerHaptic(20);
      if (audioEngine.isDemoSynthPlaying) {
        audioEngine.stopDemoSynth();
        return;
      }
      if (state.currentTrackIndex === -1 && state.library.length > 0) {
        state.currentTrackIndex = 0;
        loadAndPlayCurrentTrack();
        return;
      }
      audioEngine.togglePlay();
    });
  }

  if (el.btnNext) el.btnNext.addEventListener('click', playNextTrack);
  if (el.btnPrev) el.btnPrev.addEventListener('click', playPrevTrack);

  if (el.seekSlider) {
    el.seekSlider.addEventListener('input', () => {
      const dur = audioEngine.audio.duration;
      if (dur) {
        const targetSec = (el.seekSlider.value / 1000) * dur;
        audioEngine.seek(targetSec);
      }
    });
  }

  if (el.volSlider) {
    el.volSlider.addEventListener('input', () => {
      const vol = el.volSlider.value / 100;
      audioEngine.setVolume(vol);
      if (el.btnMute) {
        el.btnMute.innerHTML = vol === 0 ? SVG_ICONS.volumeMute : SVG_ICONS.volume;
      }
    });
  }

  if (el.btnMute) {
    el.btnMute.addEventListener('click', () => {
      if (audioEngine.audio.volume > 0) {
        el.volSlider.dataset.prevVol = el.volSlider.value;
        audioEngine.setVolume(0);
        el.volSlider.value = 0;
        el.btnMute.innerHTML = SVG_ICONS.volumeMute;
      } else {
        const restore = el.volSlider.dataset.prevVol || 80;
        audioEngine.setVolume(restore / 100);
        el.volSlider.value = restore;
        el.btnMute.innerHTML = SVG_ICONS.volume;
      }
    });
  }

  if (el.btnShuffle) {
    el.btnShuffle.addEventListener('click', () => {
      triggerHaptic(15);
      state.isShuffle = !state.isShuffle;
      el.btnShuffle.classList.toggle('btn-accent', state.isShuffle);
      showToast(state.isShuffle ? 'SHUFFLE: ON' : 'SHUFFLE: OFF');
    });
  }

  if (el.btnRepeat) {
    el.btnRepeat.addEventListener('click', () => {
      triggerHaptic(15);
      const modes = ['all', 'one', 'off'];
      const nextIdx = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      state.repeatMode = modes[nextIdx];
      el.btnRepeat.innerHTML = state.repeatMode === 'one' ? SVG_ICONS.repeatOne : SVG_ICONS.repeat;
      el.btnRepeat.classList.toggle('btn-accent', state.repeatMode !== 'off');
      showToast(`REPEAT: ${state.repeatMode.toUpperCase()}`);
    });
  }

  if (el.btnSpeed) {
    const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    let speedIdx = 0;
    el.btnSpeed.addEventListener('click', () => {
      triggerHaptic(12);
      speedIdx = (speedIdx + 1) % speeds.length;
      const rate = speeds[speedIdx];
      audioEngine.setPlaybackRate(rate);
      el.btnSpeed.textContent = `${rate}x`;
      showToast(`SPEED: ${rate}x`);
    });
  }

  // 6. Visualizer Mode Switching, Theme & Fullscreen
  if (el.visModeTabs) {
    el.visModeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        triggerHaptic(12);
        el.visModeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const modeIndex = parseInt(tab.dataset.mode, 10);
        const name = visualizer.setMode(modeIndex);
        if (el.visModeLabel) el.visModeLabel.textContent = name;
        showToast(`VISUALIZER: ${name}`);
      });
    });
  }

  if (el.btnCycleVis) {
    el.btnCycleVis.addEventListener('click', () => {
      triggerHaptic(15);
      const name = visualizer.nextMode();
      if (el.visModeLabel) el.visModeLabel.textContent = name;
      el.visModeTabs.forEach(t => {
        t.classList.toggle('active', parseInt(t.dataset.mode, 10) === visualizer.mode);
      });
      showToast(`VISUALIZER: ${name}`);
    });
  }

  if (el.btnVisTheme) {
    const themes = ['mono', 'red', 'green', 'amber'];
    let themeIdx = 0;
    el.btnVisTheme.addEventListener('click', () => {
      triggerHaptic(12);
      themeIdx = (themeIdx + 1) % themes.length;
      const theme = themes[themeIdx];
      visualizer.setColorTheme(theme);
      showToast(`THEME: ${theme.toUpperCase()}`);
    });
  }

  function toggleFullscreenVis() {
    state.isFullscreenVis = !state.isFullscreenVis;
    if (visualizerCard) {
      visualizerCard.classList.toggle('fullscreen-mode', state.isFullscreenVis);
    }
    if (el.btnFullscreenVis) {
      el.btnFullscreenVis.textContent = state.isFullscreenVis ? 'COLLAPSE (F)' : 'EXPAND (F)';
    }
    showToast(state.isFullscreenVis ? 'FULLSCREEN VISUALIZER ON' : 'FULLSCREEN OFF');
  }

  if (el.btnFullscreenVis) el.btnFullscreenVis.addEventListener('click', toggleFullscreenVis);

  // 7. AutoScan Device & Folder Pickers
  function openScanModal() {
    if (el.scanModal) {
      el.scanModal.classList.add('active');
      el.scanProgressFill.style.width = '0%';
      el.scanProgressText.textContent = 'READY TO SCAN';
      el.scanConsole.textContent = 'Initializing AutoScan Engine...\n[·] Music Filter: Songs only (>= 1.5 mins)\n[·] Call recordings & voice memos excluded\n';
    }
  }

  function closeScanModal() {
    if (el.scanModal) el.scanModal.classList.remove('active');
  }

  function logScanConsole(msg) {
    if (el.scanConsole) {
      el.scanConsole.textContent += `[·] ${msg}\n`;
      el.scanConsole.scrollTop = el.scanConsole.scrollHeight;
    }
  }

  async function handleAutoScan() {
    triggerHaptic(25);
    openScanModal();

    if (window.AndroidApp && window.AndroidApp.isAndroidApp()) {
      if (el.scanProgressText) el.scanProgressText.textContent = 'SCANNING DEVICE STORAGE...';
      logScanConsole('Connecting to Native Android MediaStore...');
      logScanConsole('Applying Song Filter: >= 1.5 mins, call recordings excluded...');
      window.AndroidApp.scanDeviceAudio();
      return;
    }

    logScanConsole('Requesting device directory access (Music folders)...');

    try {
      const tracks = await scanner.scanDirectoryPicker((prog) => {
        if (prog.stage === 'discovering') {
          el.scanProgressText.textContent = `DISCOVERING: ${prog.foundCount} AUDIO FILES`;
          logScanConsole(`Discovered: ${prog.currentFile}`);
        } else if (prog.stage === 'parsing') {
          el.scanProgressFill.style.width = `${prog.percent}%`;
          el.scanProgressText.textContent = `INDEXING: ${prog.current} / ${prog.total} (${prog.percent}%)`;
          logScanConsole(`Indexed: ${prog.currentTrack.title} [${prog.currentTrack.format}]`);
        }
      });

      logScanConsole(`AutoScan Complete! Added ${tracks.length} tracks to IndexedDB.`);
      showToast(`AUTOSCAN COMPLETE: +${tracks.length} TRACKS`);
      setTimeout(closeScanModal, 1000);
      await reloadLibrary();
    } catch (err) {
      if (err.message === 'FILE_SYSTEM_PICKER_NOT_SUPPORTED') {
        logScanConsole('File System Access API unavailable, opening folder selection dialog...');
        if (el.folderInput) el.folderInput.click();
      } else {
        logScanConsole(`Status: ${err.message || 'Cancelled'}`);
        setTimeout(closeScanModal, 800);
      }
    }
  }

  if (el.btnAutoScan) el.btnAutoScan.addEventListener('click', handleAutoScan);

  if (el.btnScanFolder) {
    el.btnScanFolder.addEventListener('click', () => {
      if (window.AndroidApp && window.AndroidApp.isAndroidApp()) {
        handleAutoScan();
      } else if (el.folderInput) {
        el.folderInput.click();
      }
    });
    el.folderInput.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        openScanModal();
        logScanConsole(`Processing folder input: ${files.length} items...`);
        const tracks = await scanner.scanFileInput(files, (prog) => {
          el.scanProgressFill.style.width = `${prog.percent}%`;
          el.scanProgressText.textContent = `INDEXING: ${prog.current} / ${prog.total} (${prog.percent}%)`;
        });
        logScanConsole(`Done! Added ${tracks.length} tracks.`);
        setTimeout(closeScanModal, 1000);
        await reloadLibrary();
      }
    });
  }

  if (el.btnScanFiles && el.filesInput) {
    el.btnScanFiles.addEventListener('click', () => el.filesInput.click());
    el.filesInput.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        openScanModal();
        const tracks = await scanner.scanFileInput(files, (prog) => {
          el.scanProgressFill.style.width = `${prog.percent}%`;
          el.scanProgressText.textContent = `INDEXING: ${prog.current} / ${prog.total} (${prog.percent}%)`;
        });
        setTimeout(closeScanModal, 1000);
        await reloadLibrary();
      }
    });
  }

  if (el.btnScanCancel) {
    el.btnScanCancel.addEventListener('click', () => {
      scanner.cancel();
      closeScanModal();
      showToast('SCAN CANCELLED');
    });
  }

  if (el.btnClearLibrary) {
    el.btnClearLibrary.addEventListener('click', async () => {
      if (confirm('Clear all indexed tracks from offline storage?')) {
        await storage.clearAllTracks();
        if (window.memoryFiles) window.memoryFiles.clear();
        state.library = [];
        state.currentTrackIndex = -1;
        audioEngine.pause();
        await reloadLibrary();
        showToast('OFFLINE LIBRARY CLEARED');
      }
    });
  }

  // Export Library JSON
  if (el.btnExportLib) {
    el.btnExportLib.addEventListener('click', () => {
      if (state.library.length === 0) {
        showToast('LIBRARY IS EMPTY');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.library, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "dot_music_library.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('LIBRARY EXPORTED (JSON)');
    });
  }

  // Drag and Drop Scanner
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (el.dropZone) el.dropZone.classList.add('drag-over');
  });

  window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null && el.dropZone) {
      el.dropZone.classList.remove('drag-over');
    }
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (el.dropZone) el.dropZone.classList.remove('drag-over');

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      openScanModal();
      logScanConsole('Reading dropped folders/files...');
      const tracks = await scanner.scanDataTransfer(items, (prog) => {
        if (prog.stage === 'discovering') {
          el.scanProgressText.textContent = `DISCOVERING: ${prog.foundCount} AUDIO FILES`;
        } else if (prog.stage === 'parsing') {
          el.scanProgressFill.style.width = `${prog.percent}%`;
          el.scanProgressText.textContent = `INDEXING: ${prog.current} / ${prog.total} (${prog.percent}%)`;
        }
      });
      logScanConsole(`Added ${tracks.length} tracks.`);
      setTimeout(closeScanModal, 1000);
      await reloadLibrary();
    }
  });

  // Demo Synth Button
  if (el.btnDemoSynth) {
    el.btnDemoSynth.addEventListener('click', () => {
      if (audioEngine.isDemoSynthPlaying) {
        audioEngine.stopDemoSynth();
        el.btnDemoSynth.classList.remove('btn-accent');
        showToast('DEMO SYNTH STOPPED');
      } else {
        audioEngine.playDemoSynth();
        el.btnDemoSynth.classList.add('btn-accent');
        if (el.heroTitle) el.heroTitle.textContent = 'NOTHING CYBER SYNTH (PROCEDURAL)';
        if (el.heroArtist) el.heroArtist.textContent = 'Synthesizer Engine // 124 BPM 8-Bit Darkwave';
        if (el.heroFormat) el.heroFormat.textContent = 'WEB AUDIO SYNTH';
        showToast('PLAYING DEMO CYBER SYNTH TRACK');
      }
    });
  }

  // 8. Equalizer & Presets
  if (el.presetPills) {
    el.presetPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        el.presetPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const presetName = pill.dataset.preset;
        const gains = audioEngine.setPreset(presetName);
        el.eqSliders.forEach((slider, idx) => {
          slider.value = gains[idx] || 0;
          const valLabel = slider.parentElement.querySelector('.eq-band-val');
          if (valLabel) valLabel.textContent = `${slider.value > 0 ? '+' : ''}${slider.value}dB`;
        });
        showToast(`EQ PRESET: ${presetName}`);
      });
    });
  }

  if (el.eqSliders) {
    el.eqSliders.forEach((slider, idx) => {
      slider.addEventListener('input', () => {
        const gain = parseFloat(slider.value);
        audioEngine.setEQBand(idx, gain);
        const valLabel = slider.parentElement.querySelector('.eq-band-val');
        if (valLabel) valLabel.textContent = `${gain > 0 ? '+' : ''}${gain}dB`;
      });
    });
  }

  if (el.panSlider) {
    el.panSlider.addEventListener('input', () => {
      const pan = parseFloat(el.panSlider.value) / 100;
      audioEngine.setPanning(pan);
    });
  }

  // Bass Boost Controls
  if (el.btnBassBoostToggle) {
    el.btnBassBoostToggle.addEventListener('click', () => {
      triggerHaptic(15);
      const isCurrentlyActive = audioEngine.bassBoostEnabled;
      const willBeActive = !isCurrentlyActive;
      const gain = el.bassBoostSlider ? parseFloat(el.bassBoostSlider.value) : 8;
      audioEngine.setBassBoost(willBeActive, gain);
      el.btnBassBoostToggle.textContent = willBeActive ? 'ON' : 'OFF';
      el.btnBassBoostToggle.classList.toggle('bass-boost-active', willBeActive);
      showToast(willBeActive ? `[·] BASS BOOST: ON (+${gain}dB)` : 'BASS BOOST: OFF');
    });
  }

  if (el.bassBoostSlider) {
    el.bassBoostSlider.addEventListener('input', () => {
      const gain = parseFloat(el.bassBoostSlider.value);
      if (el.bassBoostVal) el.bassBoostVal.textContent = `+${gain}dB`;
      audioEngine.setBassBoostGain(gain);
    });
  }

  // Hi-Res Audio Stream Inspector Telemetry
  function updateTelemetry() {
    if (!el.telemSampleRate) return;
    const telem = audioEngine.getAudioTelemetry();
    el.telemSampleRate.textContent = `${(telem.sampleRate || 48000).toLocaleString()} HZ`;
    el.telemChannels.textContent = `${telem.channels} (STEREO)`;
    el.telemState.textContent = telem.state;

    const isPlaying = !audioEngine.audio.paused;
    el.telemBuffer.textContent = isPlaying ? 'HARDWARE DMA' : 'STANDBY';

    // Update Peak Bars
    if (el.peakBarL) {
      el.peakBarL.style.width = `${telem.peakL}%`;
    }
    if (el.peakBarR) {
      el.peakBarR.style.width = `${telem.peakR}%`;
    }
    if (el.peakDbL) {
      el.peakDbL.textContent = telem.peakL > 1 ? `${Math.round((telem.peakL / 100) * 12 - 12)}dB` : '-INF';
    }
    if (el.peakDbR) {
      el.peakDbR.textContent = telem.peakR > 1 ? `${Math.round((telem.peakR / 100) * 12 - 12)}dB` : '-INF';
    }
  }

  setInterval(updateTelemetry, 100);

  // 9. Sleep Timer
  if (el.sleepTimerSelect) {
    el.sleepTimerSelect.addEventListener('change', () => {
      const mins = parseInt(el.sleepTimerSelect.value, 10);
      if (state.sleepTimerId) {
        clearInterval(state.sleepTimerId);
        state.sleepTimerId = null;
      }

      if (mins > 0) {
        state.sleepTimerMinutes = mins;
        state.sleepTimerEndsAt = Date.now() + mins * 60 * 1000;
        showToast(`SLEEP TIMER: ${mins} MINUTES`);

        state.sleepTimerId = setInterval(() => {
          const remaining = Math.max(0, state.sleepTimerEndsAt - Date.now());
          const remMins = Math.floor(remaining / 60000);
          const remSecs = Math.floor((remaining % 60000) / 1000);
          if (el.sleepTimerBadge) {
            el.sleepTimerBadge.textContent = `${remMins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
          }

          if (remaining <= 0) {
            clearInterval(state.sleepTimerId);
            state.sleepTimerId = null;
            let fade = audioEngine.getVolume();
            const fadeInterval = setInterval(() => {
              fade -= 0.1;
              if (fade <= 0) {
                clearInterval(fadeInterval);
                audioEngine.pause();
                audioEngine.setVolume(1.0);
              } else {
                audioEngine.setVolume(fade);
              }
            }, 150);
            showToast('SLEEP TIMER EXPIRED: PAUSED');
          }
        }, 1000);
      } else {
        if (el.sleepTimerBadge) el.sleepTimerBadge.textContent = 'OFF';
        showToast('SLEEP TIMER CANCELLED');
      }
    });
  }

  // 10. Search, Filter Tabs & Sorting
  if (el.searchInput) {
    el.searchInput.addEventListener('input', (e) => {
      state.searchTerm = e.target.value.trim();
      renderTrackList();
    });
  }

  if (el.sortSelect) {
    el.sortSelect.addEventListener('change', (e) => {
      state.sortOrder = e.target.value;
      renderTrackList();
    });
  }

  if (el.libraryTabs) {
    el.libraryTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        el.libraryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.currentFilter = tab.dataset.filter;
        renderTrackList();
      });
    });
  }

  // Mobile Bottom Navigation Tab Switching
  const navTabs = document.querySelectorAll('.nav-tab-btn');
  const viewPanels = document.querySelectorAll('.view-panel');

  function switchTab(targetId) {
    triggerHaptic(15);
    navTabs.forEach((t) => {
      t.classList.toggle('active', t.dataset.target === targetId);
    });
    viewPanels.forEach((p) => {
      p.classList.toggle('active', p.id === targetId);
    });

    if (el.miniPlayerBar) {
      const isNowPlayingView = targetId === 'view-player';
      const hasTrack = state.currentTrackIndex !== -1;
      el.miniPlayerBar.classList.toggle('visible', !isNowPlayingView && hasTrack);
    }
  }

  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.target);
    });
  });

  // Floating Mini-Player Bar Actions
  if (el.miniPlayerBar) {
    if (el.miniPlayerLeft) {
      el.miniPlayerLeft.addEventListener('click', () => {
        switchTab('view-player');
      });
    }
    if (el.miniBtnPlay) {
      el.miniBtnPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerHaptic(15);
        audioEngine.togglePlay();
      });
    }
    if (el.miniBtnNext) {
      el.miniBtnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        playNextTrack();
      });
    }
  }

  // Spatial Acoustic Reverb Controls
  if (el.reverbPills) {
    el.reverbPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        triggerHaptic(15);
        el.reverbPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const preset = pill.dataset.reverb;
        audioEngine.setReverbPreset(preset);
        showToast(`SPATIAL REVERB: ${preset.toUpperCase()}`);
      });
    });
  }

  if (el.reverbMixSlider) {
    el.reverbMixSlider.addEventListener('input', () => {
      const mix = parseFloat(el.reverbMixSlider.value) / 100;
      if (el.reverbMixVal) el.reverbMixVal.textContent = `${Math.round(mix * 100)}%`;
      audioEngine.setReverbMix(mix);
    });
  }

  // Lyrics / HUD Display Toggle
  if (el.btnToggleLyrics) {
    el.btnToggleLyrics.addEventListener('click', () => {
      triggerHaptic(15);
      state.isLyricsOpen = !state.isLyricsOpen;
      el.btnToggleLyrics.classList.toggle('active', state.isLyricsOpen);
      if (el.lyricsDisplay) {
        el.lyricsDisplay.classList.toggle('visible', state.isLyricsOpen);
      }
      showToast(state.isLyricsOpen ? 'LYRICS / HUD: ON' : 'LYRICS / HUD: OFF');
    });
  }

  // Customization Center Modal & Theme Palettes
  if (el.btnSettings && el.settingsModal) {
    el.btnSettings.addEventListener('click', () => {
      triggerHaptic(15);
      el.settingsModal.classList.add('active');
    });
  }

  if (el.btnSettingsClose && el.settingsModal) {
    el.btnSettingsClose.addEventListener('click', () => {
      triggerHaptic(15);
      el.settingsModal.classList.remove('active');
    });
  }

  const THEME_PALETTES = {
    red: { color: '#d71921', glow: 'rgba(215, 25, 33, 0.4)', name: 'NOTHING RED' },
    white: { color: '#ffffff', glow: 'rgba(255, 255, 255, 0.4)', name: 'DOT WHITE' },
    amber: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', name: 'CYBER AMBER' },
    green: { color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', name: 'MATRIX GREEN' },
    cyan: { color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', name: 'PULSE CYAN' }
  };

  if (el.themeColorBtns) {
    el.themeColorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        triggerHaptic(20);
        el.themeColorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.color || 'red';
        const pal = THEME_PALETTES[theme] || THEME_PALETTES.red;
        document.documentElement.style.setProperty('--accent-red', pal.color);
        document.documentElement.style.setProperty('--accent-red-glow', pal.glow);
        state.accentColor = pal.color;
        if (el.themeColorLabel) el.themeColorLabel.textContent = pal.name;
        showToast(`THEME: ${pal.name}`);
      });
    });
  }

  if (el.btnToggleMesh) {
    el.btnToggleMesh.addEventListener('click', () => {
      triggerHaptic(15);
      state.ambientMeshEnabled = !state.ambientMeshEnabled;
      el.btnToggleMesh.textContent = state.ambientMeshEnabled ? 'ON' : 'OFF';
      el.btnToggleMesh.classList.toggle('active', state.ambientMeshEnabled);
      if (el.ambientCanvas) {
        el.ambientCanvas.style.display = state.ambientMeshEnabled ? 'block' : 'none';
      }
      showToast(state.ambientMeshEnabled ? 'KINETIC MESH: ON' : 'KINETIC MESH: OFF');
    });
  }

  if (el.hapticSelect) {
    el.hapticSelect.addEventListener('change', (e) => {
      state.hapticStrength = e.target.value;
      triggerHaptic(25);
      showToast(`HAPTIC: ${state.hapticStrength.toUpperCase()}`);
    });
  }

  if (el.crossfadeSelect) {
    el.crossfadeSelect.addEventListener('change', (e) => {
      state.crossfadeSec = parseFloat(e.target.value);
      showToast(`CROSSFADE: ${state.crossfadeSec}s`);
    });
  }

  // 11. Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        el.btnPlayPause.click();
        break;
      case 'ArrowRight':
        e.preventDefault();
        audioEngine.seek(audioEngine.audio.currentTime + (e.shiftKey ? 15 : 5));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        audioEngine.seek(audioEngine.audio.currentTime - (e.shiftKey ? 15 : 5));
        break;
      case 'ArrowUp':
        e.preventDefault();
        audioEngine.setVolume(Math.min(1, audioEngine.getVolume() + 0.05));
        if (el.volSlider) el.volSlider.value = audioEngine.getVolume() * 100;
        break;
      case 'ArrowDown':
        e.preventDefault();
        audioEngine.setVolume(Math.max(0, audioEngine.getVolume() - 0.05));
        if (el.volSlider) el.volSlider.value = audioEngine.getVolume() * 100;
        break;
      case 'KeyJ':
        playPrevTrack();
        break;
      case 'KeyK':
        playNextTrack();
        break;
      case 'KeyM':
        if (el.btnMute) el.btnMute.click();
        break;
      case 'KeyV':
        if (el.btnCycleVis) el.btnCycleVis.click();
        break;
      case 'KeyF':
        toggleFullscreenVis();
        break;
      case 'KeyS':
        if (el.btnShuffle) el.btnShuffle.click();
        break;
      case 'KeyR':
        if (el.btnRepeat) el.btnRepeat.click();
        break;
      case 'Slash':
        e.preventDefault();
        if (el.searchInput) el.searchInput.focus();
        break;
      case 'QuestionMark':
        if (el.shortcutsModal) el.shortcutsModal.classList.toggle('active');
        break;
    }
  });

  if (el.btnShortcuts && el.shortcutsModal) {
    el.btnShortcuts.addEventListener('click', () => el.shortcutsModal.classList.add('active'));
  }
  if (el.btnShortcutsClose && el.shortcutsModal) {
    el.btnShortcutsClose.addEventListener('click', () => el.shortcutsModal.classList.remove('active'));
  }

  // 12. Kinetic Ambient Dot-Matrix Mesh Canvas with Touch Ripple Physics
  function initAmbientMesh() {
    const canvas = el.ambientCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    const ripples = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('pointerdown', (e) => {
      if (!state.ambientMeshEnabled) return;
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: Math.min(width, height) * 0.45,
        alpha: 0.7,
        speed: 4.5
      });
      if (ripples.length > 8) ripples.shift();
    });

    const spacing = 32;

    function renderMesh() {
      if (!state.ambientMeshEnabled) {
        requestAnimationFrame(renderMesh);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      let energy = 0;
      if (audioEngine && audioEngine.analyser && !audioEngine.audio.paused) {
        const freqData = new Uint8Array(16);
        audioEngine.analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < 8; i++) sum += freqData[i];
        energy = sum / (8 * 255);
      }

      const time = performance.now() * 0.0015;

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha -= 0.015;
        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
        }
      }

      const cols = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const x = c * spacing;
          const y = r * spacing;

          const wave = Math.sin(x * 0.02 + time) * Math.cos(y * 0.02 + time * 0.7);
          let dotRadius = 0.85 + (wave * 0.5 + 0.5) * (0.8 + energy * 2.2);
          let alpha = 0.12 + (wave * 0.5 + 0.5) * 0.15 + energy * 0.25;

          for (let i = 0; i < ripples.length; i++) {
            const rip = ripples[i];
            const dx = x - rip.x;
            const dy = y - rip.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const delta = Math.abs(dist - rip.radius);
            if (delta < 50) {
              const boost = (1 - delta / 50) * rip.alpha;
              dotRadius += boost * 3.5;
              alpha = Math.min(1, alpha + boost * 0.6);
            }
          }

          ctx.fillStyle = energy > 0.4 ? state.accentColor : '#ffffff';
          ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.5, dotRadius), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1.0;
      requestAnimationFrame(renderMesh);
    }

    requestAnimationFrame(renderMesh);
  }

  initAmbientMesh();

  // Initial load
  await reloadLibrary();
});

