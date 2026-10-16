/**
 * Pure JavaScript ID3 / Audio Metadata Parser
 * Dot Music Player - 100% Offline
 * Author: Developed by S. M. Mahmud Iqbal
 */

class ID3Parser {
  /**
   * Parse metadata from an audio File or Blob
   * @param {File|Blob} file 
   * @returns {Promise<Object>}
   */
  static async parse(file) {
    const meta = {
      title: this.cleanFileName(file.name),
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      year: '',
      genre: 'Audio',
      track: '',
      duration: 0,
      picture: null,
      format: this.detectFormat(file.name, file.type),
      size: file.size,
      bitrate: null
    };

    try {
      // Read first 128 KB for ID3v2
      const headerBufferSize = Math.min(131072, file.size);
      const headerBuffer = await file.slice(0, headerBufferSize).arrayBuffer();
      const id3v2Data = this.parseID3v2(headerBuffer);

      if (id3v2Data) {
        if (id3v2Data.title) meta.title = id3v2Data.title.trim();
        if (id3v2Data.artist) meta.artist = id3v2Data.artist.trim();
        if (id3v2Data.album) meta.album = id3v2Data.album.trim();
        if (id3v2Data.year) meta.year = id3v2Data.year.trim();
        if (id3v2Data.genre) meta.genre = id3v2Data.genre.trim();
        if (id3v2Data.track) meta.track = id3v2Data.track.trim();
        if (id3v2Data.picture) meta.picture = id3v2Data.picture;
      }

      // If ID3v2 didn't provide title/artist, check ID3v1 at end of file (128 bytes)
      if ((meta.artist === 'Unknown Artist' || meta.album === 'Unknown Album') && file.size > 128) {
        const v1Buffer = await file.slice(file.size - 128, file.size).arrayBuffer();
        const id3v1Data = this.parseID3v1(v1Buffer);
        if (id3v1Data) {
          if (!id3v2Data || !id3v2Data.title) meta.title = id3v1Data.title || meta.title;
          if (meta.artist === 'Unknown Artist' && id3v1Data.artist) meta.artist = id3v1Data.artist;
          if (meta.album === 'Unknown Album' && id3v1Data.album) meta.album = id3v1Data.album;
          if (!meta.year && id3v1Data.year) meta.year = id3v1Data.year;
          if (meta.genre === 'Audio' && id3v1Data.genre) meta.genre = id3v1Data.genre;
        }
      }

      // Fallback: parse from file name if format is "Artist - Title"
      if (meta.artist === 'Unknown Artist' && file.name.includes(' - ')) {
        const parts = this.cleanFileName(file.name).split(' - ');
        if (parts.length >= 2) {
          meta.artist = parts[0].trim();
          meta.title = parts.slice(1).join(' - ').trim();
        }
      }

      // Determine duration via HTML5 Audio element metadata
      if ((!meta.duration || meta.duration === 0) && typeof window !== 'undefined' && typeof document !== 'undefined') {
        meta.duration = await this.getAudioDuration(file);
      }
    } catch (err) {
      console.warn('ID3 parse fallback used for:', file.name, err);
    }

    return meta;
  }

  static async getAudioDuration(file) {
    return new Promise((resolve) => {
      try {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        const url = URL.createObjectURL(file);
        audio.src = url;
        let resolved = false;

        const cleanup = () => {
          if (!resolved) {
            resolved = true;
            URL.revokeObjectURL(url);
          }
        };

        audio.onloadedmetadata = () => {
          const dur = audio.duration;
          cleanup();
          resolve(Number.isFinite(dur) ? dur : 0);
        };

        audio.onerror = () => {
          cleanup();
          resolve(0);
        };

        setTimeout(() => {
          cleanup();
          resolve(0);
        }, 1500);
      } catch (e) {
        resolve(0);
      }
    });
  }

  static cleanFileName(filename) {
    return filename.replace(/\.[^/.]+$/, '').replace(/^[0-9]+[\s._-]+/, '');
  }

  static detectFormat(filename, mime) {
    const ext = filename.split('.').pop().toLowerCase();
    const formats = {
      mp3: 'MP3 Audio',
      flac: 'FLAC Lossless',
      wav: 'WAV Linear PCM',
      ogg: 'OGG Vorbis',
      m4a: 'M4A / AAC',
      aac: 'AAC Audio',
      opus: 'Opus Audio',
      webm: 'WebM Audio',
      wma: 'WMA Audio'
    };
    return formats[ext] || (mime ? mime.toUpperCase() : 'AUDIO');
  }

  static parseID3v1(buffer) {
    if (buffer.byteLength < 128) return null;
    const view = new DataView(buffer);
    const tag = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2));
    if (tag !== 'TAG') return null;

    const readString = (start, length) => {
      let str = '';
      for (let i = 0; i < length; i++) {
        const code = view.getUint8(start + i);
        if (code === 0) break;
        str += String.fromCharCode(code);
      }
      return str.trim();
    };

    const genres = [
      'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge',
      'Hip-Hop', 'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B',
      'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial', 'Alternative', 'Ska',
      'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop',
      'Vocal', 'Jazz+Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid',
      'House', 'Game', 'Sound Clip', 'Gospel', 'Noise', 'AlternRock', 'Bass', 'Soul',
      'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock', 'Ethnic',
      'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk', 'Eurodance',
      'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta', 'Top 40', 'Christian Rap',
      'Pop/Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave', 'Psychadelic',
      'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk', 'Acid Jazz',
      'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock'
    ];

    const genreCode = view.getUint8(127);
    return {
      title: readString(3, 30),
      artist: readString(33, 30),
      album: readString(63, 30),
      year: readString(93, 4),
      genre: genres[genreCode] || 'Music'
    };
  }

  static parseID3v2(buffer) {
    if (buffer.byteLength < 10) return null;
    const view = new DataView(buffer);

    // ID3 identifier
    const id = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2));
    if (id !== 'ID3') return null;

    const majorVersion = view.getUint8(3); // 3 for 2.3, 4 for 2.4
    const flags = view.getUint8(5);
    const hasExtendedHeader = (flags & 0x40) !== 0;

    // Syncsafe size
    const tagSize = (
      ((view.getUint8(6) & 0x7f) << 21) |
      ((view.getUint8(7) & 0x7f) << 14) |
      ((view.getUint8(8) & 0x7f) << 7) |
      (view.getUint8(9) & 0x7f)
    );

    let offset = 10;
    if (hasExtendedHeader) {
      const extSize = majorVersion === 4
        ? (((view.getUint8(offset) & 0x7f) << 21) | ((view.getUint8(offset+1) & 0x7f) << 14) | ((view.getUint8(offset+2) & 0x7f) << 7) | (view.getUint8(offset+3) & 0x7f))
        : view.getUint32(offset);
      offset += extSize;
    }

    const result = {
      title: null,
      artist: null,
      album: null,
      year: null,
      genre: null,
      track: null,
      picture: null
    };

    const maxOffset = Math.min(offset + tagSize, buffer.byteLength - 10);

    while (offset < maxOffset) {
      let frameID = '';
      for (let i = 0; i < 4; i++) {
        const c = view.getUint8(offset + i);
        if (c < 32 || c > 126) break;
        frameID += String.fromCharCode(c);
      }

      if (frameID.length !== 4) break;

      let frameSize = 0;
      if (majorVersion === 4) {
        frameSize = (
          ((view.getUint8(offset + 4) & 0x7f) << 21) |
          ((view.getUint8(offset + 5) & 0x7f) << 14) |
          ((view.getUint8(offset + 6) & 0x7f) << 7) |
          (view.getUint8(offset + 7) & 0x7f)
        );
      } else {
        frameSize = view.getUint32(offset + 4);
      }

      if (frameSize <= 0 || offset + 10 + frameSize > buffer.byteLength) {
        break;
      }

      const frameDataOffset = offset + 10;

      // Handle Text Frames
      if (['TIT2', 'TPE1', 'TALB', 'TYER', 'TDRC', 'TCON', 'TRCK'].includes(frameID)) {
        const text = this.decodeTextFrame(view, frameDataOffset, frameSize);
        if (frameID === 'TIT2') result.title = text;
        else if (frameID === 'TPE1') result.artist = text;
        else if (frameID === 'TALB') result.album = text;
        else if (frameID === 'TYER' || frameID === 'TDRC') result.year = text;
        else if (frameID === 'TCON') result.genre = this.cleanGenreString(text);
        else if (frameID === 'TRCK') result.track = text;
      } else if (frameID === 'APIC' && !result.picture) {
        // Picture frame
        try {
          result.picture = this.decodeAPICFrame(buffer, frameDataOffset, frameSize);
        } catch (e) {
          console.warn('Cover art decode error:', e);
        }
      }

      offset += 10 + frameSize;
    }

    return result;
  }

  static cleanGenreString(raw) {
    if (!raw) return 'Audio';
    // ID3v2 genres sometimes look like (17)Rock or (17)
    const match = raw.match(/\((\d+)\)/);
    if (match) {
      const idx = parseInt(match[1], 10);
      const v1Genres = ['Blues','Classic Rock','Country','Dance','Disco','Funk','Grunge','Hip-Hop','Jazz','Metal','New Age','Oldies','Other','Pop','R&B','Rap','Reggae','Rock','Techno','Industrial','Alternative','Ska','Death Metal','Pranks','Soundtrack','Euro-Techno','Ambient','Trip-Hop','Vocal','Jazz+Funk','Fusion','Trance','Classical','Instrumental','Acid','House','Game','Sound Clip','Gospel','Noise','AlternRock','Bass','Soul','Punk','Space','Meditative','Instrumental Pop','Instrumental Rock','Ethnic','Gothic','Darkwave','Techno-Industrial','Electronic'];
      if (v1Genres[idx]) return v1Genres[idx];
    }
    return raw.replace(/\(\d+\)/g, '').trim() || 'Audio';
  }

  static decodeTextFrame(view, offset, size) {
    if (size <= 1) return '';
    const encoding = view.getUint8(offset);
    const dataSlice = new Uint8Array(view.buffer, view.byteOffset + offset + 1, size - 1);

    try {
      if (encoding === 0) {
        // ISO-8859-1
        let str = '';
        for (let i = 0; i < dataSlice.length; i++) {
          if (dataSlice[i] === 0) break;
          str += String.fromCharCode(dataSlice[i]);
        }
        return str;
      } else if (encoding === 1 || encoding === 2) {
        // UTF-16 with BOM or UTF-16BE
        const decoder = new TextDecoder('utf-16');
        return decoder.decode(dataSlice).replace(/\0.*$/g, '');
      } else if (encoding === 3) {
        // UTF-8
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(dataSlice).replace(/\0.*$/g, '');
      }
    } catch (e) {
      // Fallback
    }

    let str = '';
    for (let i = 0; i < dataSlice.length; i++) {
      if (dataSlice[i] === 0) break;
      if (dataSlice[i] >= 32 && dataSlice[i] <= 126) {
        str += String.fromCharCode(dataSlice[i]);
      }
    }
    return str.trim();
  }

  static decodeAPICFrame(buffer, offset, size) {
    const view = new DataView(buffer, offset, size);
    let p = 0;
    const encoding = view.getUint8(p++);

    // Read MIME type (null-terminated ASCII)
    let mime = '';
    while (p < size && view.getUint8(p) !== 0) {
      mime += String.fromCharCode(view.getUint8(p++));
    }
    p++; // skip null terminator

    if (!mime || mime === '-->') mime = 'image/jpeg';

    // Picture type (1 byte)
    p++;

    // Description (null-terminated depending on encoding)
    if (encoding === 1 || encoding === 2) {
      // UTF-16: ends with 0x00 0x00
      while (p + 1 < size) {
        if (view.getUint8(p) === 0 && view.getUint8(p + 1) === 0) {
          p += 2;
          break;
        }
        p += 2;
      }
    } else {
      // 1-byte null terminator
      while (p < size && view.getUint8(p) !== 0) {
        p++;
      }
      p++;
    }

    // Remainder is image data
    if (p < size) {
      const imgBytes = new Uint8Array(buffer, offset + p, size - p);
      const blob = new Blob([imgBytes], { type: mime });
      return URL.createObjectURL(blob);
    }
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.ID3Parser = ID3Parser;
}
