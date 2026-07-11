# Fix encoding corruption in trilla.jsx
$file = "C:\Users\juanp\OneDrive\Documentos\Proyecto Conagro\Fronted\src\pages\trilla.jsx"
$c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# --- Corrupted Spanish characters ---
$c = $c.Replace("Ã³", "ó")   # o with accent
$c = $c.Replace("Ã©", "é")   # e with accent
$c = $c.Replace("Ã¡", "á")   # a with accent
$c = $c.Replace("Ã±", "ñ")   # n with tilde
$c = $c.Replace("Ãº", "ú")   # u with accent
$c = $c.Replace("Â·", "·")   # middle dot
$c = $c.Replace("NÂ°", "N°") # degree sign (Nro)

# Í (uppercase I with accent) - e.g. FÍSICOS, AGRÍCOLA
# UTF-8 C3 8D  →  as Latin-1 that's Ã + control char (invisible)
# VS Code may show it as just "Ã" with the next char swallowed
$c = $c.Replace("FÃSICOS", "FÍSICOS")
$c = $c.Replace("AGRÃCOLA", "AGRÍCOLA")

# --- Corrupted punctuation ---
# em dash U+2014: UTF-8 E2 80 94 → Windows-1252 â€"
$c = $c.Replace("â€"", "—")
# right arrow U+2192: UTF-8 E2 86 92 → Windows-1252 â†'
$c = $c.Replace("â†'", "→")
# minus sign U+2212: UTF-8 E2 88 92 → Windows-1252 âˆ'
$c = $c.Replace("âˆ'", "−")

# --- Corrupted emoji / symbols ---
# ✓ U+2713: âœ"
$c = $c.Replace("âœ"", "✓")
# ✕ U+2715: âœ•
$c = $c.Replace("âœ•", "✕")
# ✦ U+2726: âœ¦
$c = $c.Replace("âœ¦", "✦")

# Remove/replace broken emoji in tab buttons and print button
$c = $c.Replace("âš™ Registro de Trilla", "Registro de Trilla")
$c = $c.Replace("ðŸ"‹ Certificados de Calidad", "Certificados de Calidad")
$c = $c.Replace("ðŸ–¨ Generar / Imprimir Certificado", "Imprimir Certificado")

# Write back as UTF-8 without BOM
[System.IO.File]::WriteAllText($file, $c, [System.Text.UTF8Encoding]::new($false))
"Done. Lines: $((Get-Content $file -Encoding UTF8).Count)"
