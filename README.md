# Dot Music Player // Nothing OS Style

> **Developed by S. M. Mahmud Iqbal**

A **100% Offline**, Nothing OS-inspired Android and mobile web audio player engineered with binaural 3D spatial audio, interactive 64-bar dot-matrix waveform seeker, procedural generative album art synthesizer, real-time parametric frequency curve, native Android hardware DAC inspector, recursive song filtering autoscan, and a 10-band graphic equalizer.

---

## Technical Specifications & Architecture

### 1. 100% Offline & Zero Telemetry
- **No Internet Required**: Zero external CDN requests or third-party tracking. All assets, scripts, fonts, and engines are self-contained.
- **Android APK & PWA**: Runs natively via Android WebView bridge (`DotMusicPlayer.apk`) with background `ForegroundService`, `MediaSession`, and `WakeLock` support, or as an offline PWA.

### 2. Audiophile & DSP Sound Engineering
- **Binaural 3D Spatial Audio & Headphone HRTF Engine**: Web Audio `PannerNode` utilizing Head-Related Transfer Function (`panningModel = 'HRTF'`, `distanceModel = 'inverse'`) to simulate authentic headphone binaural acoustics with 4 modes (`BYPASS`, `WIDE 180°`, `360° ORBIT`, `ARENA 3D`) and interactive 360-degree azimuth positioning.
- **Real-Time Parametric Frequency Response Curve**: 64-point FFT mathematical response curve calculating combined magnitude response across all 10 equalizer bands and sub-bass resonant booster.
- **10-Band Graphic Equalizer**: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz with ±12dB gain range.
- **Sub-Bass Resonant Booster**: Dedicated low-shelf filter with variable gain up to +12dB.
- **Spatial Acoustic Reverb**: Procedural impulse response convolver with presets for Studio, Room, Chamber, Hall, and Cathedral.

### 3. Nothing OS Aesthetics & Visual Upgrades
- **Interactive 64-Bar Dot-Matrix Waveform Seeker**: Canvas-based 64-bar dynamic waveform progress bar rendering discrete Nothing OS dot columns with instant touch scrubbing.
- **Generative Dot-Matrix Album Art Synthesizer**: Deterministic PRNG mandala synthesizer generating high-contrast geometric album art for offline tracks without embedded artwork.
- **Kinetic Touch Gestures**: Smooth horizontal swipes on album art for track transitions and double-tap gestures for ±10s seeking.
- **Strictly Zero Emojis**: All interfaces rendered exclusively with pixel-perfect vector SVGs, geometric glyphs, and Ndot 57 typography.

### 4. Native Android Hardware DAC & Stream Inspector
- **Hardware Audio Output Detection**: Inspects active Android audio routing to identify `USB DAC [BIT-PERFECT]`, `BLUETOOTH A2DP [HD AUDIO]`, `WIRED ANALOG 3.5MM [HI-RES]`, or `INTERNAL STEREO`.
- **Stream Telemetry**: Hardware sample rate, buffer size, latency in milliseconds, and bit-depth inspection.
- **Stereo VU Peak Meter**: Real-time left/right peak decibel meters with dynamic headroom tracking.

### 5. Smart Song Filter & Device AutoScan
- **Music-Only AutoScan**: Recursively scans Android storage while automatically filtering out call recordings, voice memos, ringtones, UI sound effects, and short audio files under 90 seconds (1.5 minutes).
- **Multi-Format Support**: `.mp3`, `.flac`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.opus`, `.webm`, `.wma`.

---

## Android APK Build & Install

```powershell
# Build and sign the native Android APK
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

Installs `DotMusicPlayer.apk` onto any Android device (Android 7.0+ / API 24+).

Release signing now requires `DOTMUSIC_KEYSTORE_PATH`, `DOTMUSIC_STORE_PASSWORD`, `DOTMUSIC_KEY_ALIAS`, and `DOTMUSIC_KEY_PASSWORD` from a protected environment. The keystore must be stored outside this repository; the build intentionally fails if any signing input is missing. Replacing the published signing identity can prevent existing installs from receiving updates, so use only a distribution-compatible key.

---

## License & Attribution

Developed by **S. M. Mahmud Iqbal**.
Licensed under the MIT License.
