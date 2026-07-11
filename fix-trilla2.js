const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "Fronted", "src", "pages", "trilla.jsx");
let c = fs.readFileSync(file, "utf8");

// The corruption pattern: UTF-8 bytes re-interpreted as Windows-1252 chars
// Each corrupted sequence is identified by exact codepoints.

const rp = [
  // em dash U+2014: UTF-8 E2 80 94  →  Win1252: â(E2) €(80=20AC) "(94=201D)
  [new RegExp("\u00e2\u20ac\u201d", "g"), "\u2014"],  // — em dash
  // en dash / placeholder "â€"" same sequence
  // right arrow U+2192: UTF-8 E2 86 92  →  Win1252: â(E2) †(86=2020) '(92=2019)
  [new RegExp("\u00e2\u2020\u2019", "g"), "\u2192"],  // →
  // minus sign U+2212: UTF-8 E2 88 92  →  Win1252: â(E2) ˆ(88=02C6) '(92=2019)
  [new RegExp("\u00e2\u02c6\u2019", "g"), "\u2212"],  // −
  // ✓ U+2713: UTF-8 E2 9C 93  →  Win1252: â(E2) œ(9C=0153) "(93=201C)
  [new RegExp("\u00e2\u0153\u201c", "g"), "\u2713"],  // ✓
  // ✕ U+2715: UTF-8 E2 9C 95  →  Win1252: â(E2) œ(9C=0153) •(95=2022)
  [new RegExp("\u00e2\u0153\u2022", "g"), "\u2715"],  // ✕
  // ✦ U+2726: UTF-8 E2 9C A6  →  Win1252: â(E2) œ(9C=0153) ¦(A6=00A6)
  [new RegExp("\u00e2\u0153\u00a6", "g"), "\u2726"],  // ✦
  // ─ U+2500 (box drawing, used in comments): UTF-8 E2 94 80 → â"€
  // We don't need to fix comments, but fix display strings that have this
  // (The JSX comments have these but they're invisible to the user)

  // AGRÍCOLA: Í = UTF-8 C3 8D → Win1252 Ã(C3) + 0x8D undefined → 
  // In the file it shows as Ã + invisible. Replace the whole word.
  [/FÃSICOS/g, "FÍSICOS"],
  [/AGRÃCOLA/g, "AGRÍCOLA"],

  // Remove broken emoji tab labels (already stripped to plain by prior run)
  // These may still be present if prior run didn't catch them
  [/[\u{1F4CB}\u{1F5A8}]\s*/gu, ""],
  [/\u2699\uFE0F?\s*/g, ""],
  [/\u2726\s*CONAGRO\s*\u2726/g, "CONAGRO"],
];

for (const [from, to] of rp) {
  const before = c.length;
  c = c.replace(from, to);
  if (c.length !== before) {
    console.log(`  Replaced: ${from}`);
  }
}

fs.writeFileSync(file, c, "utf8");

const checks = [
  ["—",           c.includes("\u2014")],
  ["→",           c.includes("\u2192")],
  ["−",           c.includes("\u2212")],
  ["✓",           c.includes("\u2713")],
  ["generación",  c.includes("generaci\u00f3n")],
  ["FÍSICOS",     c.includes("F\u00cdSICOS")],
];
console.log("\nSpot checks:");
for (const [label, found] of checks) {
  console.log(`  ${label}: ${found ? "OK" : "NOT FOUND"}`);
}
console.log(`\nDone. Lines: ${c.split("\n").length}`);
