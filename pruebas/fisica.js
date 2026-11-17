// Pruebas de la física del simulador. Uso: node pruebas/fisica.js
// Saca el núcleo físico (primer <script> con "const PHYS") de index.html y revisa:
//  1. que la energía de la órbita se conserve,
//  2. que (v. radial)^2 + (v. tangencial)^2 = 1 sea exactamente la órbita de escape (E = 0),
//  3. que el eje de giro del disco quede donde dicen los ángulos xy y xz,
//  4. que los halos no deriven (su centro de masa queda quieto),
//  5. que el borde del disco rote a la velocidad esperada según la masa,
//  6. que los ejemplos (Antena, anillo, enana) sigan teniendo los pericentros esperados,
//  7. que el momento angular de la órbita se conserve,
//  8. que un disco aislado no se deforme y tenga perfil exponencial,
//  9. que el integrador sea reversible en el tiempo.
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const nucleo = (html.match(/<script>[\s\S]*?<\/script>/g) || []).map(t => t.slice(8, -9)).find(t => t.includes("const PHYS"));
if (!nucleo) { console.error("No encontré el núcleo físico en index.html"); process.exit(1); }
const mod = { exports: {} };
new Function("module", nucleo)(mod);
const { PHYS, makeICs, stepOnce, orbitEnergy, aHalo, mPlummer } = mod.exports;
const DT = (PHYS.tmx / PHYS.tsim) / PHYS.nstp, KMS = PHYS.vsim / 1000;
const SEED = 20260928;

let fallas = 0;
function revisa(ok, texto) { console.log((ok ? "  ok   " : "  FALLA ") + texto); if (!ok) fallas++; }

function corre(p) {
  const ic = makeICs(Object.assign({ seed: SEED, xy1: 0, xz1: 0, xy2: 0, xz2: 0, npart: 1000 }, p)), h = ic.h, s = ic.s;
  const e0 = orbitEnergy(h); let err = 0; const sep = [];
  for (let st = 1; st <= PHYS.nstp; st++) {
    stepOnce(h, s, DT);
    err = Math.max(err, Math.abs(orbitEnergy(h).E - e0.E) / Math.abs(e0.W));
    if (st % PHYS.nout === 0) sep.push(Math.hypot(h.x[1] - h.x[0], h.y[1] - h.y[0], h.z[1] - h.z[0]) / 1000);
  }
  const peri = [];
  for (let i = 1; i < sep.length - 1; i++) if (sep[i] < sep[i - 1] && sep[i] <= sep[i + 1]) peri.push((i + 1) * PHYS.nout);
  const mt = h.m[0] + h.m[1];
  const cm = Math.hypot((h.m[0] * h.x[0] + h.m[1] * h.x[1]) / mt, (h.m[0] * h.y[0] + h.m[1] * h.y[1]) / mt, (h.m[0] * h.z[0] + h.m[1] * h.z[1]) / mt);
  return { e0: e0.E / Math.abs(e0.W), err, peri, sepFinal: sep[sep.length - 1], cm };
}

console.log("1. Conservación de la energía (error máximo relativo a |W0|)");
for (const [nombre, p] of [
  ["caso por defecto", { fr: 0.1, ft: 0.3, q: 0.5, xy2: 30, xz2: 45, sepKpc: 40 }],
  ["choque frontal a 10 kpc", { fr: 0, ft: 0, q: 1, sepKpc: 10 }],
  ["escape radial", { fr: 1, ft: 0, q: 0.5, sepKpc: 40 }]
]) { const r = corre(p); revisa(r.err < 1e-3, nombre + ": " + (100 * r.err).toExponential(1) + " %"); }

console.log("2. Velocidad de escape: E0/|W0| debe ser fr^2 + ft^2 - 1");
for (const [fr, ft, d, q] of [[0.1, 0.3, 40, 1], [0.6, 0.8, 20, 0.5], [1, 0, 80, 0.1], [0, 0, 10, 1]]) {
  const ic = makeICs({ seed: SEED, fr, ft, q, xy1: 0, xz1: 0, xy2: 0, xz2: 0, sepKpc: d, npart: 1000 });
  const e = orbitEnergy(ic.h), got = e.E / Math.abs(e.W), exp = fr * fr + ft * ft - 1;
  revisa(Math.abs(got - exp) < 2e-3, "fr " + fr + ", ft " + ft + ", d " + d + " kpc, q " + q + ": " + got.toFixed(4) + " (esperado " + exp.toFixed(4) + ")");
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

console.log("4. Centro de masa de los halos tras 3 Gyr (debe quedar quieto)");
for (const [nombre, p] of [["q = 0.5", { fr: 0.1, ft: 0.3, q: 0.5, xy2: 30, xz2: 45, sepKpc: 40 }], ["q = 0.1", { fr: 0, ft: 0.55, q: 0.1, sepKpc: 30 }]]) {
  const r = corre(p); revisa(r.cm < 1e-3, nombre + ": se movió " + r.cm.toExponential(1) + " pc");
}

console.log("5. Velocidad circular en el borde del disco [km/s] (a crece como la raíz de la masa)");
for (const [q, esperado] of [[1, 86], [0.5, 72], [0.1, 48]]) {
  const M = q * PHYS.Mref, R = 10000 * Math.sqrt(q), v = Math.sqrt(PHYS.G * mPlummer(R, M, aHalo(M)) / R) * KMS;
  revisa(Math.abs(v - esperado) < 1, "q = " + q + ": " + v.toFixed(1) + " (esperado " + esperado + ")");
}

console.log("6. Ejemplos: pericentros [Myr] (tolerancia 20 Myr)");
for (const [nombre, p, esperado] of [
  ["Galaxias Antena", { fr: 0.1, ft: 0.41, q: 1, sepKpc: 40 }, [390, 1320, 2240]],
  ["Galaxia anillo", { fr: 0.1, ft: 0, q: 1, xz1: 90, xz2: 90, sepKpc: 40 }, [320, 1050, 1780, 2510]],
  ["Enana y corriente", { fr: 0, ft: 0.55, q: 0.1, sepKpc: 30 }, [510, 1520, 2530]]
]) {
  const r = corre(p);
  revisa(r.peri.length === esperado.length && r.peri.every((t, i) => Math.abs(t - esperado[i]) <= 20), nombre + ": " + r.peri.join(", "));
}

console.log("7. Momento angular de la órbita de los halos (debe conservarse)");
{
  const ic = makeICs({ seed: SEED, fr: 0.1, ft: 0.3, q: 0.5, xy1: 0, xz1: 0, xy2: 30, xz2: 45, sepKpc: 40, npart: 500 }), h = ic.h, s = ic.s;
  const Lz = () => h.m[0] * (h.x[0] * h.vy[0] - h.y[0] * h.vx[0]) + h.m[1] * (h.x[1] * h.vy[1] - h.y[1] * h.vx[1]);
  const L0 = Lz(); let d = 0;
  for (let st = 1; st <= PHYS.nstp; st++) { stepOnce(h, s, DT); d = Math.max(d, Math.abs(Lz() - L0) / Math.abs(L0)); }
  revisa(d < 1e-10, "cambio relativo máximo: " + d.toExponential(1));
}

console.log("8. Disco aislado: sin la otra galaxia, ninguna estrella debe cambiar de radio en 3 Gyr");
{
  const n = 1000, ic = makeICs({ seed: SEED, fr: 0, ft: 0, q: 0.5, xy1: 0, xz1: 0, xy2: 0, xz2: 0, sepKpc: 40, npart: n }), h = ic.h, s = ic.s;
  h.m[1] = 0;
  const rad = k => Math.hypot(s.x[k] - h.x[0], s.y[k] - h.y[0], s.z[k] - h.z[0]);
  const r0 = []; for (let k = 0; k < n; k++) r0.push(rad(k));
  let d = 0;
  for (let st = 1; st <= PHYS.nstp; st++) { stepOnce(h, s, DT); if (st % 500 === 0) for (let k = 0; k < n; k++) d = Math.max(d, Math.abs(rad(k) - r0[k])); }
  revisa(d < 1, "cambio máximo de radio: " + d.toFixed(3) + " pc");
  const orden = r0.slice().sort((a, b) => a - b), mediana = orden[n >> 1] / 1000;
  revisa(Math.abs(mediana - 4.6) < 0.4, "perfil exponencial: radio mediano " + mediana.toFixed(2) + " kpc (esperado 4.6)");
}

console.log("9. Reversibilidad: 3 Gyr hacia adelante, invertir velocidades y 3 Gyr hacia atrás");
{
  const ic = makeICs({ seed: SEED, fr: 0.1, ft: 0.3, q: 0.5, xy1: 0, xz1: 0, xy2: 30, xz2: 45, sepKpc: 40, npart: 500 }), h = ic.h, s = ic.s;
  const x0 = s.x.slice(), y0 = s.y.slice(), z0 = s.z.slice();
  for (let st = 0; st < PHYS.nstp; st++) stepOnce(h, s, DT);
  for (const o of [h, s]) for (const c of ["vx", "vy", "vz"]) for (let k = 0; k < o[c].length; k++) o[c][k] = -o[c][k];
  for (let st = 0; st < PHYS.nstp; st++) stepOnce(h, s, DT);
  let d = 0; for (let k = 0; k < s.n; k++) d = Math.max(d, Math.hypot(s.x[k] - x0[k], s.y[k] - y0[k], s.z[k] - z0[k]));
  revisa(d < 1e-3, "las estrellas vuelven a su lugar con un error de " + d.toExponential(1) + " pc");
}

console.log(fallas ? "\n" + fallas + " prueba(s) fallaron" : "\nTodo bien");
process.exit(fallas ? 1 : 0);
