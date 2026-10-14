# Dot Music Player // Nothing OS Style

> **Developed by S. M. Mahmud Iqbal**

A **100% Offline**, Nothing OS-inspired desktop & web audio player engineered with real-time ASCII animations, recursive device autoscan, embedded ID3 tag parsing, and a 10-band graphic equalizer.

---

## ✨ Key Features

### 1. 📴 100% Offline & Zero Telemetry
- **No Internet Required**: Zero external CDN requests or third-party tracking. All assets, scripts, fonts, and engines are self-contained.
- **PWA Ready**: Works offline forever using native Service Worker caching (`service-worker.js`) and IndexedDB persistence (`DotMusicPlayerDB`).

### 2. 📁 Automatic Device Audio Scanner
- **Recursive Device AutoScan**: Leveraging the modern **File System Access API** (`window.showDirectoryPicker`), Dot Music Player scans entire storage drives or music folders recursively, extracting and categorizing all audio files.
- **Multi-Format Ingestion**: Supports `.mp3`, `.flac`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.opus`, `.webm`, and `.wma`.
- **Drag & Drop**: Drop any folder or playlist hierarchy directly onto the application window.
- **Fallback Directory Pickers**: Native folder import dialogs for browsers without File System Access API.

### 3. 📟 Real-Time ASCII Audio Animations
Six interactive, audio-reactive ASCII visualizers driven directly by the Web Audio API's 256-band FFT `AnalyserNode`:
1. **NOTHING DOT SPECTRUM**: Iconic Nothing OS dot-matrix multi-band frequency analyzer with logarithmic frequency scaling and peak-hold indicators.
2. **REEL CASSETTE TAPE**: Dynamic rotating tape reels whose spokes spin at playback speed with animated winding ribbons and live tape counter.
3. **VINYL TURNTABLE**: Direct-drive grooved turntable with tone-arm tracking and vibrating needle.
4. **CYBER OSCILLOSCOPE**: Real-time 2D time-domain waveform phosphor display.
5. **DUAL STEREO VU METERS**: Vintage analog needle decibel meters (L/R) with peak needle hold and overload warning.
6. **NOTHING GLYPH MATRIX**: Iconic geometric Nothing Phone Glyph lighting array (camera ring, diagonal slash, central glyph, and exclamation dot) pulsing to audio frequency bands.
- **Palette Switcher**: Switch ASCII phosphor themes between *Nothing Mono*, *Nothing Red*, *Cyber Green*, and *Amber CRT*.

### 4. 🎛️ Acoustic Tuning & 10-Band Graphic Equalizer
- **10-Band Precision Filter**: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz with ±12dB gain range.
- **Presets**: Flat, Bass Boost, Nothing Dot, Cyber Synth, Vocal, Rock, Acoustic, Treble.
- **Stereo Panorama**: Real-time spatial left/right panner.
- **Sleep Timer**: 15m, 30m, 45m, 60m countdown with automatic volume fadeout on completion.
- **Procedural Demo Synth**: Built-in 8-bit / Darkwave Web Audio synthesizer to test audio and visualizers immediately with zero external files.

### 5. 🏷️ Zero-Dependency ID3 Tag Parser
- Reads ID3v2.3, ID3v2.4, and ID3v1 metadata (Title, Artist, Album, Year, Genre, Track Number).
- Extracts embedded APIC album art images directly into high-res cover displays.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `Space` | Play / Pause |
| `J` / `K` | Previous / Next Track |
| `←` / `→` | Seek 5 seconds backward / forward (`Shift` for 15s) |
| `↑` / `↓` | Volume Up / Down (5% steps) |
| `M` | Toggle Mute |
| `V` | Cycle ASCII Visualizer Mode |
| `S` | Toggle Shuffle |
| `R` | Toggle Repeat Mode (All / One / Off) |
| `/` | Quick Focus Search Bar |
| `?` | Show Shortcuts Matrix |

---

## 🚀 How to Run

1. Open `index.html` directly in any modern browser (Chrome, Edge, Brave, Firefox).
2. Click **`[·] AUTOSCAN DEVICE`** to select your music directory or drive, or drag and drop your music files directly onto the app.
3. To test immediately without local audio files, click **`SYNTH DEMO`** in the top header.

---

## 📄 License & Attribution

Developed by **S. M. Mahmud Iqbal**.
Licensed under the MIT License.
