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

  start() {
    if (this.animationId) cancelAnimationFrame(this.animationId);

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
      if (!document.hidden) {
        this.render();
        this.frame++;
      }
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
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
   * Mode 0: Nothing OS Dot Matrix Spectrum Analyzer (Mobile-safe width)
   */
  renderDotSpectrum(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    const mobile = this.isMobile();
    const bandsCount = mobile ? 16 : 28;
    const height = mobile ? 9 : 11;
    const dotLevels = [' ', '·', ':', '•', 'o', 'O', '8', '●'];

    const bandValues = [];
    const step = Math.max(1, Math.floor(rawData.length / (bandsCount * 1.5)));

    for (let b = 0; b < bandsCount; b++) {
      let sum = 0;
      let count = 0;
      const startIdx = Math.floor(Math.pow(b / bandsCount, 1.6) * (rawData.length - step));
      for (let k = 0; k < step && (startIdx + k) < rawData.length; k++) {
        sum += rawData[startIdx + k];
        count++;
      }
      let val = count > 0 ? (sum / count) / 255 : 0;
      
      if (!isPlaying) {
        val = 0.08 + 0.05 * Math.sin((this.frame * 0.04) + (b * 0.3));
      }
      bandValues.push(val);

      if (val >= (this.peakLevels[b] || 0)) {
        this.peakLevels[b] = val;
        this.peakDecay[b] = 0;
      } else {
        this.peakDecay[b] = (this.peakDecay[b] || 0) + 0.015;
        this.peakLevels[b] = Math.max(0, this.peakLevels[b] - this.peakDecay[b]);
      }
    }

    const lines = [];
    const innerWidth = bandsCount * 2;
    const border = '─'.repeat(innerWidth + 1);

    if (mobile) {
      lines.push(' [·] DOT SPECTRUM FFT [32Hz-16kHz]');
      lines.push(' ┌' + border + '┐');
    } else {
      lines.push(' [·] NOTHING DOT SPECTRUM // 32Hz-16kHz');
      lines.push(' ┌' + border + '┐');
    }

    for (let row = height - 1; row >= 0; row--) {
      const rowThreshold = (row + 1) / height;
      const prevThreshold = row / height;
      let line = ' │';

      for (let b = 0; b < bandsCount; b++) {
        const val = bandValues[b];
        const peak = this.peakLevels[b] || 0;
        const isPeakRow = Math.abs(peak - rowThreshold) < (0.5 / height);

        if (isPeakRow && peak > 0.15 && isPlaying) {
          line += '─ ';
        } else if (val >= rowThreshold) {
          line += '● ';
        } else if (val > prevThreshold) {
          const frac = (val - prevThreshold) / (rowThreshold - prevThreshold);
          const charIdx = Math.min(dotLevels.length - 1, Math.floor(frac * dotLevels.length));
          line += dotLevels[charIdx] + ' ';
        } else {
          line += '· ';
        }
      }
      line += '│';
      lines.push(line);
    }

    lines.push(' ├' + border + '┤');
    if (mobile) {
      lines.push(' │ 32 64 125 250 1K 2K 4K 8K 16K │');
    } else {
      lines.push(' │ 32  64  125 250 500  1K  2K  3K  4K  6K  8K  12K 16K  │');
    }
    lines.push(' └' + border + '┘');

    return lines.join('\n');
  }

  /**
   * Mode 1: Retro Reel Cassette Tape (Mobile-safe 36 chars)
   */
  renderCassetteTape(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0;
    for (let i = 0; i < 6; i++) bass += rawData[i] || 0;
    bass = bass / (6 * 255);

    if (isPlaying) {
      this.spoolAngle += 0.2 + (bass * 0.2);
    }

    const spokes = ['|', '/', '-', '\\'];
    const s1 = isPlaying ? spokes[Math.floor(this.spoolAngle) % 4] : '|';
    const s2 = isPlaying ? spokes[Math.floor(this.spoolAngle * 1.05) % 4] : '|';

    const curTime = this.audioEngine.audio.currentTime || 0;
    const durTime = this.audioEngine.audio.duration || 1;
    const progress = Math.max(0, Math.min(1, curTime / durTime));

    const leftSpool = progress < 0.5 ? '( (●) )' : '( ● )';
    const rightSpool = progress > 0.5 ? '( (●) )' : '( ● )';

    const formatTime = (t) => {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (this.isMobile()) {
      return [
        ` /================================\\`,
        ` | [DOT MUSIC]   TYPE-II CHROME o |`,
        ` | +----------------------------+ |`,
        ` | | ( ${s1} )   [${formatTime(curTime)}/${formatTime(durTime)}]   ( ${s2} ) | |`,
        ` | | ${leftSpool}  ============  ${rightSpool} | |`,
        ` | |     [·] MAGNETIC STEREO    | |`,
        ` | +----------------------------+ |`,
        ` |  DOLBY B-C NR  |  NOTHING OS   |`,
        ` \\================================/`
      ].join('\n');
    }

    return [
      ` /==========================================\\`,
      ` | [DOT MUSIC]      :: TYPE-II CHROME ::  o |`,
      ` | +--------------------------------------+ |`,
      ` | |  ( ${s1} )    [ TAPE: ${formatTime(curTime)} / ${formatTime(durTime)} ]    ( ${s2} ) | |`,
      ` | | ${leftSpool}    ====================    ${rightSpool} | |`,
      ` | |        [·] MAGNETIC HIGH DEFINITION  | |`,
      ` | +--------------------------------------+ |`,
      ` |   [A] SIDE   |  OFFLINE STEREO  | NOTHING|`,
      ` \\==========================================/`
    ].join('\n');
  }

  /**
   * Mode 2: Vinyl Turntable (Mobile-safe 36 chars)
   */
  renderVinylTurntable(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0;
    for (let i = 0; i < 6; i++) bass += rawData[i] || 0;
    bass = bass / (6 * 255);

    if (isPlaying) {
      this.spoolAngle += 0.25;
    }

    const curTime = this.audioEngine.audio.currentTime || 0;
    const durTime = this.audioEngine.audio.duration || 1;
    const progress = Math.max(0, Math.min(1, curTime / durTime));
    const armVibe = isPlaying && bass > 0.4 ? '•' : '=';

    if (this.isMobile()) {
      return [
        ` +------- DIRECT DRIVE TURNTABLE -------+`,
        ` |         . - ~ ~ ~ - .      [ARM 33]  |`,
        ` |       . '  /~~~~~\\  ' .      ┌─┐     |`,
        ` |      /   (  /~~~\\  )   \\     │O│(PIV)|`,
        ` |     |   ( ( [·] ) ) )   |====${armVibe}=>[H] |`,
        ` |      \\   (  \\___/  )   /      ▼ (NDL)|`,
        ` |       . _  \\_____/  _ .    [${Math.round(progress*100)}% GROV] |`,
        ` |         ' - _ _ _ - '      [${isPlaying ? 'PLAY' : 'IDLE'}]     |`,
        ` +--------------------------------------+`
      ].join('\n');
    }

    return [
      ` +----------------- DIRECT DRIVE TURNTABLE -----------------+`,
      ` |              . - ~ ~ ~ ~ ~ ~ ~ - .        [TONEARM 33]   |`,
      ` |          . '     /~~~~~~~~~\\     ' .         ┌───┐       |`,
      ` |        /       (   /~~~~~\\   )       \\       │ O │       |`,
      ` |       |       (   ( [·*·] )   )       |======${armVibe}====>[H]|`,
      ` |        \\       (   \\_____/   )       /         ▼ (NEEDLE)|`,
      ` |          . _     \\_________/     _ .         [GROOVE: ${Math.round(progress * 100)}%] |`,
      ` |              ' - _ _ _ _ _ _ _ - '           [NOTHING OS]|`,
      ` +----------------------------------------------------------+`
    ].join('\n');
  }

  /**
   * Mode 3: Cyber Oscilloscope
   */
  renderOscilloscope(isPlaying) {
    const wave = this.audioEngine.getTimeDomainData();
    const mobile = this.isMobile();
    const width = mobile ? 34 : 54;
    const height = mobile ? 9 : 11;
    const grid = Array.from({ length: height }, () => Array(width).fill(' '));
    const midY = Math.floor(height / 2);

    if (isPlaying) {
      for (let x = 0; x < width; x++) {
        const sampleIdx = Math.floor((x / width) * wave.length);
        const norm = (wave[sampleIdx] - 128) / 128;
        let y = midY - Math.round(norm * (height / 2.2));
        y = Math.max(0, Math.min(height - 1, y));
        grid[y][x] = norm > 0.05 || norm < -0.05 ? '█' : '─';
      }
    } else {
      const sweepX = Math.floor((this.frame * 0.8) % width);
      for (let x = 0; x < width; x++) {
        grid[midY][x] = x === sweepX ? '●' : '─';
      }
    }

    const lines = [];
    lines.push(' [·] DUAL TRACE PHOSPHOR OSCILLOSCOPE');
    lines.push(' ┌' + '─'.repeat(width + 2) + '┐');
    for (let r = 0; r < height; r++) {
      let line = ' │ ';
      for (let c = 0; c < width; c++) {
        if (grid[r][c] === ' ' && (r === midY || c % 8 === 0)) {
          line += '·';
        } else {
          line += grid[r][c];
        }
      }
      line += ' │';
      lines.push(line);
    }
    lines.push(' └' + '─'.repeat(width + 2) + '┘');
    lines.push(mobile ? ' TIME/DIV: 2.0ms  TRIGGER: AUTO' : ' VOLTS: 50mV  TIME/DIV: 2.0ms  TRIGGER: AUTO');
    return lines.join('\n');
  }

  /**
   * Mode 4: Stereo VU Meters
   */
  renderStereoVU(isPlaying) {
    const vu = isPlaying ? this.audioEngine.getStereoVU() : { left: 0.02, right: 0.02, peakL: 0.02, peakR: 0.02 };
    const mobile = this.isMobile();
    const meterWidth = mobile ? 20 : 32;

    this.vuNeedleL += (vu.left - this.vuNeedleL) * 0.25;
    this.vuNeedleR += (vu.right - this.vuNeedleR) * 0.25;

    this.vuPeakL = Math.max(this.vuNeedleL, this.vuPeakL - 0.012);
    this.vuPeakR = Math.max(this.vuNeedleR, this.vuPeakR - 0.012);

    const makeBar = (val, peak) => {
      const fillLen = Math.round(val * meterWidth);
      const peakIdx = Math.min(meterWidth - 1, Math.round(peak * meterWidth));
      let str = '';
      for (let i = 0; i < meterWidth; i++) {
        if (i === peakIdx && peak > 0.1) {
          str += '│';
        } else if (i < fillLen) {
          str += i > meterWidth * 0.8 ? '█' : '■';
        } else {
          str += '·';
        }
      }
      return str;
    };

    const dbL = this.vuNeedleL > 0.01 ? (20 * Math.log10(this.vuNeedleL)).toFixed(0) : '-INF';
    const dbR = this.vuNeedleR > 0.01 ? (20 * Math.log10(this.vuNeedleR)).toFixed(0) : '-INF';

    if (mobile) {
      return [
        ` /========== STEREO VU METER ==========\\`,
        ` |                                     |`,
        ` | [L] -20  -10   -5   0  +3 [dB]      |`,
        ` | [${makeBar(this.vuNeedleL, this.vuPeakL)}] ${dbL}dB |`,
        ` |                                     |`,
        ` | [R] -20  -10   -5   0  +3 [dB]      |`,
        ` | [${makeBar(this.vuNeedleR, this.vuPeakR)}] ${dbR}dB |`,
        ` |                                     |`,
        ` | 0VU = +4dBu   BALLISTICS: ANSI C16  |`,
        ` \\=====================================/`
      ].join('\n');
    }

    return [
      ` /================= NOTHING OS STEREO VU =================\\`,
      ` |                                                        |`,
      ` |  CH-L  -20   -10    -5    -1     0    +2    +3 [dB]    |`,
      ` |  [${makeBar(this.vuNeedleL, this.vuPeakL)}] ${dbL}dB       |`,
      ` |                                                        |`,
      ` |  CH-R  -20   -10    -5    -1     0    +2    +3 [dB]    |`,
      ` |  [${makeBar(this.vuNeedleR, this.vuPeakR)}] ${dbR}dB       |`,
      ` |                                                        |`,
      ` |  INTEGRATION: 300ms   REF: 0VU = 4dBu   NOTHING OS     |`,
      ` \\========================================================/`
    ].join('\n');
  }

  /**
   * Mode 5: Nothing Phone Glyph Matrix Interface
   */
  renderGlyphMatrix(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0, mid = 0, treble = 0;

    for (let i = 0; i < 8; i++) bass += rawData[i] || 0;
    for (let i = 8; i < 24; i++) mid += rawData[i] || 0;
    for (let i = 24; i < 48; i++) treble += rawData[i] || 0;

    bass = bass / (8 * 255);
    mid = mid / (16 * 255);
    treble = treble / (24 * 255);

    if (!isPlaying) {
      bass = 0.05 + 0.05 * Math.sin(this.frame * 0.05);
      mid = 0.05 + 0.05 * Math.sin((this.frame * 0.05) + 1);
      treble = 0.05 + 0.05 * Math.sin((this.frame * 0.05) + 2);
    }

    const glyphChar = (level, thresh) => (level > thresh ? '●' : '·');
    const ring = (l) => (l > 0.35 ? '███' : '░░░');

    if (this.isMobile()) {
      return [
        ` +------- NOTHING GLYPH MATRIX -------+`,
        ` |                                    |`,
        ` |      (CAMERA)       (SLASH)        |`,
        ` |       .---.          \\ \\           |`,
        ` |      | ${ring(treble)} |          \\ \\ [${Math.round(mid*100)}%]     |`,
        ` |       '---'                        |`,
        ` |                 .---.              |`,
        ` |                /     \\             |`,
        ` |               | B:${Math.round(bass*100)}% | [${glyphChar(bass,0.4)}]        |`,
        ` |                \\     /             |`,
        ` |                 '---'              |`,
        ` |                   │ [${glyphChar(bass,0.5)}]            |`,
        ` |                   ● (DOT)          |`,
        ` +------------------------------------+`
      ].join('\n');
    }

    return [
      ` +-------------------- NOTHING GLYPH MATRIX LIGHTS --------------------+`,
      ` |                                                                    |`,
      ` |          (CAMERA GLYPH)          (DIAGONAL SLASH)                  |`,
      ` |             .-----.                    \\ \\                         |`,
      ` |            /  ${ring(treble)}  \\                    \\ \\ [MID: ${Math.round(mid*100)}%]            |`,
      ` |           |   ${glyphChar(treble, 0.2)}   ${glyphChar(treble, 0.45)}   |                    \\ \\                        |`,
      ` |             '-----'                                                |`,
      ` |                     .--------------------.                         |`,
      ` |                    /     (CENTER GLYPH)   \\                        |`,
      ` |                   |   [BASS: ${Math.round(bass * 100)}%]   ${glyphChar(bass, 0.25)}  ${glyphChar(bass, 0.5)}   |                       |`,
      ` |                    \\                      /                        |`,
      ` |                     '--------------------'                         |`,
      ` |                               │ ${glyphChar(bass, 0.4)}                          |`,
      ` |                               ● (DOT)                              |`,
      ` +--------------------------------------------------------------------+`
    ].join('\n');
  }

  /**
   * Mode 6: Matrix Cyber Rain
   */
  renderMatrixRain(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0;
    for (let i = 0; i < 6; i++) bass += rawData[i] || 0;
    bass = bass / (6 * 255);

    const mobile = this.isMobile();
    const height = mobile ? 8 : 10;
    const width = mobile ? 32 : 46;
    const lines = [];

    lines.push(` [·] MATRIX RAIN // BASS: ${Math.round(bass * 100)}%`);
    lines.push(' ┌' + '─'.repeat(width + 2) + '┐');

    if (this.frame % (isPlaying && bass > 0.4 ? 1 : 2) === 0) {
      for (let c = 0; c < width; c++) {
        if (Math.random() < (isPlaying ? 0.3 + bass * 0.4 : 0.1)) {
          this.rainDrops[c] = (this.rainDrops[c] + 1) % height;
        }
      }
    }

    for (let r = 0; r < height; r++) {
      let line = ' │ ';
      for (let c = 0; c < width; c++) {
        const dropY = this.rainDrops[c];
        if (r === dropY) {
          line += '●';
        } else if (r === (dropY - 1 + height) % height) {
          line += '•';
        } else if (r === (dropY - 2 + height) % height) {
          line += '·';
        } else {
          line += ' ';
        }
      }
      line += ' │';
      lines.push(line);
    }

    lines.push(' └' + '─'.repeat(width + 2) + '┘');
    lines.push('  NEURAL STREAM // 100% OFFLINE');
    return lines.join('\n');
  }

  /**
   * Mode 4: Cyber Tunnel 3D (Isometric Perspective Wireframe)
   */
  renderTunnel3D(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0;
    for (let i = 0; i < 6; i++) bass += rawData[i] || 0;
    bass = bass / (6 * 255);
    if (!isPlaying) bass = 0.12 + 0.08 * Math.sin(this.frame * 0.05);

    const mobile = this.isMobile();
    const rows = mobile ? 9 : 11;
    const cols = mobile ? 34 : 48;
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));

    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);

    // 4 concentric tunnel rings
    const ringCount = 4;
    const pulseOffset = (this.frame * 0.2) % 1;

    for (let r = 0; r < ringCount; r++) {
      const depth = (r + pulseOffset) / ringCount;
      const rx = Math.floor(depth * (cx - 2) * (1 + bass * 0.35));
      const ry = Math.floor(depth * (cy - 1) * (1 + bass * 0.35));

      for (let x = -rx; x <= rx; x++) {
        const py1 = cy - ry;
        const py2 = cy + ry;
        const px = cx + x;
        if (px >= 0 && px < cols) {
          if (py1 >= 0 && py1 < rows) grid[py1][px] = (r === ringCount - 1) ? '═' : '─';
          if (py2 >= 0 && py2 < rows) grid[py2][px] = (r === ringCount - 1) ? '═' : '─';
        }
      }

      for (let y = -ry; y <= ry; y++) {
        const px1 = cx - rx;
        const px2 = cx + rx;
        const py = cy + y;
        if (py >= 0 && py < rows) {
          if (px1 >= 0 && px1 < cols) grid[py][px1] = '│';
          if (px2 >= 0 && px2 < cols) grid[py][px2] = '│';
        }
      }
    }

    // Center pulsating core dot
    if (cy >= 0 && cy < rows && cx >= 0 && cx < cols) {
      grid[cy][cx] = bass > 0.4 ? '●' : '·';
    }

    const lines = [];
    lines.push(` [·] 3D CYBER TUNNEL // DEPTH: ${Math.round((1 + bass) * 100)}%`);
    lines.push(' ┌' + '─'.repeat(cols) + '┐');
    grid.forEach(row => lines.push(' │' + row.join('') + '│'));
    lines.push(' └' + '─'.repeat(cols) + '┘');
    lines.push('  WARP ACCELERATION // 100% OFFLINE');
    return lines.join('\n');
  }

  /**
   * Mode 5: Radar Sonar 360 (Rotating Polar Scan Line)
   */
  renderRadarSonar(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    const mobile = this.isMobile();
    const rows = mobile ? 9 : 11;
    const cols = mobile ? 34 : 46;
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));

    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    const sweepAngle = (this.frame * 0.08) % (Math.PI * 2);

    // Draw outer circular radar boundary
    const radX = cx - 3;
    const radY = cy - 1;
    for (let a = 0; a < Math.PI * 2; a += 0.15) {
      const px = Math.round(cx + Math.cos(a) * radX);
      const py = Math.round(cy + Math.sin(a) * radY);
      if (px >= 0 && px < cols && py >= 0 && py < rows) {
        grid[py][px] = '·';
      }
    }

    // Draw rotating sweep line
    for (let d = 0; d <= 1; d += 0.08) {
      const px = Math.round(cx + Math.cos(sweepAngle) * radX * d);
      const py = Math.round(cy + Math.sin(sweepAngle) * radY * d);
      if (px >= 0 && px < cols && py >= 0 && py < rows) {
        grid[py][px] = (d > 0.7) ? '●' : '•';
      }
    }

    // Audio reactive blips along angle
    for (let b = 0; b < 12; b++) {
      const val = (rawData[b * 3] || 0) / 255;
      if (val > 0.3 || !isPlaying) {
        const blipAngle = (b / 12) * Math.PI * 2;
        const dist = 0.3 + (val * 0.6);
        const bx = Math.round(cx + Math.cos(blipAngle) * radX * dist);
        const by = Math.round(cy + Math.sin(blipAngle) * radY * dist);
        if (bx >= 0 && bx < cols && by >= 0 && by < rows) {
          grid[by][bx] = isPlaying && val > 0.6 ? '●' : ':';
        }
      }
    }

    // Center radar hub
    if (cy >= 0 && cy < rows && cx >= 0 && cx < cols) grid[cy][cx] = '+';

    const lines = [];
    lines.push(` [·] 360° SONAR RADAR // SWEEP: ${Math.round((sweepAngle / (Math.PI * 2)) * 360)}°`);
    lines.push(' ┌' + '─'.repeat(cols) + '┐');
    grid.forEach(row => lines.push(' │' + row.join('') + '│'));
    lines.push(' └' + '─'.repeat(cols) + '┘');
    lines.push('  ACOUSTIC ECHOLOCATION ACTIVE');
    return lines.join('\n');
  }

  /**
   * Mode 6: Particle Fountain
   */
  renderParticleFountain(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0;
    for (let i = 0; i < 4; i++) bass += rawData[i] || 0;
    bass = bass / (4 * 255);

    const mobile = this.isMobile();
    const rows = mobile ? 9 : 11;
    const cols = mobile ? 34 : 46;
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));

    if (!this.particles) {
      this.particles = Array.from({ length: 28 }, () => ({
        x: Math.floor(cols / 2),
        y: rows - 1,
        vx: (Math.random() * 2 - 1) * 1.5,
        vy: -Math.random() * 2 - 1,
        life: 0
      }));
    }

    const cx = Math.floor(cols / 2);

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.life++;

      const px = Math.round(p.x);
      const py = Math.round(p.y);

      if (px >= 0 && px < cols && py >= 0 && py < rows) {
        grid[py][px] = p.life < 3 ? '●' : (p.life < 6 ? '•' : '·');
      }

      if (p.y >= rows || p.life > 14 || p.x < 0 || p.x >= cols) {
        p.x = cx + (Math.random() * 6 - 3);
        p.y = rows - 1;
        const kick = isPlaying ? 1 + bass * 2 : 1;
        p.vx = (Math.random() * 2 - 1) * (1.2 * kick);
        p.vy = -(1.5 + Math.random() * 2.2) * (kick * 0.8);
        p.life = 0;
      }
    });

    const lines = [];
    lines.push(` [·] PARTICLE FOUNTAIN // KICK: ${Math.round(bass * 100)}%`);
    lines.push(' ┌' + '─'.repeat(cols) + '┐');
    grid.forEach(row => lines.push(' │' + row.join('') + '│'));
    lines.push(' └' + '─'.repeat(cols) + '┘');
    lines.push('  PHYSICS KINETICS // 60 FPS');
    return lines.join('\n');
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
