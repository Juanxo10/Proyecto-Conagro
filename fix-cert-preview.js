const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "Fronted", "src", "pages", "trilla.jsx");
let c = fs.readFileSync(file, "utf8");

// ── 1. Fix DANADO, EXTRANAS, FISICOS in handleImprimir HTML ─────────────────
c = c.replace(/GRANO DANADO POR HONGO/g, "GRANO DA\u00d1ADO POR HONGO");
c = c.replace(/GRANO DANADO POR CALOR/g, "GRANO DA\u00d1ADO POR CALOR");
c = c.replace(/MATERIAS EXTRANAS/g, "MATERIAS EXTRA\u00d1AS");
c = c.replace(/<tr><td class="ssh" colspan="3">FISICOS<\/td><\/tr>/,
  '<tr><td class="ssh" colspan="3">F\u00cdSICOS</td></tr>');
console.log("\u2713 Step 1: handleImprimir text fixed");

// ── 2. Replace cert-preview JSX section ──────────────────────────────────────
// Use simpler unique anchors that won't have line-ending issues
const START_ANCHOR = '<div className="cert-logo">CONAGRO</div>';
const END_ANCHOR   = '<div className="cert-sign-line" /><span>Recibido Conforme</span>';

// Find the opening <div className="cert-preview"> before START_ANCHOR
const anchorPos = c.indexOf(START_ANCHOR);
if (anchorPos === -1) { console.error("ERROR: START_ANCHOR not found"); process.exit(1); }

// Walk back to find the opening of <div className="cert-preview">
const previewOpenTag = '<div className="cert-preview">';
const previewStart = c.lastIndexOf(previewOpenTag, anchorPos);
if (previewStart === -1) { console.error("ERROR: cert-preview open tag not found"); process.exit(1); }

// Find the end: after END_ANCHOR, find the closing </div></div> (sign row div + cert-preview div)
const endAnchorPos = c.indexOf(END_ANCHOR, anchorPos);
if (endAnchorPos === -1) { console.error("ERROR: END_ANCHOR not found"); process.exit(1); }
// After END_ANCHOR content, find two closing </div> tags
let scanPos = endAnchorPos + END_ANCHOR.length;
let divClosings = 0;
while (divClosings < 3 && scanPos < c.length) {
  const next = c.indexOf("</div>", scanPos);
  if (next === -1) break;
  divClosings++;
  scanPos = next + 6;
}
const previewEnd = scanPos;

const NEW_CPV = `<div className="cert-preview">

                    {/* Encabezado */}
                    <table className="cpv-table">
                      <tbody>
                        <tr>
                          <td className="cpv-logo-cell">
                            <div className="cpv-logo-mark">conagro</div>
                            <div className="cpv-logo-sub">COMERCIALIZADORA<br/>AGR\u00cdCOLA NACI</div>
                          </td>
                          <td className="cpv-title-cell">
                            <div className="cpv-cert-num">CERTIFICADO DE CALIDAD No. ---</div>
                            <div className="cpv-cert-prod">PRODUCTO: &nbsp;{(certData.pesaje?.descripcion || certData.previo.producto || "ARROZ BLANCO").toUpperCase()}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* DATOS GENERALES */}
                    <table className="cpv-table">
                      <tbody>
                        <tr><td className="cpv-sh" colSpan={4}>DATOS GENERALES</td></tr>
                        <tr>
                          <td className="cpv-lb">CLIENTE:</td>
                          <td className="cpv-vl">{certData.previo.propietario || ""}</td>
                          <td className="cpv-lb">FECHA DESPACHO:</td>
                          <td className="cpv-vl">{certData.trilla?.fecha_trilla || ""}</td>
                        </tr>
                        <tr>
                          <td className="cpv-lb">FECHA DE VENCIMIENTO:</td>
                          <td className="cpv-vl">{certData.trilla?.fecha_vencimiento || ""}</td>
                          <td className="cpv-lb">No. LOTE:</td>
                          <td className="cpv-vl">{certData.previo.lote_id}</td>
                        </tr>
                        <tr>
                          <td className="cpv-lb">PRESENTACI\u00d3N:</td>
                          <td className="cpv-vl">{certData.trilla?.presentacion || ""}</td>
                          <td className="cpv-lb">CANTIDAD:</td>
                          <td className="cpv-vl">{certData.trilla?.cantidad_salida || ""}</td>
                        </tr>
                        <tr>
                          <td className="cpv-lb">CONDUCTOR:</td>
                          <td className="cpv-vl">{certData.previo.nombre_conductor || certData.pesaje?.nombre || ""}</td>
                          <td className="cpv-lb">PLACAS VEHICULO:</td>
                          <td className="cpv-vl">{certData.previo.placa || ""}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* ASPECTOS A EVALUAR */}
                    <table className="cpv-table">
                      <tbody>
                        <tr><td className="cpv-sh" colSpan={3}>ASPECTOS A EVALUAR</td></tr>
                        <tr><td className="cpv-ssh" colSpan={3}>F\u00cdSICOS</td></tr>
                        <tr>
                          <td className="cpv-ch" style={{ width: "52%" }}>CARACTERISTICA</td>
                          <td className="cpv-ch" style={{ width: "26%" }}>ESPECIFICACI\u00d3N</td>
                          <td className="cpv-ch" style={{ width: "22%" }}>RESULTADO</td>
                        </tr>
                        <tr><td>HUMEDAD</td><td className="cpv-tc">12,0 - 14,0</td><td className="cpv-tc">{certData.trilla?.humedad_salida ? \`\${certData.trilla.humedad_salida}%\` : ""}</td></tr>
                        <tr><td>GRANO PARTIDO</td><td className="cpv-tc">9% MAX</td><td className="cpv-tc">{certData.trilla?.grano_partido_salida ? \`\${certData.trilla.grano_partido_salida}%\` : ""}</td></tr>
                        <tr><td>GRANO YESADO</td><td className="cpv-tc">11% MAX</td><td className="cpv-tc">{certData.trilla?.grano_yesado_salida ? \`\${certData.trilla.grano_yesado_salida}%\` : ""}</td></tr>
                        <tr><td>GRANO DA\u00d1ADO POR HONGO</td><td className="cpv-tc">2,5% MAX</td><td className="cpv-tc">{certData.trilla?.grano_dano_hongo_salida ? \`\${certData.trilla.grano_dano_hongo_salida}%\` : ""}</td></tr>
                        <tr><td>GRANO DA\u00d1ADO POR CALOR</td><td className="cpv-tc">1,5% MAX</td><td className="cpv-tc">{certData.trilla?.grano_dano_calor_salida ? \`\${certData.trilla.grano_dano_calor_salida}%\` : ""}</td></tr>
                        <tr><td>SEMILLAS OBJETABLES Y ARROZ CON CASCARA</td><td className="cpv-tc">4 EN 100 GR. MAX</td><td className="cpv-tc">{certData.trilla?.semillas_obj_salida || ""}</td></tr>
                        <tr><td className="cpv-ssh" colSpan={3}>ORGANOL\u00c9PTICOS</td></tr>
                        <tr>
                          <td className="cpv-ch">CARACTERISTICA</td>
                          <td className="cpv-ch">ESPECIFICACI\u00d3N</td>
                          <td className="cpv-ch">RESULTADO</td>
                        </tr>
                        <tr><td>OLOR</td><td className="cpv-tc">CARACTERISTICO</td><td className="cpv-tc">CUMPLE</td></tr>
                        <tr><td>SABOR</td><td className="cpv-tc">CARACTERISTICO</td><td className="cpv-tc">CUMPLE</td></tr>
                        <tr><td>COLOR</td><td className="cpv-tc">CARACTERISTICO</td><td className="cpv-tc">CUMPLE</td></tr>
                        <tr><td className="cpv-ssh" colSpan={3}>INOCUIDAD</td></tr>
                        <tr>
                          <td className="cpv-ch">CARACTERISTICA</td>
                          <td className="cpv-ch">ESPECIFICACI\u00d3N</td>
                          <td className="cpv-ch">RESULTADO</td>
                        </tr>
                        <tr><td>NIVEL DE INFESTACION EN 100 GRAMOS</td><td className="cpv-tc">AUSENCIA</td><td className="cpv-tc">CUMPLE</td></tr>
                        <tr><td>MATERIAS EXTRA\u00d1AS EN 100 GRAMOS</td><td className="cpv-tc">AUSENCIA</td><td className="cpv-tc">CUMPLE</td></tr>
                        <tr><td>IMPUREZAS</td><td className="cpv-tc">0,1% MAX</td><td className="cpv-tc">{certData.trilla?.impureza_salida ? \`\${certData.trilla.impureza_salida}%\` : ""}</td></tr>
                      </tbody>
                    </table>

                    {/* OBSERVACIONES */}
                    <table className="cpv-table">
                      <tbody>
                        <tr><td style={{ fontWeight: "bold", padding: "4px 7px" }}>OBSERVACIONES:</td></tr>
                        <tr><td style={{ height: 52, verticalAlign: "top", padding: "5px 7px", fontSize: 12 }}>{certData.trilla?.observaciones || ""}</td></tr>
                      </tbody>
                    </table>

                    {/* Firmas */}
                    <div style={{ marginTop: 28 }}>
                      <p style={{ fontSize: 13, marginBottom: 48 }}>Elaboro: _______________________________</p>
                      <div style={{ display: "flex", justifyContent: "space-around" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ borderTop: "1px solid #333", width: 168, margin: "0 auto 6px" }} />
                          <p style={{ fontWeight: "bold", fontSize: 13 }}>Esteban Olaya</p>
                          <p style={{ fontSize: 12, color: "#555" }}>Aux.Laboratorio</p>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ borderTop: "1px solid #333", width: 168, margin: "0 auto 6px" }} />
                          <p style={{ fontWeight: "bold", fontSize: 13 }}>Edwin Acosta</p>
                          <p style={{ fontSize: 12, color: "#555" }}>Jefe de Planta</p>
                        </div>
                      </div>
                    </div>
                  </div>`;

c = c.slice(0, previewStart) + NEW_CPV + c.slice(previewEnd);
console.log("\u2713 Step 2: cert-preview JSX replaced");

// ── 3. Replace cert-preview CSS ───────────────────────────────────────────────
// Find old CSS section by unique content
const oldCssStart = c.indexOf(".cert-preview { background: white; border: 2px solid #2e7d32;");
if (oldCssStart === -1) {
  console.warn("WARN: old cert-preview CSS not found (may already be replaced)");
} else {
  // Find the end: after .cert-sign span { ... }
  const oldCssEnd = c.indexOf(".cert-sign span { font-size: 11px; color: #555; }", oldCssStart);
  if (oldCssEnd === -1) {
    console.error("ERROR: old CSS end not found");
  } else {
    const newCss =
`.cert-preview { background: white; border: 1px solid #ccc; border-radius: 4px; padding: 24px; }
        .cpv-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; }
        .cpv-table td { border: 1px solid #555; padding: 4px 7px; vertical-align: middle; }
        .cpv-logo-cell { width: 130px; text-align: center; padding: 10px; }
        .cpv-logo-mark { font-size: 20px; font-weight: 900; color: #2e5c1a; font-style: italic; letter-spacing: -1px; }
        .cpv-logo-sub  { font-size: 9px; color: #2e5c1a; margin-top: 3px; line-height: 1.4; }
        .cpv-title-cell { text-align: center; padding: 10px 14px; }
        .cpv-cert-num  { font-size: 13px; font-weight: bold; }
        .cpv-cert-prod { font-size: 11px; font-weight: 600; margin-top: 8px; }
        .cpv-sh  { background: #404040; color: #fff; text-align: center; font-weight: bold; font-size: 10px; letter-spacing: 2.5px; padding: 5px 7px; }
        .cpv-ssh { background: #808080; color: #fff; text-align: center; font-weight: bold; font-size: 10px; letter-spacing: 2px; padding: 4px 7px; }
        .cpv-ch  { background: #d0d0d0; font-weight: bold; text-align: center; font-size: 10px; padding: 4px 7px; }
        .cpv-lb  { background: #ebebeb; font-weight: bold; font-size: 10px; white-space: nowrap; width: 150px; }
        .cpv-vl  { font-size: 11px; }
        .cpv-tc  { text-align: center; font-size: 11px; }`;
    const endOfOldCss = oldCssEnd + ".cert-sign span { font-size: 11px; color: #555; }".length;
    c = c.slice(0, oldCssStart) + newCss + c.slice(endOfOldCss);
    console.log("\u2713 Step 3: cert-preview CSS replaced");
  }
}

fs.writeFileSync(file, c, "utf8");
console.log("Done. Lines:", c.split("\n").length);

const checks = [
  ["GRANO DA\u00d1ADO POR HONGO", "DAÑADO in handleImprimir"],
  ["MATERIAS EXTRA\u00d1AS", "EXTRAÑAS in handleImprimir"],
  ["cpv-sh", "cpv CSS class"],
  ["PRESENTACI\u00d3N:", "cert-preview PRESENTACIÓN"],
  ["cpv-logo-mark", "logo CSS"],
];
for (const [s, label] of checks) {
  console.log(`  ${label}: ${c.includes(s) ? "OK" : "MISSING"}`);
}
