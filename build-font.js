/**
 * TrueType / WOFF Dot-Matrix Font Builder for Nothing OS Aesthetic (NDot57)
 * Author: Developed by S. M. Mahmud Iqbal
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 5x7 Dot Matrix Bitmaps for ASCII 32 to 126
const FONT_MAP = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  '"': [0b01010, 0b01010, 0b01010, 0b00000, 0b00000, 0b00000, 0b00000],
  '#': [0b01010, 0b01010, 0b11111, 0b01010, 0b11111, 0b01010, 0b01010],
  '$': [0b00100, 0b01111, 0b10100, 0b01110, 0b00101, 0b11110, 0b00100],
  '%': [0b11001, 0b11010, 0b00100, 0b01000, 0b01011, 0b10011, 0b00000],
  '&': [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  "'": [0b00100, 0b00100, 0b00010, 0b00000, 0b00000, 0b00000, 0b00000],
  '(': [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ')': [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  '*': [0b00000, 0b01010, 0b00100, 0b11111, 0b00100, 0b01010, 0b00000],
  '+': [0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000],
  ',': [0b00000, 0b00000, 0b00000, 0b00000, 0b00110, 0b00110, 0b00100],
  '-': [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  '.': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00110, 0b00110],
  '/': [0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b00000, 0b00000],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  '3': [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  ':': [0b00000, 0b00100, 0b00100, 0b00000, 0b00100, 0b00100, 0b00000],
  ';': [0b00000, 0b00110, 0b00110, 0b00000, 0b00110, 0b00100, 0b01000],
  '<': [0b00010, 0b00100, 0b01000, 0b10000, 0b01000, 0b00100, 0b00010],
  '=': [0b00000, 0b11111, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  '>': [0b01000, 0b00100, 0b00010, 0b00001, 0b00010, 0b00100, 0b01000],
  '?': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b00000, 0b00100],
  '@': [0b01110, 0b10001, 0b00101, 0b01011, 0b01000, 0b10000, 0b01110],
  'A': [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  'B': [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  'C': [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  'D': [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  'E': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  'F': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  'G': [0b01110, 0b10001, 0b10000, 0b10011, 0b10001, 0b10001, 0b01110],
  'H': [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  'I': [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  'J': [0b00001, 0b00001, 0b00001, 0b00001, 0b10001, 0b10001, 0b01110],
  'K': [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  'L': [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  'M': [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  'N': [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  'O': [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  'P': [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  'Q': [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10011, 0b01101],
  'R': [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  'S': [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110],
  'T': [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  'U': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  'V': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  'W': [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  'X': [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  'Y': [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  'Z': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  '[': [0b01110, 0b01000, 0b01000, 0b01000, 0b01000, 0b01000, 0b01110],
  '\\': [0b10000, 0b01000, 0b00100, 0b00010, 0b00001, 0b00000, 0b00000],
  ']': [0b01110, 0b00010, 0b00010, 0b00010, 0b00010, 0b00010, 0b01110],
  '^': [0b00100, 0b01010, 0b10001, 0b00000, 0b00000, 0b00000, 0b00000],
  '_': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b11111],
  '`': [0b01000, 0b00100, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
  'a': [0b00000, 0b00000, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111],
  'b': [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b11110],
  'c': [0b00000, 0b00000, 0b01110, 0b10001, 0b10000, 0b10001, 0b01110],
  'd': [0b00001, 0b00001, 0b01111, 0b10001, 0b10001, 0b10001, 0b01111],
  'e': [0b00000, 0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  'f': [0b00110, 0b01000, 0b11110, 0b01000, 0b01000, 0b01000, 0b01000],
  'g': [0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  'h': [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  'i': [0b00100, 0b00000, 0b01100, 0b00100, 0b00100, 0b00100, 0b01110],
  'j': [0b00010, 0b00000, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  'k': [0b10000, 0b10000, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010],
  'l': [0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  'm': [0b00000, 0b00000, 0b11010, 0b10101, 0b10101, 0b10001, 0b10001],
  'n': [0b00000, 0b00000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  'o': [0b00000, 0b00000, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110],
  'p': [0b00000, 0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000],
  'q': [0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001],
  'r': [0b00000, 0b00000, 0b10110, 0b11001, 0b10000, 0b10000, 0b10000],
  's': [0b00000, 0b00000, 0b01111, 0b10000, 0b01110, 0b00001, 0b11110],
  't': [0b01000, 0b01000, 0b11110, 0b01000, 0b01000, 0b01001, 0b00110],
  'u': [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101],
  'v': [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  'w': [0b00000, 0b00000, 0b10001, 0b10001, 0b10101, 0b11011, 0b10001],
  'x': [0b00000, 0b00000, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001],
  'y': [0b00000, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  'z': [0b00000, 0b00000, 0b11111, 0b00010, 0b00100, 0b01000, 0b11111],
  '{': [0b00010, 0b00100, 0b00100, 0b01000, 0b00100, 0b00100, 0b00010],
  '|': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  '}': [0b01000, 0b00100, 0b00100, 0b00010, 0b00100, 0b00100, 0b01000],
  '~': [0b00000, 0b01000, 0b10101, 0b00010, 0b00000, 0b00000, 0b00000]
};

function calcCheckSum(buf) {
  let sum = 0;
  const len = Math.floor(buf.length / 4);
  for (let i = 0; i < len; i++) {
    sum = (sum + buf.readUInt32BE(i * 4)) >>> 0;
  }
  const rem = buf.length % 4;
  if (rem > 0) {
    let last = 0;
    for (let i = 0; i < rem; i++) {
      last = (last << 8) | buf[len * 4 + i];
    }
    last = last << ((4 - rem) * 8);
    sum = (sum + (last >>> 0)) >>> 0;
  }
  return sum;
}

// TrueType Builder
function buildTTF() {
  const unitsPerEm = 1000;
  const advanceWidth = 600;
  const colWidth = 90;
  const rowHeight = 110;
  const startX = 120;
  const startY = 140; // baseline to top
  const radius = 34; // dot radius

  // Collect glyphs: 0 is .notdef, then ascii 32 to 126
  const glyphs = [];
  glyphs.push({ charCode: 0, contours: [] }); // .notdef

  for (let c = 32; c <= 126; c++) {
    const ch = String.fromCharCode(c);
    const bitmap = FONT_MAP[ch] || FONT_MAP[' '];
    const contours = [];

    // Rows 0 (top) to 6 (bottom) in bitmap
    for (let r = 0; r < 7; r++) {
      const rowBits = bitmap[r];
      const y = startY + (6 - r) * rowHeight;

      for (let col = 0; col < 5; col++) {
        // bit 4 is col 0, bit 0 is col 4
        if ((rowBits & (1 << (4 - col))) !== 0) {
          const x = startX + col * colWidth;
          // Create 8-point TrueType circular contour (clockwise)
          contours.push([
            { x: x, y: y + radius, onCurve: true },
            { x: x + radius, y: y + radius, onCurve: false },
            { x: x + radius, y: y, onCurve: true },
            { x: x + radius, y: y - radius, onCurve: false },
            { x: x, y: y - radius, onCurve: true },
            { x: x - radius, y: y - radius, onCurve: false },
            { x: x - radius, y: y, onCurve: true },
            { x: x - radius, y: y + radius, onCurve: false }
          ]);
        }
      }
    }

    glyphs.push({ charCode: c, contours });
  }

  // 1. Build 'glyf' & 'loca' tables
  const glyfBuffers = [];
  const locaOffsets = [0];
  let currentOffset = 0;

  for (const glyph of glyphs) {
    if (glyph.contours.length === 0) {
      locaOffsets.push(currentOffset);
      continue;
    }

    const numContours = glyph.contours.length;
    let minX = 10000, minY = 10000, maxX = -10000, maxY = -10000;
    let totalPoints = 0;
    const endPts = [];

    glyph.contours.forEach((contour) => {
      totalPoints += contour.length;
      endPts.push(totalPoints - 1);
      contour.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    // Glyph header
    const header = Buffer.alloc(10);
    header.writeInt16BE(numContours, 0);
    header.writeInt16BE(minX, 2);
    header.writeInt16BE(minY, 4);
    header.writeInt16BE(maxX, 6);
    header.writeInt16BE(maxY, 8);

    // End points of contours
    const endPtsBuf = Buffer.alloc(numContours * 2);
    endPts.forEach((ep, i) => endPtsBuf.writeUInt16BE(ep, i * 2));

    // Instructions length
    const instructLenBuf = Buffer.alloc(2);
    instructLenBuf.writeUInt16BE(0, 0);

    // Flags, X, Y coordinates
    const allPoints = [];
    glyph.contours.forEach(c => c.forEach(pt => allPoints.push(pt)));

    const flagsBuf = Buffer.alloc(totalPoints);
    allPoints.forEach((pt, i) => {
      flagsBuf.writeUInt8(pt.onCurve ? 0x01 : 0x00, i);
    });

    // Write delta coordinates
    const xBufs = [];
    const yBufs = [];
    let lastX = 0, lastY = 0;

    for (const pt of allPoints) {
      const dx = pt.x - lastX;
      const dy = pt.y - lastY;
      lastX = pt.x;
      lastY = pt.y;

      const xb = Buffer.alloc(2);
      xb.writeInt16BE(dx, 0);
      xBufs.push(xb);

      const yb = Buffer.alloc(2);
      yb.writeInt16BE(dy, 0);
      yBufs.push(yb);
    }

    const glyphBuf = Buffer.concat([
      header,
      endPtsBuf,
      instructLenBuf,
      flagsBuf,
      ...xBufs,
      ...yBufs
    ]);

    // Pad to 2-byte boundary
    let paddedGlyph = glyphBuf;
    if (glyphBuf.length % 2 !== 0) {
      paddedGlyph = Buffer.concat([glyphBuf, Buffer.alloc(1)]);
    }

    glyfBuffers.push(paddedGlyph);
    currentOffset += paddedGlyph.length;
    locaOffsets.push(currentOffset);
  }

  const glyfTable = Buffer.concat(glyfBuffers);

  // 'loca' table (32-bit offsets)
  const locaTable = Buffer.alloc(locaOffsets.length * 4);
  locaOffsets.forEach((off, i) => locaTable.writeUInt32BE(off, i * 4));

  // 'maxp' table
  const maxpTable = Buffer.alloc(32);
  maxpTable.writeUInt32BE(0x00010000, 0); // version 1.0
  maxpTable.writeUInt16BE(glyphs.length, 4); // numGlyphs

  // 'head' table
  const headTable = Buffer.alloc(54);
  headTable.writeUInt32BE(0x00010000, 0); // version 1.0
  headTable.writeUInt32BE(0x00010000, 4); // fontRevision 1.0
  headTable.writeUInt32BE(0, 8); // checkSumAdjustment (calculated later)
  headTable.writeUInt32BE(0x5F0F3CF5, 12); // magicNumber
  headTable.writeUInt16BE(0b0000000000000001, 16); // flags
  headTable.writeUInt16BE(unitsPerEm, 18); // unitsPerEm
  // created & modified dates
  headTable.writeBigInt64BE(0n, 20);
  headTable.writeBigInt64BE(0n, 28);
  headTable.writeInt16BE(0, 36); // xMin
  headTable.writeInt16BE(0, 38); // yMin
  headTable.writeInt16BE(advanceWidth, 40); // xMax
  headTable.writeInt16BE(1000, 42); // yMax
  headTable.writeUInt16BE(0, 44); // macStyle
  headTable.writeUInt16BE(8, 46); // lowestRecPPEM
  headTable.writeInt16BE(2, 48); // fontDirectionHint
  headTable.writeInt16BE(1, 50); // indexToLocFormat: 1 for 32-bit loca
  headTable.writeInt16BE(0, 52); // glyphDataFormat

  // 'hhea' table
  const hheaTable = Buffer.alloc(36);
  hheaTable.writeUInt32BE(0x00010000, 0); // version
  hheaTable.writeInt16BE(950, 4); // ascender
  hheaTable.writeInt16BE(-150, 6); // descender
  hheaTable.writeInt16BE(100, 8); // lineGap
  hheaTable.writeUInt16BE(advanceWidth, 10); // advanceWidthMax
  hheaTable.writeInt16BE(0, 12); // minLeftSideBearing
  hheaTable.writeInt16BE(0, 14); // minRightSideBearing
  hheaTable.writeInt16BE(advanceWidth, 16); // xMaxExtent
  hheaTable.writeInt16BE(1, 18); // caretSlopeRise
  hheaTable.writeInt16BE(0, 20); // caretSlopeRun
  hheaTable.writeInt16BE(0, 22); // caretOffset
  hheaTable.writeInt16BE(0, 32); // metricDataFormat
  hheaTable.writeUInt16BE(glyphs.length, 34); // numberOfHMetrics

  // 'hmtx' table
  const hmtxTable = Buffer.alloc(glyphs.length * 4);
  for (let i = 0; i < glyphs.length; i++) {
    hmtxTable.writeUInt16BE(advanceWidth, i * 4);
    hmtxTable.writeInt16BE(60, i * 4 + 2); // leftSideBearing
  }

  // 'cmap' table (format 4)
  // Segments: 32..126, and 0xFFFF
  const segCount = 2;
  const endCodes = [126, 0xFFFF];
  const startCodes = [32, 0xFFFF];
  const idDeltas = [1 - 32, 1]; // glyph 1 corresponds to ASCII 32
  const idRangeOffsets = [0, 0];

  const subtableLen = 16 + (segCount * 8) + 2;
  const subtable = Buffer.alloc(subtableLen);
  subtable.writeUInt16BE(4, 0); // format 4
  subtable.writeUInt16BE(subtableLen, 2);
  subtable.writeUInt16BE(0, 4); // language
  subtable.writeUInt16BE(segCount * 2, 6); // segCountX2
  subtable.writeUInt16BE(2 * Math.pow(2, Math.floor(Math.log2(segCount))), 8); // searchRange
  subtable.writeUInt16BE(Math.floor(Math.log2(segCount)), 10); // entrySelector
  subtable.writeUInt16BE((segCount * 2) - 2 * Math.pow(2, Math.floor(Math.log2(segCount))), 12); // rangeShift

  let p = 14;
  endCodes.forEach(ec => { subtable.writeUInt16BE(ec, p); p += 2; });
  subtable.writeUInt16BE(0, p); p += 2; // reservedPad
  startCodes.forEach(sc => { subtable.writeUInt16BE(sc, p); p += 2; });
  idDeltas.forEach(id => { subtable.writeInt16BE(id, p); p += 2; });
  idRangeOffsets.forEach(ro => { subtable.writeUInt16BE(ro, p); p += 2; });

  const cmapTable = Buffer.alloc(12 + subtableLen);
  cmapTable.writeUInt16BE(0, 0); // version
  cmapTable.writeUInt16BE(1, 2); // numTables
  cmapTable.writeUInt16BE(3, 4); // platformID: Windows
  cmapTable.writeUInt16BE(1, 6); // encodingID: Unicode BMP
  cmapTable.writeUInt32BE(12, 8); // offset
  subtable.copy(cmapTable, 12);

  // 'name' table
  const fontStrings = [
    { id: 1, str: 'NDot57' },
    { id: 2, str: 'Regular' },
    { id: 3, str: 'NDot57:NothingOS:2026' },
    { id: 4, str: 'NDot57 Nothing OS' },
    { id: 5, str: 'Version 1.000' },
    { id: 6, str: 'NDot57-Regular' }
  ];

  let strStorageOffset = 6 + fontStrings.length * 12;
  const strBuffers = [];
  let currentStrOffset = 0;

  function encodeUTF16BE(str) {
    const buf = Buffer.alloc(str.length * 2);
    for (let i = 0; i < str.length; i++) {
      buf.writeUInt16BE(str.charCodeAt(i), i * 2);
    }
    return buf;
  }

  const nameRecords = fontStrings.map(fs => {
    const utf16be = encodeUTF16BE(fs.str);
    strBuffers.push(utf16be);
    const rec = {
      platformID: 3,
      encodingID: 1,
      languageID: 0x0409,
      nameID: fs.id,
      length: utf16be.length,
      offset: currentStrOffset
    };
    currentStrOffset += utf16be.length;
    return rec;
  });

  const nameHeader = Buffer.alloc(6);
  nameHeader.writeUInt16BE(0, 0); // format
  nameHeader.writeUInt16BE(fontStrings.length, 2); // count
  nameHeader.writeUInt16BE(strStorageOffset, 4); // stringOffset

  const recBuf = Buffer.alloc(fontStrings.length * 12);
  nameRecords.forEach((r, i) => {
    recBuf.writeUInt16BE(r.platformID, i * 12);
    recBuf.writeUInt16BE(r.encodingID, i * 12 + 2);
    recBuf.writeUInt16BE(r.languageID, i * 12 + 4);
    recBuf.writeUInt16BE(r.nameID, i * 12 + 6);
    recBuf.writeUInt16BE(r.length, i * 12 + 8);
    recBuf.writeUInt16BE(r.offset, i * 12 + 10);
  });

  const nameTable = Buffer.concat([nameHeader, recBuf, ...strBuffers]);

  // 'post' table (format 3.0: no glyph names)
  const postTable = Buffer.alloc(32);
  postTable.writeUInt32BE(0x00030000, 0); // format 3.0
  postTable.writeUInt32BE(0, 4); // italicAngle
  postTable.writeInt16BE(0, 8); // underlinePosition
  postTable.writeInt16BE(0, 10); // underlineThickness
  postTable.writeUInt32BE(1, 12); // isFixedPitch (true)

  // 'OS/2' table
  const os2Table = Buffer.alloc(86);
  os2Table.writeUInt16BE(3, 0); // version
  os2Table.writeInt16BE(advanceWidth, 2); // xAvgCharWidth
  os2Table.writeUInt16BE(400, 4); // usWeightClass
  os2Table.writeUInt16BE(5, 6); // usWidthClass
  os2Table.writeUInt16BE(0, 8); // fsType
  os2Table.writeInt16BE(advanceWidth, 10); // ySubscriptXSize
  os2Table.writeInt16BE(rowHeight * 7, 68); // sTypoAscender
  os2Table.writeInt16BE(-150, 70); // sTypoDescender
  os2Table.writeInt16BE(100, 72); // sTypoLineGap
  os2Table.writeUInt16BE(950, 74); // usWinAscent
  os2Table.writeUInt16BE(150, 76); // usWinDescent

  // Assemble Tables
  const rawTables = [
    { tag: 'OS/2', data: os2Table },
    { tag: 'cmap', data: cmapTable },
    { tag: 'glyf', data: glyfTable },
    { tag: 'head', data: headTable },
    { tag: 'hhea', data: hheaTable },
    { tag: 'hmtx', data: hmtxTable },
    { tag: 'loca', data: locaTable },
    { tag: 'maxp', data: maxpTable },
    { tag: 'name', data: nameTable },
    { tag: 'post', data: postTable }
  ];

  // Sort tables alphabetically by tag
  rawTables.sort((a, b) => a.tag.localeCompare(b.tag));

  const numTables = rawTables.length;
  const searchRange = Math.pow(2, Math.floor(Math.log2(numTables))) * 16;
  const entrySelector = Math.floor(Math.log2(numTables));
  const rangeShift = numTables * 16 - searchRange;

  const fontHeader = Buffer.alloc(12);
  fontHeader.writeUInt32BE(0x00010000, 0); // sfntVersion (TrueType)
  fontHeader.writeUInt16BE(numTables, 4);
  fontHeader.writeUInt16BE(searchRange, 6);
  fontHeader.writeUInt16BE(entrySelector, 8);
  fontHeader.writeUInt16BE(rangeShift, 10);

  const tableDir = Buffer.alloc(numTables * 16);
  let tableOffset = 12 + numTables * 16;

  const paddedTableData = [];
  rawTables.forEach((t, i) => {
    let data = t.data;
    if (data.length % 4 !== 0) {
      data = Buffer.concat([data, Buffer.alloc(4 - (data.length % 4))]);
    }
    paddedTableData.push(data);

    tableDir.write(t.tag, i * 16, 4, 'ascii');
    tableDir.writeUInt32BE(calcCheckSum(t.data), i * 16 + 4);
    tableDir.writeUInt32BE(tableOffset, i * 16 + 8);
    tableDir.writeUInt32BE(t.data.length, i * 16 + 12);

    tableOffset += data.length;
  });

  const fullTTF = Buffer.concat([fontHeader, tableDir, ...paddedTableData]);

  // Adjust 'head' table checksum
  const wholeCheckSum = calcCheckSum(fullTTF);
  const checkSumAdjustment = (0xB1B0AFBA - wholeCheckSum) >>> 0;

  // Find head table offset
  for (let i = 0; i < numTables; i++) {
    const tag = tableDir.toString('ascii', i * 16, i * 16 + 4);
    if (tag === 'head') {
      const headOffset = tableDir.readUInt32BE(i * 16 + 8);
      fullTTF.writeUInt32BE(checkSumAdjustment, headOffset + 8);
      break;
    }
  }

  return { ttf: fullTTF, rawTables };
}

// Convert TTF to WOFF format (W3C Recommendation)
function convertToWOFF(ttfBuffer, rawTables) {
  const woffMagic = 0x774F4646; // 'wOFF'
  const flavor = 0x00010000;
  const numTables = rawTables.length;
  const totalSfntSize = ttfBuffer.length;

  const woffHeader = Buffer.alloc(44);
  woffHeader.writeUInt32BE(woffMagic, 0);
  woffHeader.writeUInt32BE(flavor, 4);
  // totalLength filled later
  woffHeader.writeUInt16BE(numTables, 12);
  woffHeader.writeUInt16BE(0, 14); // reserved
  woffHeader.writeUInt32BE(totalSfntSize, 16);
  woffHeader.writeUInt16BE(1, 20); // majorVersion
  woffHeader.writeUInt16BE(0, 22); // minorVersion
  woffHeader.writeUInt32BE(0, 24); // metaOffset
  woffHeader.writeUInt32BE(0, 28); // metaLength
  woffHeader.writeUInt32BE(0, 32); // metaOrigLength
  woffHeader.writeUInt32BE(0, 36); // privOffset
  woffHeader.writeUInt32BE(0, 40); // privLength

  const tableDir = Buffer.alloc(numTables * 20);
  let currentOffset = 44 + numTables * 20;
  const tableDataList = [];

  rawTables.forEach((t, i) => {
    const origData = t.data;
    const compressed = zlib.deflateSync(origData);
    const useCompressed = compressed.length < origData.length;
    const chosenData = useCompressed ? compressed : origData;

    let padded = chosenData;
    if (chosenData.length % 4 !== 0) {
      padded = Buffer.concat([chosenData, Buffer.alloc(4 - (chosenData.length % 4))]);
    }

    tableDir.write(t.tag, i * 20, 4, 'ascii');
    tableDir.writeUInt32BE(currentOffset, i * 20 + 4);
    tableDir.writeUInt32BE(chosenData.length, i * 20 + 8);
    tableDir.writeUInt32BE(origData.length, i * 20 + 12);
    tableDir.writeUInt32BE(calcCheckSum(origData), i * 20 + 16);

    tableDataList.push(padded);
    currentOffset += padded.length;
  });

  const fullWoff = Buffer.concat([woffHeader, tableDir, ...tableDataList]);
  fullWoff.writeUInt32BE(fullWoff.length, 8); // totalLength
  return fullWoff;
}

// Build and write files
const { ttf, rawTables } = buildTTF();
const woff = convertToWOFF(ttf, rawTables);

const outDir = __dirname;
fs.writeFileSync(path.join(outDir, 'ndot57.ttf'), ttf);
fs.writeFileSync(path.join(outDir, 'ndot57.woff'), woff);

const base64Woff = woff.toString('base64');
const cssContent = `/**
 * Nothing OS NDot57 Font Definition
 * 100% Offline Embedded WebFont
 * Developed by S. M. Mahmud Iqbal
 */
@font-face {
  font-family: 'NDot57';
  src: url('ndot57.woff') format('woff'),
       url('data:font/woff;base64,${base64Woff}') format('woff'),
       url('ndot57.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
`;

fs.writeFileSync(path.join(outDir, 'ndot.css'), cssContent);
console.log('NDot57 Font Built Successfully!');
console.log(`TTF Size: ${ttf.length} bytes`);
console.log(`WOFF Size: ${woff.length} bytes`);
