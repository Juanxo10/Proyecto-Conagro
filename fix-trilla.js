const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "Fronted", "src", "pages", "trilla.jsx");
let c = fs.readFileSync(file, "utf8");

// Spanish vowels / ñ / degree
const rp = [
  [/Ã³/g, "ó"],
  [/Ã©/g, "é"],
  [/Ã¡/g, "á"],
  [/Ã±/g, "ñ"],
  [/Ãº/g, "ú"],
  [/Â·/g, "·"],
  [/NÂ°/g, "N°"],
  // Capital Í for FÍSICOS / AGRÍCOLA — byte pattern Ã + invisible control
  // Replace full words to be safe
  [/FÃSICOS/g, "FÍSICOS"],
  [/AGRÃCOLA/g, "AGRÍCOLA"],
  // em dash  â€" = â + € + " (plain quote)
  // the last char is ASCII 0x22 which appears as " in the file
  [/â€"/g, "—"],
  // right arrow  â†' 
  [/â†'/g, "→"],
  // minus sign  âˆ'
  [/âˆ'/g, "−"],
  // checkmarks / X
  [/âœ"/g, "✓"],
  [/âœ•/g, "✕"],
  [/âœ¦/g, "✦"],
  // broken emoji — just strip them and keep plain text
  [/âš™\s*/g, ""],
  [/ðŸ"‹\s*/g, ""],
  [/ðŸ–¨\s*/g, ""],
];

for (const [from, to] of rp) {
  c = c.replace(from, to);
}

fs.writeFileSync(file, c, "utf8");

const lines = c.split("\n").length;
console.log(`Done. Lines: ${lines}`);
// spot-check
const checks = ["generación", "—", "FÍSICOS", "AGRÍCOLA", "Registro de Trilla"];
for (const w of checks) {
  console.log(`  ${w}: ${c.includes(w) ? "OK" : "NOT FOUND"}`);
}
