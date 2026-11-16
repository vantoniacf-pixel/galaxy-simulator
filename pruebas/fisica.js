// Pruebas de la física del simulador. Uso: node pruebas/fisica.js
// Saca el núcleo físico (primer <script> con "const PHYS") de index.html y revisa:
//  1. que la energía de la órbita se conserve,
//  2. que (v. radial)^2 + (v. tangencial)^2 = 1 sea exactamente la órbita de escape (E = 0),
//  3. que el eje de giro del disco quede donde dicen los ángulos xy y xz,
//  4. que los ejemplos (Antena, anillo, enana) sigan teniendo los pericentros esperados.
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const nucleo = (html.match(/<script>[\s\S]*?<\/script>/g) || []).map(t => t.slice(8, -9)).find(t => t.includes("const PHYS"));
if (!nucleo) { console.error("No encontré el núcleo físico en index.html"); process.exit(1); }
const mod = { exports: {} };
new Function("module", nucleo)(mod);
const { PHYS, makeICs, stepOnce, orbitEnergy } = mod.exports;
const DT = (PHYS.tmx / PHYS.tsim) / PHYS.nstp, E2 = PHYS.a ** 2;
const SEED = 20260928;

let fallas = 0;
function revisa(ok, texto) { console.log((ok ? "  ok   " : "  FALLA ") + texto); if (!ok) fallas++; }

function corre(p) {
  const ic = makeICs(Object.assign({ seed: SEED, xy1: 0, xz1: 0, xy2: 0, xz2: 0, npart: 1000 }, p)), h = ic.h, s = ic.s;
  const e0 = orbitEnergy(h, E2); let err = 0; const sep = [];
  for (let st = 1; st <= PHYS.nstp; st++) {
    stepOnce(h, s, DT, E2);
    err = Math.max(err, Math.abs(orbitEnergy(h, E2).E - e0.E) / Math.abs(e0.W));
    if (st % PHYS.nout === 0) sep.push(Math.hypot(h.x[1] - h.x[0], h.y[1] - h.y[0], h.z[1] - h.z[0]) / 1000);
  }
  const peri = [];
  for (let i = 1; i < sep.length - 1; i++) if (sep[i] < sep[i - 1] && sep[i] <= sep[i + 1]) peri.push((i + 1) * PHYS.nout);
  return { e0: e0.E / Math.abs(e0.W), err, peri, sepFinal: sep[sep.length - 1] };
}

console.log("1. Conservación de la energía (error máximo relativo a |W0|)");
for (const [nombre, p] of [
  ["caso por defecto", { fr: 0.1, ft: 0.3, q: 0.5, xy2: 30, xz2: 45, sepKpc: 40 }],
  ["choque frontal a 10 kpc", { fr: 0, ft: 0, q: 1, sepKpc: 10 }],
  ["escape radial", { fr: 1, ft: 0, q: 0.5, sepKpc: 40 }]
]) { const r = corre(p); revisa(r.err < 1e-3, nombre + ": " + (100 * r.err).toExponential(1) + " %"); }

console.log("2. Velocidad de escape: E0/|W0| debe ser fr^2 + ft^2 - 1");
for (const [fr, ft, d] of [[0.1, 0.3, 40], [0.6, 0.8, 20], [1, 0, 80], [0, 0, 10]]) {
  const ic = makeICs({ seed: SEED, fr, ft, q: 1, xy1: 0, xz1: 0, xy2: 0, xz2: 0, sepKpc: d, npart: 1000 });
  const e = orbitEnergy(ic.h, E2), got = e.E / Math.abs(e.W), exp = fr * fr + ft * ft - 1;
  revisa(Math.abs(got - exp) < 2e-3, "fr " + fr + ", ft " + ft + ", d " + d + " kpc: " + got.toFixed(4) + " (esperado " + exp.toFixed(4) + ")");
}

console.log("3. Eje de giro del disco = (sin xz cos xy, sin xz sin xy, cos xz)");
for (const [xy, xz] of [[0, 45], [90, 45], [200, 45], [30, 0], [120, 90], [300, 150]]) {
  const n = 2000, ic = makeICs({ seed: 1, fr: 0, ft: 0, q: 1, xy1: 0, xz1: 0, xy2: xy, xz2: xz, sepKpc: 40, npart: n }), s = ic.s, h = ic.h;
  const L = [0, 0, 0];
  for (let k = n; k < 2 * n; k++) {
    const x = s.x[k] - h.x[1], y = s.y[k] - h.y[1], z = s.z[k], vx = s.vx[k] - h.vx[1], vy = s.vy[k] - h.vy[1], vz = s.vz[k] - h.vz[1];
    L[0] += y * vz - z * vy; L[1] += z * vx - x * vz; L[2] += x * vy - y * vx;
  }
  const nn = Math.hypot(...L), r = Math.PI / 180;
  const exp = [Math.sin(xz * r) * Math.cos(xy * r), Math.sin(xz * r) * Math.sin(xy * r), Math.cos(xz * r)];
  const d = Math.hypot(L[0] / nn - exp[0], L[1] / nn - exp[1], L[2] / nn - exp[2]);
  revisa(d < 1e-6, "xy " + xy + "°, xz " + xz + "°: diferencia " + d.toExponential(1));
}

console.log("4. Ejemplos: pericentros [Myr] (tolerancia 20 Myr)");
for (const [nombre, p, esperado] of [
  ["Galaxias Antena", { fr: 0.1, ft: 0.41, q: 1, sepKpc: 40 }, [390, 1320, 2240]],
  ["Galaxia anillo", { fr: 0.1, ft: 0, q: 1, xz1: 90, xz2: 90, sepKpc: 40 }, [320, 1050, 1780, 2510]],
  ["Enana y corriente", { fr: 0, ft: 0.58, q: 0.1, sepKpc: 30 }, [600, 1790, 2980]]
]) {
  const r = corre(p);
  revisa(r.peri.length === esperado.length && r.peri.every((t, i) => Math.abs(t - esperado[i]) <= 20), nombre + ": " + r.peri.join(", "));
}

console.log(fallas ? "\n" + fallas + " prueba(s) fallaron" : "\nTodo bien");
process.exit(fallas ? 1 : 0);
