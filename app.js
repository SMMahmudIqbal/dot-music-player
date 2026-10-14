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
    currentTrackIndex: -1,
    currentFilter: 'all', // 'all', 'favorites'
    sortOrder: 'title-asc',
    searchTerm: '',
    isShuffle: false,
    repeatMode: 'all', // 'off', 'all', 'one'
    isFullscreenVis: false,
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
    // Tuning & EQ
    presetPills: document.querySelectorAll('.preset-pill'),
    eqSliders: document.querySelectorAll('.eq-slider-vertical'),
    panSlider: document.getElementById('pan-slider'),
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
    toastNotice: document.getElementById('toast-notice')
  };

  // 1. Initialize Storage & Visualizer
  try {
    await storage.init();
    visualizer.start();
  } catch (e) {
    console.error('Storage or Visualizer init error:', e);
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

  // 2. Load Tracks from IndexedDB
  async function reloadLibrary() {
    const tracks = await storage.getAllTracks();
    state.library = tracks;
    updateTrackCountBadge();
    renderTrackList();

    if (state.library.length === 0) {
      if (el.trackList) {
        el.trackList.innerHTML = `
          <div style="padding: 24px 12px; text-align: center; color: var(--text-muted); line-height: 1.8;">
            <div style="font-size: 20px; margin-bottom: 8px;">[ · ]</div>
            NO LOCAL TRACKS LOADED<br/>
            CLICK <strong style="color: var(--text-primary);">[ AUTOSCAN DEVICE ]</strong><br/>
            OR DROP FOLDER / CLICK DEMO SYNTH
          </div>
        `;
      }
    }
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

  function renderTrackList() {
    if (!el.trackList) return;
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
        : `<div class="track-cover-mini">●</div>`;

      item.innerHTML = `
        <div class="track-item-left">
          ${coverHtml}
          <div class="track-meta-wrap">
            <div class="track-title">${track.title || track.name}</div>
            <div class="track-artist">${track.artist || 'Unknown'} // ${track.album || 'Local'}</div>
          </div>
        </div>
        <div class="track-meta-right">
          <span>${formatBytes(track.size)}</span>
          <button class="fav-star-btn ${track.favorite ? 'active' : ''}" data-id="${track.id}" aria-label="Toggle favorite">
            ${track.favorite ? '★' : '☆'}
          </button>
        </div>
      `;

      item.addEventListener('click', (e) => {
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
    showToast(isFav ? 'ADDED TO FAVORITES [★]' : 'REMOVED FROM FAVORITES');
  }

  // 4. Playback Logic
  async function playTrackById(trackId) {
    const idx = state.library.findIndex(t => t.id === trackId);
    if (idx !== -1) {
      state.currentTrackIndex = idx;
      await loadAndPlayCurrentTrack();
    }
  }

  async function loadAndPlayCurrentTrack() {
    const track = state.library[state.currentTrackIndex];
    if (!track) return;

    let file = track.file;
    if (!file && window.memoryFiles && window.memoryFiles.has(track.id)) {
      file = window.memoryFiles.get(track.id);
    }

    if (!file) {
      showToast('FILE ACCESS NEEDED: CLICK [AUTOSCAN DEVICE] TO CONNECT');
      return;
    }

    try {
      await audioEngine.loadTrack(track);
      await audioEngine.play();
      updateNowPlayingUI(track);
      renderTrackList();
      setupMediaSession(track);
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
      if (track.picture) {
        el.albumArt.src = track.picture;
        el.albumArt.style.display = 'block';
      } else {
        el.albumArt.src = '';
        el.albumArt.style.display = 'none';
      }
    }

    if (el.btnPlayPause) {
      el.btnPlayPause.textContent = '⏸';
      el.btnPlayPause.setAttribute('title', 'Pause (Space)');
    }
  }

  function playNextTrack() {
    if (state.library.length === 0) return;
    if (state.isShuffle) {
      state.currentTrackIndex = Math.floor(Math.random() * state.library.length);
    } else {
      state.currentTrackIndex = (state.currentTrackIndex + 1) % state.library.length;
    }
    loadAndPlayCurrentTrack();
  }

  function playPrevTrack() {
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
    if (el.seekSlider && total > 0 && !el.seekSlider.matches(':active')) {
      el.seekSlider.value = (current / total) * 1000;
    }
  };

  audioEngine.onTrackEnded = () => {
    if (state.repeatMode === 'one') {
      audioEngine.seek(0);
      audioEngine.play();
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
      el.btnPlayPause.textContent = isPlaying ? '⏸' : '▶';
    }
  };

  // 5. Controls Bindings
  if (el.btnPlayPause) {
    el.btnPlayPause.addEventListener('click', () => {
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
        el.btnMute.textContent = vol === 0 ? '🔇' : '🔊';
      }
    });
  }

  if (el.btnMute) {
    el.btnMute.addEventListener('click', () => {
      if (audioEngine.audio.volume > 0) {
        el.volSlider.dataset.prevVol = el.volSlider.value;
        audioEngine.setVolume(0);
        el.volSlider.value = 0;
        el.btnMute.textContent = '🔇';
      } else {
        const restore = el.volSlider.dataset.prevVol || 80;
        audioEngine.setVolume(restore / 100);
        el.volSlider.value = restore;
        el.btnMute.textContent = '🔊';
      }
    });
  }

  if (el.btnShuffle) {
    el.btnShuffle.addEventListener('click', () => {
      state.isShuffle = !state.isShuffle;
      el.btnShuffle.classList.toggle('btn-accent', state.isShuffle);
      showToast(state.isShuffle ? 'SHUFFLE: ON' : 'SHUFFLE: OFF');
    });
  }

  if (el.btnRepeat) {
    el.btnRepeat.addEventListener('click', () => {
      const modes = ['all', 'one', 'off'];
      const nextIdx = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      state.repeatMode = modes[nextIdx];
      el.btnRepeat.textContent = state.repeatMode === 'one' ? '🔂' : '🔁';
      el.btnRepeat.classList.toggle('btn-accent', state.repeatMode !== 'off');
      showToast(`REPEAT: ${state.repeatMode.toUpperCase()}`);
    });
  }

  if (el.btnSpeed) {
    const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    let speedIdx = 0;
    el.btnSpeed.addEventListener('click', () => {
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
      el.scanConsole.textContent = 'Initializing AutoScan Engine...\n';
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
    openScanModal();
    logScanConsole('Requesting device directory access...');

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

  if (el.btnScanFolder && el.folderInput) {
    el.btnScanFolder.addEventListener('click', () => el.folderInput.click());
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

  // Mobile Drawer Toggle Bindings
  if (el.btnToggleLibrary && el.sidebarPanel) {
    el.btnToggleLibrary.addEventListener('click', () => {
      el.sidebarPanel.classList.toggle('open-panel');
      if (el.tuningPanel) el.tuningPanel.classList.remove('open-panel');
    });
  }

  if (el.btnToggleEq && el.tuningPanel) {
    el.btnToggleEq.addEventListener('click', () => {
      el.tuningPanel.classList.toggle('open-panel');
      if (el.sidebarPanel) el.sidebarPanel.classList.remove('open-panel');
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

  // Initial load
  await reloadLibrary();
});
