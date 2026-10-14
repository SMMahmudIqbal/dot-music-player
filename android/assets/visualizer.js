/**
 * Real-Time ASCII Audio Animation Engine
 * Dot Music Player - 100% Offline
 * Author: Developed by S. M. Mahmud Iqbal
 */

class AsciiVisualizer {
  constructor(containerElement, audioEngine) {
    this.container = containerElement;
    this.audioEngine = audioEngine;
    this.mode = 0; // 0..6
    this.modeNames = [
      'NOTHING DOT SPECTRUM',
      'REEL CASSETTE TAPE',
      'VINYL TURNTABLE',
      'CYBER OSCILLOSCOPE',
      'DUAL STEREO VU METER',
      'NOTHING GLYPH MATRIX',
      'MATRIX CYBER RAIN'
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
    this.rainColumns = 48;
    this.rainDrops = Array.from({ length: this.rainColumns }, () => Math.floor(Math.random() * 12));

    this.colorTheme = 'mono'; // 'mono', 'red', 'green', 'amber'
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
    const loop = () => {
      this.render();
      this.frame++;
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
        asciiOutput = this.renderCassetteTape(isPlaying);
        break;
      case 2:
        asciiOutput = this.renderVinylTurntable(isPlaying);
        break;
      case 3:
        asciiOutput = this.renderOscilloscope(isPlaying);
        break;
      case 4:
        asciiOutput = this.renderStereoVU(isPlaying);
        break;
      case 5:
        asciiOutput = this.renderGlyphMatrix(isPlaying);
        break;
      case 6:
        asciiOutput = this.renderMatrixRain(isPlaying);
        break;
      default:
        asciiOutput = this.renderDotSpectrum(isPlaying);
    }

    this.container.textContent = asciiOutput;
  }

  /**
   * Mode 0: Nothing OS Dot Matrix Spectrum Analyzer
   */
  renderDotSpectrum(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    const bandsCount = 28;
    const height = 12;
    const dotLevels = [' ', '·', ':', '•', 'o', 'O', '8', '●'];

    // Downsample frequency data into musical logarithm-spaced bands
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
      
      // If idle/paused, show a subtle breathing dot wave
      if (!isPlaying) {
        val = 0.08 + 0.05 * Math.sin((this.frame * 0.04) + (b * 0.25));
      }
      bandValues.push(val);

      // Peak hold calculation
      if (val >= (this.peakLevels[b] || 0)) {
        this.peakLevels[b] = val;
        this.peakDecay[b] = 0;
      } else {
        this.peakDecay[b] = (this.peakDecay[b] || 0) + 0.012;
        this.peakLevels[b] = Math.max(0, this.peakLevels[b] - this.peakDecay[b]);
      }
    }

    const lines = [];
    const statusText = isPlaying ? 'ACTIVE AUDIO STREAM' : 'STANDBY // IDLE RADAR';
    lines.push(` [·] NOTHING DOT SPECTRUM // 32Hz-16kHz [STATUS: ${statusText}]`);
    lines.push(' ┌────────────────────────────────────────────────────────────┐');

    for (let row = height - 1; row >= 0; row--) {
      const rowThreshold = (row + 1) / height;
      const prevThreshold = row / height;
      let line = ' │ ';

      for (let b = 0; b < bandsCount; b++) {
        const val = bandValues[b];
        const peak = this.peakLevels[b] || 0;
        const isPeakRow = Math.abs(peak - rowThreshold) < (0.5 / height);

        if (isPeakRow && peak > 0.12 && isPlaying) {
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

    lines.push(' ├────────────────────────────────────────────────────────────┤');
    lines.push(' │ 32  64  125 250 500  1K  2K  3K  4K  6K  8K  12K 16K [NOTHING] │');
    lines.push(' └────────────────────────────────────────────────────────────┘');

    return lines.join('\n');
  }

  /**
   * Mode 1: Retro Reel-to-Reel Cassette Tape
   */
  renderCassetteTape(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0;
    for (let i = 0; i < 8; i++) bass += rawData[i] || 0;
    bass = bass / (8 * 255);

    if (isPlaying) {
      this.spoolAngle += 0.2 + (bass * 0.2);
    }

    const spokes = ['|', '/', '-', '\\'];
    const spoolIndex1 = Math.floor(this.spoolAngle) % spokes.length;
    const spoolIndex2 = Math.floor(this.spoolAngle * 1.05) % spokes.length;

    const s1 = isPlaying ? spokes[spoolIndex1] : '|';
    const s2 = isPlaying ? spokes[spoolIndex2] : '|';

    const curTime = this.audioEngine.audio.currentTime || 0;
    const durTime = this.audioEngine.audio.duration || 1;
    const progress = Math.max(0, Math.min(1, curTime / durTime));

    const leftTapeSpool = progress < 0.5 ? '( ( ● ) )' : '(  ●  )';
    const rightTapeSpool = progress > 0.5 ? '( ( ● ) )' : '(  ●  )';

    const formatTime = (t) => {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const tapeVibe = isPlaying && bass > 0.45 ? '~' : '-';

    return [
      ` /===============================================================\\`,
      ` |  [DOT MUSIC]      :: TYPE-II HIGH BIAS / CHROME ::        [o]  |`,
      ` | +-----------------------------------------------------------+ |`,
      ` | |  .---.                                             .---.  | |`,
      ` | | (  ${s1}  )    ${tapeVibe}${tapeVibe}${tapeVibe}${tapeVibe}${tapeVibe}${tapeVibe}${tapeVibe}${tapeVibe}[ TAPE COUNTER ]${tapeVibe}${tapeVibe}${tapeVibe}${tapeVibe}${tapeVibe}${tapeVibe}${tapeVibe}${tapeVibe}    (  ${s2}  ) | |`,
      ` | |  '---'                   [ ${formatTime(curTime)} / ${formatTime(durTime)} ]                   '---'  | |`,
      ` | | ${leftTapeSpool}       ==============================       ${rightTapeSpool} | |`,
      ` | |                 [·] MAGNETIC HIGH RESOLUTION                 | |`,
      ` | |  ( O )          [STATUS: ${isPlaying ? 'PLAYING // TAPE MOTOR ON' : 'MOTOR STOPPED // IDLE '}]        ( O ) | |`,
      ` | +-----------------------------------------------------------+ |`,
      ` |   [A] SIDE   |  DOLBY B-C NR  |  OFFLINE STEREO  |  NOTHING OS  |`,
      ` \\===============================================================/`
    ].join('\n');
  }

  /**
   * Mode 2: Animated ASCII Vinyl Turntable
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

    const armVibe = isPlaying && bass > 0.4 ? '•' : '═';

    return [
      ` +----------------- NOTHING OS DIRECT DRIVE TURNTABLE -----------------+`,
      ` |                                                                   |`,
      ` |              . - ~ ~ ~ ~ ~ ~ ~ ~ - .           [TONEARM 33 RPM]   |`,
      ` |          . '     /~~~~~~~~~~~~~\\     ' .          ┌───┐           |`,
      ` |        /       (   /~~~~~~~~~\\   )       \\        │ O │ (PIVOT)   |`,
      ` |       /      (   (    /~~~\\    )   )      \\       └─┬─┘           |`,
      ` |      |      (   (   ( [·] )   )   )      |        ${armVibe}             |`,
      ` |      |      |   |   | ( * ) |   |   |      |===---====${armVibe}====> [HEAD]  |`,
      ` |      |      (   (   ( [·] )   )   )      |            │ (NEEDLE)  |`,
      ` |       \\      (   (    \\___/    )   )      /            ▼           |`,
      ` |        \\       (   \\_________/   )       /         [GROOVE: ${Math.round(progress * 100)}%]   |`,
      ` |          . _     \\_____________/     _ .           [STATUS: ${isPlaying ? 'SPINNING' : 'STOPPED'}]  |`,
      ` |              ' - _ _ _ _ _ _ _ _ - '               [DRIVE: 0.00% WF]|`,
      ` +-------------------------------------------------------------------+`
    ].join('\n');
  }

  /**
   * Mode 3: Cyber Oscilloscope (Time Domain Waveform)
   */
  renderOscilloscope(isPlaying) {
    const wave = this.audioEngine.getTimeDomainData();
    const width = 60;
    const height = 11;
    const grid = Array.from({ length: height }, () => Array(width).fill(' '));
    const midY = Math.floor(height / 2);

    if (isPlaying) {
      for (let x = 0; x < width; x++) {
        const sampleIdx = Math.floor((x / width) * wave.length);
        const norm = (wave[sampleIdx] - 128) / 128; // -1.0 to 1.0
        let y = midY - Math.round(norm * (height / 2.2));
        y = Math.max(0, Math.min(height - 1, y));
        grid[y][x] = norm > 0.05 || norm < -0.05 ? '█' : '─';
      }
    } else {
      // Idle gentle radar sweep
      const sweepX = Math.floor((this.frame * 0.8) % width);
      for (let x = 0; x < width; x++) {
        grid[midY][x] = x === sweepX ? '●' : '─';
      }
    }

    const lines = [];
    lines.push(' [·] DUAL TRACE PHOSPHOR OSCILLOSCOPE // 100% OFFLINE ANALOG PROBE');
    lines.push(' ┌' + '─'.repeat(width + 2) + '┐');
    for (let r = 0; r < height; r++) {
      let line = ' │ ';
      for (let c = 0; c < width; c++) {
        if (grid[r][c] === ' ' && (r === midY || c % 12 === 0)) {
          line += '·';
        } else {
          line += grid[r][c];
        }
      }
      line += ' │';
      lines.push(line);
    }
    lines.push(' └' + '─'.repeat(width + 2) + '┘');
    lines.push('  VOLTS/DIV: 50mV  TIME/DIV: 2.0ms  COUPLING: AC  TRIGGER: AUTO');
    return lines.join('\n');
  }

  /**
   * Mode 4: Dual Analog Stereo VU Meters
   */
  renderStereoVU(isPlaying) {
    const vu = isPlaying ? this.audioEngine.getStereoVU() : { left: 0.02, right: 0.02, peakL: 0.02, peakR: 0.02 };
    const meterWidth = 36;

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

    const dbL = this.vuNeedleL > 0.01 ? (20 * Math.log10(this.vuNeedleL)).toFixed(1) : '-INF';
    const dbR = this.vuNeedleR > 0.01 ? (20 * Math.log10(this.vuNeedleR)).toFixed(1) : '-INF';

    const clipL = this.vuPeakL > 0.95 ? '[OVERLOAD]' : '  [NORMAL]';
    const clipR = this.vuPeakR > 0.95 ? '[OVERLOAD]' : '  [NORMAL]';

    return [
      ` /================= NOTHING OS PRECISION STEREO VU =================\\`,
      ` |                                                                  |`,
      ` |  CHANNEL LEFT (L)                                                |`,
      ` |  -20   -10    -7    -5    -3    -1     0    +1    +2    +3 [dB]   |`,
      ` |  [${makeBar(this.vuNeedleL, this.vuPeakL)}] ${dbL}dB ${clipL} |`,
      ` |                                                                  |`,
      ` |  CHANNEL RIGHT (R)                                               |`,
      ` |  -20   -10    -7    -5    -3    -1     0    +1    +2    +3 [dB]   |`,
      ` |  [${makeBar(this.vuNeedleR, this.vuPeakR)}] ${dbR}dB ${clipR} |`,
      ` |                                                                  |`,
      ` |  BALLISTICS: ANSI C16.5-1954   INTEGRATION: 300ms   REF: 0VU = 4dBu|`,
      ` \\==================================================================/`
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
    const ring = (l) => (l > 0.35 ? '████' : '░░░░');

    return [
      ` +-------------------- NOTHING GLYPH MATRIX LIGHTS --------------------+`,
      ` |                                                                    |`,
      ` |          (CAMERA GLYPH)          (DIAGONAL SLASH)                  |`,
      ` |             .-----.                    \\ \\                         |`,
      ` |            /  ${ring(treble)}  \\                    \\ \\ [MID: ${Math.round(mid*100)}%]            |`,
      ` |           |   ${glyphChar(treble, 0.2)}   ${glyphChar(treble, 0.45)}   |                    \\ \\                        |`,
      ` |            \\  ${ring(treble)}  /                     \\ \\                       |`,
      ` |             '-----'                                                |`,
      ` |                                                                    |`,
      ` |                     .--------------------.                         |`,
      ` |                    /     (CENTER GLYPH)   \\                        |`,
      ` |                   |   [BASS: ${Math.round(bass * 100)}%]   ${glyphChar(bass, 0.25)}  ${glyphChar(bass, 0.5)}   |                       |`,
      ` |                    \\                      /                        |`,
      ` |                     '--------------------'                         |`,
      ` |                               |                                    |`,
      ` |                       (EXCLAMATION BAR)                            |`,
      ` |                               │ ${glyphChar(bass, 0.4)}                          |`,
      ` |                               ● (DOT)                              |`,
      ` +--------------------------------------------------------------------+`
    ].join('\n');
  }

  /**
   * Mode 6: Matrix Cyber Rain (Bass-reactive ASCII waterfall)
   */
  renderMatrixRain(isPlaying) {
    const rawData = this.audioEngine.getFrequencyData();
    let bass = 0;
    for (let i = 0; i < 6; i++) bass += rawData[i] || 0;
    bass = bass / (6 * 255);

    const height = 11;
    const width = 48;
    const matrixChars = '01•·:*+=%@#';
    const lines = [];

    lines.push(` [·] MATRIX CYBER RAIN // BASS ENERGY: ${Math.round(bass * 100)}%`);
    lines.push(' ┌' + '─'.repeat(width + 2) + '┐');

    // Update rain drops
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
    lines.push('  NEURAL STREAM // ZERO TELEMETRY // 100% OFFLINE PLAYBACK');
    return lines.join('\n');
  }
}

if (typeof window !== 'undefined') {
  window.AsciiVisualizer = AsciiVisualizer;
}
