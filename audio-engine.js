/**
 * Web Audio API Engine & Offline Synthesizer
 * Dot Music Player - 100% Offline
 * Author: Developed by S. M. Mahmud Iqbal
 */

class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'metadata';

    this.audioCtx = null;
    this.sourceNode = null;
    this.analyser = null;
    this.analyserL = null;
    this.analyserR = null;
    this.splitter = null;
    this.panner = null;
    this.preamp = null;
    this.bassBoostFilter = null;
    this.bassBoostEnabled = false;
    this.bassBoostGain = 8;
    this.reverbConvolver = null;
    this.reverbDryGain = null;
    this.reverbWetGain = null;
    this.reverbPreset = 'OFF';
    this.reverbMix = 0.3;
    this.compressor = null;
    this.masterGain = null;

    // Binaural 3D Spatial Audio (HRTF Headphone Soundstage)
    this.spatialPanner = null;
    this.spatialMode = 'OFF'; // 'OFF', 'WIDE', 'BINAURAL', 'ARENA'
    this.spatialAzimuth = 0; // 0 to 360 degrees
    this.spatialElevation = 0; // -90 to +90 degrees

    // 10-Band Graphic Equalizer Frequencies
    this.eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    this.eqFilters = [];
    this.eqGains = new Array(10).fill(0); // dB

    this.isInitialized = false;
    this.currentTrack = null;
    this.currentObjectURL = null;

    // Built-in offline demo synth state
    this.synthInterval = null;
    this.isDemoSynthPlaying = false;
    this.synthGain = null;

    // Callbacks
    this.onTimeUpdate = null;
    this.onTrackEnded = null;
    this.onPlayStateChange = null;
    this.onMetadataLoaded = null;

    this.bindEvents();
  }

  initAudioContext() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      // Analysers
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;

      this.analyserL = this.audioCtx.createAnalyser();
      this.analyserL.fftSize = 128;
      this.analyserL.smoothingTimeConstant = 0.8;

      this.analyserR = this.audioCtx.createAnalyser();
      this.analyserR.fftSize = 128;
      this.analyserR.smoothingTimeConstant = 0.8;

      // Source
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

      // Preamp & Master Gain
      this.preamp = this.audioCtx.createGain();
      this.preamp.gain.value = 1.0;

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.85;

      // Dynamics Compressor (Limiter) to prevent digital clipping on heavy bass
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-1.5, this.audioCtx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.audioCtx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.audioCtx.currentTime);

      // Stereo Panner
      if (this.audioCtx.createStereoPanner) {
        this.panner = this.audioCtx.createStereoPanner();
      }

      // 10-band Filters
      this.eqFilters = this.eqFrequencies.map((freq, idx) => {
        const filter = this.audioCtx.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === this.eqFrequencies.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = this.eqGains[idx] || 0;
        return filter;
      });

      // Dynamic Bass Boost Sub-bass Filter (80Hz resonant low-shelf)
      this.bassBoostFilter = this.audioCtx.createBiquadFilter();
      this.bassBoostFilter.type = 'lowshelf';
      this.bassBoostFilter.frequency.value = 80;
      this.bassBoostFilter.gain.value = this.bassBoostEnabled ? this.bassBoostGain : 0;

      // Splitter for stereo VU analysis
      this.splitter = this.audioCtx.createChannelSplitter(2);

      // Audio Graph Pipeline:
      // Source -> Preamp -> BassBoost -> [EQ Filters] -> Panner -> MasterGain -> Compressor -> Analyser -> Destination
      let currentNode = this.sourceNode;
      currentNode.connect(this.preamp);
      currentNode = this.preamp;

      currentNode.connect(this.bassBoostFilter);
      currentNode = this.bassBoostFilter;

      for (const filter of this.eqFilters) {
        currentNode.connect(filter);
        currentNode = filter;
      }

      if (this.panner) {
        currentNode.connect(this.panner);
        currentNode = this.panner;
      }

      // Binaural 3D Spatial Audio Panner (HRTF)
      if (this.audioCtx.createPanner) {
        try {
          this.spatialPanner = this.audioCtx.createPanner();
          this.spatialPanner.panningModel = 'HRTF';
          this.spatialPanner.distanceModel = 'inverse';
          this.spatialPanner.refDistance = 1;
          this.spatialPanner.maxDistance = 10000;
          this.spatialPanner.rolloffFactor = 1;
          this.spatialPanner.coneInnerAngle = 360;

          // Configure listener at center origin
          const listener = this.audioCtx.listener;
          if (listener.positionX) {
            listener.positionX.setValueAtTime(0, this.audioCtx.currentTime);
            listener.positionY.setValueAtTime(0, this.audioCtx.currentTime);
            listener.positionZ.setValueAtTime(0, this.audioCtx.currentTime);
            listener.forwardX.setValueAtTime(0, this.audioCtx.currentTime);
            listener.forwardY.setValueAtTime(0, this.audioCtx.currentTime);
            listener.forwardZ.setValueAtTime(-1, this.audioCtx.currentTime);
            listener.upX.setValueAtTime(0, this.audioCtx.currentTime);
            listener.upY.setValueAtTime(1, this.audioCtx.currentTime);
            listener.upZ.setValueAtTime(0, this.audioCtx.currentTime);
          } else if (listener.setOrientation) {
            listener.setPosition(0, 0, 0);
            listener.setOrientation(0, 0, -1, 0, 1, 0);
          }

          currentNode.connect(this.spatialPanner);
          currentNode = this.spatialPanner;
        } catch (err) {
          console.warn('Spatial Panner HRTF init failed, fallback to stereo:', err);
        }
      }

      // Spatial Reverb Convolver & Mixer
      this.reverbConvolver = this.audioCtx.createConvolver();
      this.reverbDryGain = this.audioCtx.createGain();
      this.reverbWetGain = this.audioCtx.createGain();
      this.reverbDryGain.gain.value = 1.0;
      this.reverbWetGain.gain.value = 0.0;

      currentNode.connect(this.masterGain);

      // Split Master into Dry and Reverb Convolver paths -> Compressor
      this.masterGain.connect(this.reverbDryGain);
      this.reverbDryGain.connect(this.compressor);

      this.masterGain.connect(this.reverbConvolver);
      this.reverbConvolver.connect(this.reverbWetGain);
      this.reverbWetGain.connect(this.compressor);

      this.compressor.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      // Stereo Splitter to Dual Analysers for VU Meter
      this.compressor.connect(this.splitter);
      this.splitter.connect(this.analyserL, 0);
      this.splitter.connect(this.analyserR, 1);

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext init postponed or failed:', e);
    }
  }

  bindEvents() {
    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (this.onTrackEnded) this.onTrackEnded();
    });

    this.audio.addEventListener('play', () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if (this.onPlayStateChange) this.onPlayStateChange(true);
    });

    this.audio.addEventListener('pause', () => {
      if (this.onPlayStateChange) this.onPlayStateChange(false);
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.onMetadataLoaded) {
        this.onMetadataLoaded(this.audio.duration);
      }
    });
  }

  async loadTrack(track) {
    this.stopDemoSynth();
    this.initAudioContext();

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {}
    }

    if (this.currentObjectURL) {
      URL.revokeObjectURL(this.currentObjectURL);
      this.currentObjectURL = null;
    }

    this.currentTrack = track;

    // Check memory files cache, track.file, or streaming track.url
    let file = track.file;
    if (!file && window.memoryFiles && window.memoryFiles.has(track.id)) {
      file = window.memoryFiles.get(track.id);
    }

    if (file) {
      this.currentObjectURL = URL.createObjectURL(file);
      this.audio.src = this.currentObjectURL;
    } else if (track.url) {
      this.audio.src = track.url;
    } else if (track.contentUri) {
      this.audio.src = track.contentUri;
    } else {
      throw new Error('FILE_HANDLE_EXPIRED');
    }

    await this.audio.load();
  }

  async play() {
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {}
    }
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  togglePlay() {
    if (this.isDemoSynthPlaying) {
      this.stopDemoSynth();
      return false;
    }
    if (this.audio.paused) {
      this.play();
      return true;
    } else {
      this.pause();
      return false;
    }
  }

  seek(seconds) {
    if (Number.isFinite(seconds) && this.audio.duration) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
    }
  }

  setVolume(val) {
    // 0.0 to 1.0
    const clamped = Math.max(0, Math.min(val, 1));
    this.audio.volume = clamped;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(clamped, this.audioCtx.currentTime);
    }
  }

  getVolume() {
    return this.audio.volume;
  }

  setPlaybackRate(rate) {
    this.audio.playbackRate = rate;
  }

  setPanning(pan) {
    // -1 (left) to 1 (right)
    if (this.panner && this.panner.pan && this.audioCtx) {
      this.panner.pan.setValueAtTime(Math.max(-1, Math.min(pan, 1)), this.audioCtx.currentTime);
    }
  }

  setEQBand(index, gainDB) {
    this.eqGains[index] = gainDB;
    if (this.eqFilters[index] && this.audioCtx) {
      this.eqFilters[index].gain.setValueAtTime(gainDB, this.audioCtx.currentTime);
    }
  }

  setBassBoost(enabled, gainDb) {
    this.bassBoostEnabled = !!enabled;
    if (gainDb !== undefined) this.bassBoostGain = Math.max(0, Math.min(15, gainDb));
    if (this.bassBoostFilter && this.audioCtx) {
      const targetGain = this.bassBoostEnabled ? this.bassBoostGain : 0;
      this.bassBoostFilter.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.02);
    }
  }

  setBassBoostGain(gainDb) {
    this.bassBoostGain = Math.max(0, Math.min(15, gainDb));
    if (this.bassBoostEnabled && this.bassBoostFilter && this.audioCtx) {
      this.bassBoostFilter.gain.setTargetAtTime(this.bassBoostGain, this.audioCtx.currentTime, 0.02);
    }
  }

  createImpulseResponse(durationSec, decay) {
    if (!this.audioCtx) return null;
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const impulse = this.audioCtx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  setReverbPreset(name) {
    this.reverbPreset = (name || 'OFF').toUpperCase();
    if (!this.audioCtx || !this.reverbConvolver || !this.reverbWetGain) return;

    if (this.reverbPreset === 'OFF') {
      this.reverbWetGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.03);
      this.reverbDryGain.gain.setTargetAtTime(1.0, this.audioCtx.currentTime, 0.03);
      return;
    }

    let duration = 1.2;
    let decay = 2.0;
    if (this.reverbPreset === 'STUDIO') { duration = 0.45; decay = 3.2; }
    else if (this.reverbPreset === 'CHAMBER') { duration = 1.5; decay = 2.2; }
    else if (this.reverbPreset === 'CONCERT') { duration = 3.0; decay = 1.6; }
    else if (this.reverbPreset === 'CATHEDRAL') { duration = 5.2; decay = 1.2; }

    try {
      this.reverbConvolver.buffer = this.createImpulseResponse(duration, decay);
      const wet = this.reverbMix;
      this.reverbWetGain.gain.setTargetAtTime(wet, this.audioCtx.currentTime, 0.03);
      this.reverbDryGain.gain.setTargetAtTime(1.0 - (wet * 0.3), this.audioCtx.currentTime, 0.03);
    } catch (e) {
      console.warn('Reverb impulse assignment error:', e);
    }
  }

  setReverbMix(mixPct) {
    this.reverbMix = Math.max(0, Math.min(1, mixPct));
    if (this.audioCtx && this.reverbWetGain && this.reverbPreset !== 'OFF') {
      this.reverbWetGain.gain.setTargetAtTime(this.reverbMix, this.audioCtx.currentTime, 0.02);
      this.reverbDryGain.gain.setTargetAtTime(1.0 - (this.reverbMix * 0.3), this.audioCtx.currentTime, 0.02);
    }
  }

  setSpatialMode(mode) {
    this.spatialMode = (mode || 'OFF').toUpperCase();
    this.updateSpatialPannerPosition();
    return this.spatialMode;
  }

  setSpatialAzimuth(degrees) {
    this.spatialAzimuth = degrees;
    this.updateSpatialPannerPosition();
  }

  setSpatialElevation(degrees) {
    this.spatialElevation = degrees;
    this.updateSpatialPannerPosition();
  }

  updateSpatialPannerPosition() {
    if (!this.spatialPanner || !this.audioCtx) return;
    let radius = 2.0;
    let y = 0;
    let rad = (this.spatialAzimuth * Math.PI) / 180;

    if (this.spatialMode === 'OFF') {
      this.setPannerCoordinates(0, 0, -1.0);
      return;
    } else if (this.spatialMode === 'WIDE') {
      radius = 3.2;
      y = 0.2;
    } else if (this.spatialMode === 'ARENA') {
      radius = 4.2;
      y = 1.4;
    } else if (this.spatialMode === 'BINAURAL') {
      radius = 2.2;
      y = (this.spatialElevation * Math.PI) / 180;
    }

    const x = Math.sin(rad) * radius;
    const z = -Math.cos(rad) * radius;
    this.setPannerCoordinates(x, y, z);
  }

  setPannerCoordinates(x, y, z) {
    if (!this.spatialPanner || !this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    if (this.spatialPanner.positionX) {
      this.spatialPanner.positionX.setTargetAtTime(x, t, 0.04);
      this.spatialPanner.positionY.setTargetAtTime(y, t, 0.04);
      this.spatialPanner.positionZ.setTargetAtTime(z, t, 0.04);
    } else if (this.spatialPanner.setPosition) {
      this.spatialPanner.setPosition(x, y, z);
    }
  }

  getEQFrequencyCurve(points = 64) {
    const curve = [];
    const minFreq = 20;
    const maxFreq = 20000;
    for (let i = 0; i < points; i++) {
      const f = minFreq * Math.pow(maxFreq / minFreq, i / (points - 1));
      let totalDb = 0;

      if (this.bassBoostEnabled && f < 300) {
        const falloff = Math.max(0, 1 - f / 300);
        totalDb += this.bassBoostGain * falloff;
      }

      this.eqFilters.forEach((filter, idx) => {
        const center = this.eqFrequencies[idx];
        const gain = this.eqGains[idx] || 0;
        if (gain !== 0) {
          const octDist = Math.abs(Math.log2(f / center));
          const weight = Math.max(0, 1 - octDist / 1.2);
          totalDb += gain * weight;
        }
      });
      curve.push({ freq: Math.round(f), db: Math.round(totalDb * 10) / 10 });
    }
    return curve;
  }

  generateTrackWaveform(trackId, title = '', duration = 180) {
    const bars = 64;
    const waveform = new Float32Array(bars);
    let hash = 2166136261;
    const str = `${trackId}_${title}_${duration}`;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const pseudoRandom = (seed) => {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let i = 0; i < bars; i++) {
      const p = i / (bars - 1);
      const pr = pseudoRandom(hash + i * 17);

      let macro = 0.45;
      if (p < 0.1) macro = 0.2 + p * 4.0;
      else if (p >= 0.25 && p <= 0.45) macro = 0.85;
      else if (p > 0.45 && p < 0.6) macro = 0.5;
      else if (p >= 0.6 && p <= 0.85) macro = 0.95;
      else if (p > 0.85) macro = Math.max(0.15, 0.95 - (p - 0.85) * 5.0);

      const micro = 0.4 + 0.6 * pr;
      waveform[i] = Math.min(1.0, Math.max(0.12, macro * micro));
    }
    return waveform;
  }

  getAudioTelemetry() {
    const isCtx = !!(this.audioCtx && this.isInitialized);
    const vu = this.getStereoVU();
    return {
      sampleRate: isCtx ? this.audioCtx.sampleRate : 48000,
      state: isCtx ? this.audioCtx.state.toUpperCase() : 'STANDBY',
      channels: 2,
      currentTime: this.audio ? this.audio.currentTime : 0,
      duration: this.audio && !isNaN(this.audio.duration) ? this.audio.duration : 0,
      peakL: vu.peakL,
      peakR: vu.peakR,
      rmsL: vu.left,
      rmsR: vu.right,
      bassBoostActive: this.bassBoostEnabled,
      bassBoostGain: this.bassBoostGain,
      reverbPreset: this.reverbPreset,
      reverbMix: this.reverbMix,
      spatialMode: this.spatialMode,
      spatialAzimuth: this.spatialAzimuth
    };
  }

  setPreset(name) {
    const presets = {
      'FLAT': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      'BASS BOOST': [7, 6, 4, 1, 0, -1, 0, 1, 2, 3],
      'NOTHING DOT': [5, 4, 2, 0, -1, 1, 3, 5, 4, 2],
      'CYBER SYNTH': [6, 4, 2, -1, -2, 1, 4, 6, 7, 5],
      'VOCAL / TALK': [-3, -2, 0, 2, 5, 5, 4, 2, 0, -2],
      'ROCK': [4, 3, 1, -1, -2, 0, 2, 4, 5, 5],
      'ACOUSTIC': [3, 2, 1, 1, 2, 2, 3, 4, 4, 3],
      'TREBLE': [-4, -3, -2, 0, 1, 2, 4, 6, 7, 8]
    };

    const gains = presets[name.toUpperCase()] || presets['FLAT'];
    gains.forEach((gain, idx) => {
      this.setEQBand(idx, gain);
    });
    return gains;
  }

  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(32);
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getTimeDomainData() {
    if (!this.analyser) return new Uint8Array(128).fill(128);
    const dataArray = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  getStereoVU() {
    if (!this.analyserL || !this.analyserR) {
      return { left: 0, right: 0, peakL: 0, peakR: 0 };
    }

    const bufL = new Uint8Array(this.analyserL.frequencyBinCount);
    const bufR = new Uint8Array(this.analyserR.frequencyBinCount);
    this.analyserL.getByteTimeDomainData(bufL);
    this.analyserR.getByteTimeDomainData(bufR);

    let sumL = 0;
    let sumR = 0;
    let peakL = 0;
    let peakR = 0;

    for (let i = 0; i < bufL.length; i++) {
      const valL = (bufL[i] - 128) / 128;
      const valR = (bufR[i] - 128) / 128;
      sumL += valL * valL;
      sumR += valR * valR;
      const absL = Math.abs(valL);
      const absR = Math.abs(valR);
      if (absL > peakL) peakL = absL;
      if (absR > peakR) peakR = absR;
    }

    const rmsL = Math.min(1.0, Math.sqrt(sumL / bufL.length) * 2.2);
    const rmsR = Math.min(1.0, Math.sqrt(sumR / bufR.length) * 2.2);

    return {
      left: rmsL,
      right: rmsR,
      peakL: Math.min(1.0, peakL * 1.5),
      peakR: Math.min(1.0, peakR * 1.5)
    };
  }

  /**
   * Procedural Offline Synthwave Generator
   * Routes into preamp so that the 10-Band EQ, Limiter, and Volume actively shape the synth!
   */
  playDemoSynth() {
    this.pause();
    this.initAudioContext();
    if (this.audioCtx.state === 'suspended') {
      try {
        this.audioCtx.resume();
      } catch (e) {}
    }

    this.isDemoSynthPlaying = true;
    let step = 0;
    const bpm = 124;
    const stepDuration = (60 / bpm) / 4; // 16th notes

    const bassline = [
      65.41, 65.41, 77.78, 65.41,
      87.31, 65.41, 98.00, 87.31,
      65.41, 65.41, 110.00, 65.41,
      98.00, 87.31, 77.78, 73.42
    ];

    const leadNotes = [
      261.63, 311.13, 392.00, 523.25,
      311.13, 392.00, 523.25, 622.25,
      392.00, 523.25, 622.25, 783.99,
      523.25, 392.00, 311.13, 261.63
    ];

    if (this.onPlayStateChange) this.onPlayStateChange(true);

    const playStep = () => {
      if (!this.isDemoSynthPlaying) return;

      const now = this.audioCtx.currentTime;

      // 1. Kick Drum (every 4 steps)
      if (step % 4 === 0) {
        const kickOsc = this.audioCtx.createOscillator();
        const kickGain = this.audioCtx.createGain();
        kickOsc.frequency.setValueAtTime(140, now);
        kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.12);
        kickGain.gain.setValueAtTime(0.85, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        kickOsc.connect(kickGain);
        kickGain.connect(this.preamp);

        kickOsc.start(now);
        kickOsc.stop(now + 0.2);
      }

      // 2. Snare / Clack (steps 4 and 12)
      if (step % 8 === 4) {
        const snareOsc = this.audioCtx.createOscillator();
        const snareGain = this.audioCtx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(220, now);
        snareOsc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        snareGain.gain.setValueAtTime(0.35, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        snareOsc.connect(snareGain);
        snareGain.connect(this.preamp);
        snareOsc.start(now);
        snareOsc.stop(now + 0.15);
      }

      // 3. Synth Bass
      const bassFreq = bassline[step % bassline.length];
      const bassOsc = this.audioCtx.createOscillator();
      const bassGain = this.audioCtx.createGain();
      const bassFilter = this.audioCtx.createBiquadFilter();

      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(800, now);
      bassFilter.frequency.exponentialRampToValueAtTime(150, now + stepDuration * 0.9);

      bassGain.gain.setValueAtTime(0.35, now);
      bassGain.gain.exponentialRampToValueAtTime(0.005, now + stepDuration * 0.85);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.preamp);

      bassOsc.start(now);
      bassOsc.stop(now + stepDuration);

      // 4. Cyber Lead Synth
      if (step % 2 === 0) {
        const leadFreq = leadNotes[(step / 2) % leadNotes.length];
        const leadOsc = this.audioCtx.createOscillator();
        const leadGain = this.audioCtx.createGain();
        leadOsc.type = 'square';
        leadOsc.frequency.setValueAtTime(leadFreq, now);

        leadGain.gain.setValueAtTime(0.12, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);

        leadOsc.connect(leadGain);
        leadGain.connect(this.preamp);

        leadOsc.start(now);
        leadOsc.stop(now + stepDuration * 1.6);
      }

      step++;
      this.synthInterval = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  stopDemoSynth() {
    if (this.synthInterval) {
      clearTimeout(this.synthInterval);
      this.synthInterval = null;
    }
    this.isDemoSynthPlaying = false;
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }
}

if (typeof window !== 'undefined') {
  window.AudioEngine = AudioEngine;
}
