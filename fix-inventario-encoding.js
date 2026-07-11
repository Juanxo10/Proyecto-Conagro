// Fix double-UTF-8 encoding in inventario.jsx
// The file was originally UTF-8, edited as Windows-1252, and re-saved as UTF-8,
// causing multi-byte UTF-8 sequences to become garbled multi-character sequences.

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Fronted/src/pages/inventario.jsx');

// Win-1252 special range (0x80–0x9F) maps to specific Unicode codepoints
const WIN1252_SPECIAL = {
  0x80: 0x20AC, // €
  0x82: 0x201A, // ‚
  0x83: 0x0192, // ƒ
  0x84: 0x201E, // „
  0x85: 0x2026, // …
  0x86: 0x2020, // †
  0x87: 0x2021, // ‡
  0x88: 0x02C6, // ˆ
  0x89: 0x2030, // ‰
  0x8A: 0x0160, // Š
  0x8B: 0x2039, // ‹
  0x8C: 0x0152, // Œ
  0x8E: 0x017D, // Ž
  0x91: 0x2018, // '
  0x92: 0x2019, // '
  0x93: 0x201C, // "
  0x94: 0x201D, // "
  0x95: 0x2022, // •
  0x96: 0x2013, // –
  0x97: 0x2014, // —
  0x98: 0x02DC, // ˜
  0x99: 0x2122, // ™
  0x9A: 0x0161, // š
  0x9B: 0x203A, // ›
  0x9C: 0x0153, // œ
  0x9E: 0x017E, // ž
  0x9F: 0x0178, // Ÿ
};

// Build reverse map: Unicode codepoint → Win-1252 byte
const CP_TO_WIN1252 = {};
for (const [byte, cp] of Object.entries(WIN1252_SPECIAL)) {
  CP_TO_WIN1252[cp] = parseInt(byte);
}
// Latin-1 range 0x00-0x7E and 0xA0-0xFF map to themselves
for (let b = 0; b <= 0x7E; b++) CP_TO_WIN1252[b] = b;
for (let b = 0xA0; b <= 0xFF; b++) CP_TO_WIN1252[b] = b;

function toWin1252Byte(cp) {
  return CP_TO_WIN1252[cp] !== undefined ? CP_TO_WIN1252[cp] : null;
}

function fixMojibake(str) {
  const chars = [...str]; // Properly split Unicode surrogate pairs
  const result = [];
  let i = 0;

  while (i < chars.length) {
    const cp = chars[i].codePointAt(0);
    const b1 = toWin1252Byte(cp);

    // Try 4-byte UTF-8 (emojis): F0-F7
    if (b1 !== null && b1 >= 0xF0 && b1 <= 0xF7 && i + 3 < chars.length) {
      const b2 = toWin1252Byte(chars[i+1].codePointAt(0));
      const b3 = toWin1252Byte(chars[i+2].codePointAt(0));
      const b4 = toWin1252Byte(chars[i+3].codePointAt(0));
      if (b2 !== null && b3 !== null && b4 !== null &&
          (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80 && (b4 & 0xC0) === 0x80) {
        const decoded = ((b1 & 0x07) << 18) | ((b2 & 0x3F) << 12) | ((b3 & 0x3F) << 6) | (b4 & 0x3F);
        if (decoded >= 0x10000 && decoded <= 0x10FFFF) {
          result.push(String.fromCodePoint(decoded));
          i += 4;
          continue;
        }
      }
    }

    // Try 3-byte UTF-8: E0-EF
    if (b1 !== null && b1 >= 0xE0 && b1 <= 0xEF && i + 2 < chars.length) {
      const b2 = toWin1252Byte(chars[i+1].codePointAt(0));
      const b3 = toWin1252Byte(chars[i+2].codePointAt(0));
      if (b2 !== null && b3 !== null &&
          (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
        const decoded = ((b1 & 0x0F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F);
        if (decoded >= 0x800 && decoded <= 0xFFFF) {
          result.push(String.fromCodePoint(decoded));
          i += 3;
          continue;
        }
      }
    }

    // Try 2-byte UTF-8: C2-DF
    if (b1 !== null && b1 >= 0xC2 && b1 <= 0xDF && i + 1 < chars.length) {
      const b2 = toWin1252Byte(chars[i+1].codePointAt(0));
      if (b2 !== null && (b2 & 0xC0) === 0x80) {
        const decoded = ((b1 & 0x1F) << 6) | (b2 & 0x3F);
        if (decoded >= 0x80 && decoded <= 0x7FF) {
          result.push(String.fromCodePoint(decoded));
          i += 2;
          continue;
        }
      }
    }

    // No match — keep character as-is
    result.push(chars[i]);
    i++;
  }

  return result.join('');
}

const original = fs.readFileSync(filePath, 'utf8');
const fixed = fixMojibake(original);

if (original === fixed) {
  console.log('No changes needed — file looks clean.');
} else {
  // Show a sample of what changed
  let changes = 0;
  for (let i = 0; i < Math.min(original.length, fixed.length); i++) {
    if (original[i] !== fixed[i]) changes++;
  }
  console.log(`Fixed ${changes} character positions.`);

  // Write fixed file
  fs.writeFileSync(filePath, fixed, 'utf8');
  console.log('File written successfully.');

  // Show a preview of key fixed strings
  const previews = ['ALMAC', 'Actualizar', 'digo', 'ltimo', 'entar'];
  for (const p of previews) {
    const idx = fixed.indexOf(p);
    if (idx >= 0) console.log(`  ...${fixed.slice(Math.max(0,idx-5), idx+20)}...`);
  }
}
