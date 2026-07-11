const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "Fronted", "src", "pages", "trilla.jsx");
let c = fs.readFileSync(file, "utf8");

// Remove 4-byte emoji remnants (corrupted clipboard emoji 📋)
// UTF-8: F0 9F 93 8B → Win1252: U+00F0 U+0178 U+201C U+2039
c = c.replace(/\u00f0\u0178\u201c\u2039\s*/g, "");

// Also try with plain ASCII quote variant
c = c.replace(/\u00f0\u0178"\u2039\s*/g, "");

// Remove any other leftover emoji bytes (ð Ÿ pattern)
c = c.replace(/\u00f0\u0178[^\w\s]/g, "");

fs.writeFileSync(file, c, "utf8");

const i = c.indexOf("Certificados de Calidad");
const ctx = JSON.stringify(c.slice(Math.max(0, i - 15), i + 24));
console.log("Cert tab context:", ctx);
console.log("Emoji chars remain:", c.includes("\u00f0") || c.includes("\u0178"));
console.log("Done. Lines:", c.split("\n").length);
