/**
 * Real-Time ASCII Audio Animation Engine - Mobile-Optimized & Desktop Responsive
 * Dot Music Player - 100% Offline Nothing OS
 * Author: Developed by S. M. Mahmud Iqbal
 */

class AsciiVisualizer {
  constructor(containerElement, audioEngine) {
    this.container = containerElement;
    this.audioEngine = audioEngine;
    this.mode = 0; // 0..3
    this.modeNames = [
      'NOTHING DOT SPECTRUM',
      'CYBER OSCILLOSCOPE',
      'DUAL STEREO VU METER',
      'MATRIX CYBER RAIN',
      'CYBER TUNNEL 3D',
      'RADAR SONAR 360',
      'PARTICLE FOUNTAIN'
    ];

    this.frame = 0;
    this.animationId = null;
    this.peakLevels = new Array(36).fill(0);
    this.peakDecay = new Array(36).fill(0);

    // Cassette / Vinyl state
    this.spoolAngle = 0;
    this.vuNeedleL = 0;
    this.vuNeedleR = 0;
    this.vuPeakL = 0;
    this.vuPeakR = 0;

    // Matrix Rain drops
    this.rainColumns = 32;
    this.rainDrops = Array.from({ length: this.rainColumns }, () => Math.floor(Math.random() * 10));

    this.colorTheme = 'mono'; // 'mono', 'red', 'green', 'amber'
  }

  isMobile() {
    return window.innerWidth <= 600;
  }

  setMode(modeIndex) {
    this.mode = (modeIndex + this.modeNames.length) % this.modeNames.length;
    return this.modeNames[this.mode];
  }

  nextMode() {
    return this.setMode(this.mode + 1);
  }

  prevMode() {
    return this.setMode(this.mode - 1);
  }

  setColorTheme(theme) {
    this.colorTheme = theme;
    if (this.container) {
      this.container.className = `ascii-display theme-${theme}`;
    }
  }

  nextTheme() {
    const themes = ['mono', 'red', 'green', 'amber'];
    const curIdx = themes.indexOf(this.colorTheme);
    const next = themes[(curIdx + 1) % themes.length];
    this.setColorTheme(next);
    return next;
  }

  start() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (!this._visibilityBound) {
      this._visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
          }
        } else {
          if (!this.animationId) {
            this.start();
          }
        }
      });
    }

    const loop = () => {
      if (document.hidden) {
        this.animationId = null;
        return;
      }
      this.render();
      this.frame++;
      this.animationId = requestAnimationFrame(loop);
    };

    if (!document.hidden) {
      this.animationId = requestAnimationFrame(loop);
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  render() {
    if (!this.container) return;

    let asciiOutput = '';
    const isPlaying = !this.audioEngine.audio.paused || this.audioEngine.isDemoSynthPlaying;

    switch (this.mode) {
      case 0:
        asciiOutput = this.renderDotSpectrum(isPlaying);
        break;
      case 1:
        asciiOutput = this.renderOscilloscope(isPlaying);
        break;
      case 2:
        asciiOutput = this.renderStereoVU(isPlaying);
        break;
      case 3:
        asciiOutput = this.renderMatrixRain(isPlaying);
        break;
      case 4:
        asciiOutput = this.renderTunnel3D(isPlaying);
        break;
      case 5:
        asciiOutput = this.renderRadarSonar(isPlaying);
        break;
      case 6:
        asciiOutput = this.renderParticleFountain(isPlaying);
        break;
      default:
        asciiOutput = this.renderDotSpectrum(isPlaying);
    }

    this.container.textContent = asciiOutput;
  }

  /**
   * Mode 0: Full-Area Nothing OS Dot Matrix Spectrum Analyzer (Zero Text)
   */
  renderDotSpectrum(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    const mobile = this.isMobile();
    const rows = mobile ? 15 : 18;
    const cols = mobile ? 42 : 64;
    const bandsCount = Math.floor(cols / 2);
    const step = Math.max(1, Math.floor(rawData.length / (bandsCount * 1.6)));

    const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));

    for (let b = 0; b < bandsCount; b++) {
      let sum = 0;
      let count = 0;
      const startIdx = Math.floor(Math.pow(b / bandsCount, 1.7) * (rawData.length - step));
      for (let k = 0; k < step && (startIdx + k) < rawData.length; k++) {
        sum += rawData[startIdx + k];
        count++;
      }
      let val = count > 0 ? (sum / count) / 255 : 0;
      if (!isPlaying) {
        val = 0.08 + 0.05 * Math.sin((this.frame * 0.05) + (b * 0.35));
      }

      if (val >= (this.peakLevels[b] || 0)) {
        this.peakLevels[b] = val;
        this.peakDecay[b] = 0;
      } else {
        this.peakDecay[b] = (this.peakDecay[b] || 0) + 0.015;
        this.peakLevels[b] = Math.max(0, this.peakLevels[b] - this.peakDecay[b]);
      }

      const activeHeight = Math.round(val * rows);
      const peakRow = rows - 1 - Math.min(rows - 1, Math.round((this.peakLevels[b] || 0) * rows));
      const col1 = b * 2;
      const col2 = b * 2 + 1;

      for (let r = 0; r < rows; r++) {
        const rowFromBottom = rows - 1 - r;
        if (r === peakRow && (this.peakLevels[b] || 0) > 0.08) {
          grid[r][col1] = '─';
          grid[r][col2] = '─';
        } else if (rowFromBottom < activeHeight) {
          const glyph = rowFromBottom > rows * 0.7 ? '█' : (rowFromBottom > rows * 0.4 ? '●' : (rowFromBottom > rows * 0.15 ? '•' : ':'));
          grid[r][col1] = glyph;
          grid[r][col2] = ' ';
        } else if (r === rows - 1) {
          grid[r][col1] = '·';
          grid[r][col2] = ' ';
        }
      }
    }

    return grid.map(r => r.join('')).join('\n');
  }

  /**
   * Mode 1: Full-Area Dual Trace Phosphor Oscilloscope (Zero Text)
   */
  renderOscilloscope(isPlaying) {
    const wave = this.audioEngine.getTimeDomainData();
    const mobile = this.isMobile();
    const rows = mobile ? 15 : 18;
    const cols = mobile ? 42 : 64;
    const midY = Math.floor(rows / 2);

    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        if (r === midY && c % 3 === 0) return '·';
        if (c % 8 === 0 && (r === midY - 4 || r === midY + 4)) return '·';
        return ' ';
      })
    );

    if (isPlaying) {
      let prevY = midY;
      const amp = (rows / 2) - 1.2;
      for (let c = 0; c < cols; c++) {
        const sampleIdx = Math.floor((c / cols) * wave.length);
        const norm = (wave[sampleIdx] - 128) / 128;
        const y = Math.max(0, Math.min(rows - 1, Math.round(midY - (norm * amp))));
        const minY = Math.min(prevY, y);
        const maxY = Math.max(prevY, y);
        for (let k = minY; k <= maxY; k++) {
          grid[k][c] = (k === y) ? '█' : (Math.abs(k - midY) > 3 ? '█' : '│');
        }
        prevY = y;
      }
    } else {
      for (let c = 0; c < cols; c++) grid[midY][c] = '─';
      const sweepX = Math.floor((this.frame * 0.9) % cols);
      if (sweepX >= 0 && sweepX < cols) grid[midY][sweepX] = '●';
    }

    return grid.map(r => r.join('')).join('\n');
  }

  /**
   * Mode 2: Full-Area Stereo VU Meters (Zero Text)
   */
  renderStereoVU(isPlaying) {
    const vu = isPlaying ? this.audioEngine.getStereoVU() : { left: 0.05, right: 0.05, peakL: 0.05, peakR: 0.05 };
    const mobile = this.isMobile();
    const rows = mobile ? 15 : 18;
    const cols = mobile ? 42 : 64;
    const midY = Math.floor(rows / 2);

    this.vuNeedleL += (vu.left - this.vuNeedleL) * 0.28;
    this.vuNeedleR += (vu.right - this.vuNeedleR) * 0.28;
    this.vuPeakL = Math.max(this.vuNeedleL, this.vuPeakL - 0.012);
    this.vuPeakR = Math.max(this.vuNeedleR, this.vuPeakR - 0.012);

    const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));
    grid[midY].fill('═');

    const fillL = Math.round(this.vuNeedleL * cols);
    const peakIdxL = Math.min(cols - 1, Math.round(this.vuPeakL * cols));
    for (let r = 0; r < midY; r++) {
      for (let c = 0; c < cols; c++) {
        if (c === peakIdxL && this.vuPeakL > 0.08) {
          grid[r][c] = '│';
        } else if (c < fillL) {
          grid[r][c] = c > cols * 0.8 ? '█' : (c > cols * 0.5 ? '■' : '░');
        } else {
          grid[r][c] = '·';
        }
      }
    }

    const fillR = Math.round(this.vuNeedleR * cols);
    const peakIdxR = Math.min(cols - 1, Math.round(this.vuPeakR * cols));
    for (let r = midY + 1; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c === peakIdxR && this.vuPeakR > 0.08) {
          grid[r][c] = '│';
        } else if (c < fillR) {
          grid[r][c] = c > cols * 0.8 ? '█' : (c > cols * 0.5 ? '■' : '░');
        } else {
          grid[r][c] = '·';
        }
      }
    }

    return grid.map(r => r.join('')).join('\n');
  }

  /**
   * Mode 3: Full-Area Matrix Cyber Rain (Zero Text)
   */
  renderMatrixRain(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0;
    for (let i = 0; i < 6; i++) bass += rawData[i] || 0;
    bass = bass / (6 * 255);

    const mobile = this.isMobile();
    const rows = mobile ? 15 : 18;
    const cols = mobile ? 42 : 64;

    if (!this.rainDrops || this.rainDrops.length !== cols) {
      this.rainDrops = Array.from({ length: cols }, () => Math.floor(Math.random() * rows));
    }

    if (this.frame % (isPlaying && bass > 0.35 ? 1 : 2) === 0) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < (isPlaying ? 0.3 + bass * 0.45 : 0.12)) {
          this.rainDrops[c] = (this.rainDrops[c] + 1) % rows;
        }
      }
    }

    const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dropY = this.rainDrops[c];
        if (r === dropY) {
          grid[r][c] = '●';
        } else if (r === (dropY - 1 + rows) % rows) {
          grid[r][c] = '•';
        } else if (r === (dropY - 2 + rows) % rows) {
          grid[r][c] = '·';
        } else if (r === (dropY - 3 + rows) % rows) {
          grid[r][c] = ':';
        }
      }
    }

    return grid.map(r => r.join('')).join('\n');
  }

  /**
   * Mode 4: Full-Area 3D Cyber Tunnel (Zero Text)
   */
  renderTunnel3D(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0;
    for (let i = 0; i < 6; i++) bass += rawData[i] || 0;
    bass = bass / (6 * 255);
    if (!isPlaying) bass = 0.1 + 0.06 * Math.sin(this.frame * 0.05);

    const mobile = this.isMobile();
    const rows = mobile ? 15 : 18;
    const cols = mobile ? 42 : 64;
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));

    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    const ringCount = 5;
    const pulseOffset = (this.frame * 0.16) % 1;

    for (let r = 0; r < ringCount; r++) {
      const depth = (r + pulseOffset) / ringCount;
      const rx = Math.floor(depth * (cx - 2) * (1 + bass * 0.4));
      const ry = Math.floor(depth * (cy - 1) * (1 + bass * 0.4));
      const isOuter = (r === ringCount - 1);

      for (let x = -rx; x <= rx; x++) {
        const py1 = cy - ry;
        const py2 = cy + ry;
        const px = cx + x;
        if (px >= 0 && px < cols) {
          if (py1 >= 0 && py1 < rows) grid[py1][px] = isOuter ? '═' : '─';
          if (py2 >= 0 && py2 < rows) grid[py2][px] = isOuter ? '═' : '─';
        }
      }

      for (let y = -ry; y <= ry; y++) {
        const px1 = cx - rx;
        const px2 = cx + rx;
        const py = cy + y;
        if (py >= 0 && py < rows) {
          if (px1 >= 0 && px1 < cols) grid[py][px1] = isOuter ? '║' : '│';
          if (px2 >= 0 && px2 < cols) grid[py][px2] = isOuter ? '║' : '│';
        }
      }
    }

    for (let d = 1; d < Math.min(cx, cy); d++) {
      const xL = cx - Math.round(d * 1.8);
      const xR = cx + Math.round(d * 1.8);
      const yT = cy - d;
      const yB = cy + d;
      if (yT >= 0 && xL >= 0 && grid[yT][xL] === ' ') grid[yT][xL] = '\\';
      if (yT >= 0 && xR < cols && grid[yT][xR] === ' ') grid[yT][xR] = '/';
      if (yB < rows && xL >= 0 && grid[yB][xL] === ' ') grid[yB][xL] = '/';
      if (yB < rows && xR < cols && grid[yB][xR] === ' ') grid[yB][xR] = '\\';
    }

    if (cy >= 0 && cy < rows && cx >= 0 && cx < cols) {
      grid[cy][cx] = bass > 0.35 ? '●' : '·';
    }

    return grid.map(r => r.join('')).join('\n');
  }

  /**
   * Mode 5: Full-Area Radar Sonar 360 (Zero Text)
   */
  renderRadarSonar(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    const mobile = this.isMobile();
    const rows = mobile ? 15 : 18;
    const cols = mobile ? 42 : 64;
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));

    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    const sweepAngle = (this.frame * 0.07) % (Math.PI * 2);

    const radX = cx - 3;
    const radY = cy - 1;
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const px = Math.round(cx + Math.cos(a) * radX);
      const py = Math.round(cy + Math.sin(a) * radY);
      if (px >= 0 && px < cols && py >= 0 && py < rows) grid[py][px] = '·';
      const pxMid = Math.round(cx + Math.cos(a) * (radX * 0.5));
      const pyMid = Math.round(cy + Math.sin(a) * (radY * 0.5));
      if (pxMid >= 0 && pxMid < cols && pyMid >= 0 && pyMid < rows && grid[pyMid][pxMid] === ' ') {
        grid[pyMid][pxMid] = '·';
      }
    }

    for (let d = 0; d <= 1; d += 0.07) {
      const px = Math.round(cx + Math.cos(sweepAngle) * radX * d);
      const py = Math.round(cy + Math.sin(sweepAngle) * radY * d);
      if (px >= 0 && px < cols && py >= 0 && py < rows) {
        grid[py][px] = (d > 0.7) ? '●' : '•';
      }
    }

    for (let b = 0; b < 16; b++) {
      const val = (rawData[b * 2] || 0) / 255;
      if (val > 0.28 || !isPlaying) {
        const blipAngle = (b / 16) * Math.PI * 2;
        const dist = 0.25 + (val * 0.68);
        const bx = Math.round(cx + Math.cos(blipAngle) * radX * dist);
        const by = Math.round(cy + Math.sin(blipAngle) * radY * dist);
        if (bx >= 0 && bx < cols && by >= 0 && by < rows) {
          grid[by][bx] = isPlaying && val > 0.55 ? '●' : ':';
        }
      }
    }

    if (cy >= 0 && cy < rows && cx >= 0 && cx < cols) grid[cy][cx] = '+';

    return grid.map(r => r.join('')).join('\n');
  }

  /**
   * Mode 6: Full-Area Particle Fountain (Zero Text)
   */
  renderParticleFountain(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0;
    for (let i = 0; i < 4; i++) bass += rawData[i] || 0;
    bass = bass / (4 * 255);

    const mobile = this.isMobile();
    const rows = mobile ? 15 : 18;
    const cols = mobile ? 42 : 64;
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));
    const cx = Math.floor(cols / 2);

    if (!this.particles || this.particles.length < 36) {
      this.particles = Array.from({ length: 42 }, () => ({
        x: cx,
        y: rows - 1,
        vx: (Math.random() * 2 - 1) * 2,
        vy: -Math.random() * 2.5 - 1,
        life: Math.floor(Math.random() * 12)
      }));
    }

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.life++;

      const px = Math.round(p.x);
      const py = Math.round(p.y);

      if (px >= 0 && px < cols && py >= 0 && py < rows) {
        grid[py][px] = p.life < 4 ? '●' : (p.life < 8 ? '•' : '·');
      }

      if (p.y >= rows || p.life > 16 || p.x < 0 || p.x >= cols) {
        p.x = cx + (Math.random() * 8 - 4);
        p.y = rows - 1;
        const kick = isPlaying ? 1 + bass * 2.4 : 1;
        p.vx = (Math.random() * 2 - 1) * (1.4 * kick);
        p.vy = -(1.8 + Math.random() * 2.8) * (kick * 0.85);
        p.life = 0;
      }
    });

    for (let c = 0; c < cols; c++) {
      if (grid[rows - 1][c] === ' ') grid[rows - 1][c] = '─';
    }

    return grid.map(r => r.join('')).join('\n');
  }

  /**
   * Generative Dot-Matrix Album Art Synthesizer
   * Creates a deterministic Nothing OS geometric mandala emblem for tracks without cover art.
   */
  static generateDotMatrixCoverArt(title = '', artist = '', size = 320, accentColor = '#d71921') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const str = `${title}_${artist}`;
    let seed = 2166136261;
    for (let i = 0; i < str.length; i++) {
      seed ^= str.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    const rnd = (offset = 0) => {
      let t = (seed + offset + 0x6D2B79F5) | 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, size - 16, size - 16);

    const center = size / 2;
    const rings = 6 + Math.floor(rnd(1) * 4);
    const symmetry = rnd(2) > 0.5 ? 8 : 12;

    for (let r = 1; r <= rings; r++) {
      const radius = (r / rings) * (size * 0.38);
      const dotCount = r * symmetry;
      const dotSize = 1.2 + (r % 2 === 0 ? 1.4 : 0.8) + (r === rings ? 1.0 : 0);
      const isAccentRing = (r % 3 === 1);

      for (let d = 0; d < dotCount; d++) {
        const angle = (d / dotCount) * Math.PI * 2 + (r * 0.15);
        const bit = ((seed >> (d % 31)) & 1);
        if (r > 2 && bit === 0 && d % 2 === 1) continue;

        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;

        ctx.fillStyle = isAccentRing ? accentColor : (d % 4 === 0 ? '#ffffff' : '#555555');
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(center, center, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(center, center, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#777777';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('NOTHING (R)', 16, 24);

    ctx.textAlign = 'right';
    const tag = (title.length > 10 ? title.substring(0, 10) : title).toUpperCase();
    ctx.fillText(tag || 'AUDIO', size - 16, 24);

    ctx.fillStyle = '#999999';
    ctx.textAlign = 'center';
    const cleanArt = (artist.length > 20 ? artist.substring(0, 18) + '..' : artist).toUpperCase();
    ctx.fillText(cleanArt || 'OFFLINE AUDIO', center, size - 20);

    return canvas.toDataURL('image/png');
  }

  /**
   * Interactive 64-Bar Dot-Matrix Waveform Seeker
   */
  static renderWaveformSeeker(canvas, waveformData, progressPct, accentColor = '#d71921') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!waveformData || waveformData.length === 0) return;
    const count = waveformData.length;
    const barWidth = Math.max(2, (w / count) - 1.5);
    const midY = h / 2;

    for (let i = 0; i < count; i++) {
      const x = i * (w / count);
      const val = waveformData[i] || 0.1;
      const barHeight = Math.max(3, val * (h * 0.85));
      const isPlayed = (i / count) * 100 <= progressPct;

      ctx.fillStyle = isPlayed ? accentColor : '#333333';
      const y = midY - barHeight / 2;
      ctx.beginPath();
      ctx.rect(x, y, barWidth, barHeight);
      ctx.fill();
    }
  }

  /**
   * Real-Time Parametric EQ Frequency Response Curve
   */
  static renderParametricCurve(canvas, audioEngine, accentColor = '#d71921') {
    if (!canvas || !audioEngine) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const curve = audioEngine.getEQFrequencyCurve ? audioEngine.getEQFrequencyCurve(64) : [];
    if (curve.length === 0) return;

    const midY = h / 2;
    const maxDb = 15;
    const scaleY = (h * 0.42) / maxDb;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, midY);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * w;
      const y = midY - (curve[i].db * scaleY);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, midY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(215, 25, 33, 0.12)';
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * w;
      const y = midY - (curve[i].db * scaleY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (audioEngine.eqFilters) {
      audioEngine.eqFilters.forEach((filter, idx) => {
        const center = audioEngine.eqFrequencies[idx];
        const gain = audioEngine.eqGains[idx] || 0;
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);
        const x = ((Math.log10(center) - minLog) / (maxLog - minLog)) * w;
        const y = midY - (gain * scaleY);

        ctx.fillStyle = gain !== 0 ? accentColor : '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}

if (typeof window !== 'undefined') {
  window.AsciiVisualizer = AsciiVisualizer;
}
