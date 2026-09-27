// Pseudoizochromatické tabulky. Barvy navržené simulací barvocitu (Machado 2009):
// RG: normální vidění ΔE 55, protan 4,8, deutan 4,4 · klasifikace: číslice pro protany ΔE 2,9 (deutan 30), pro deutany 2,5 (protan 41)
// Tritan: tritan ΔE 3,7, normální 43, protan/deutan ≥ 40 · Ukázková: viditelná pro všechny. (ΔE = CIELAB 1976)
const GOLD = "#ccaf26";
const OLIVE = "#5cc715";
const CLASS_BG = "#34894a";
const PROTAN_INVISIBLE = "#f15b40";
const DEUTAN_INVISIBLE = "#d4085a";
const CYAN = "#0edb85";
const MINT = "#41e324";

export type PlateKind = "demo" | "rg" | "classify" | "tritan";
export type Plate = {
  kind: PlateKind;
  number: string;
  fig: string;
  fig2?: string; // druhá číslice (klasifikační tabulky)
  bg: string;
  options: string[];
  protanSees?: string;
  deutanSees?: string;
  seed: number;
};

export const PLATES: Plate[] = [
  { kind: "demo", number: "12", fig: "#e87219", bg: "#96aedb", options: ["17", "12", "72"], seed: 11 },
  { kind: "rg", number: "8", fig: GOLD, bg: OLIVE, options: ["3", "6", "8"], seed: 23 },
  { kind: "rg", number: "29", fig: OLIVE, bg: GOLD, options: ["29", "70", "20"], seed: 37 },
  { kind: "classify", number: "26", fig: PROTAN_INVISIBLE, fig2: DEUTAN_INVISIBLE, bg: CLASS_BG, options: ["2", "26", "6"], protanSees: "6", deutanSees: "2", seed: 41 },
  { kind: "rg", number: "74", fig: GOLD, bg: OLIVE, options: ["21", "71", "74"], seed: 53 },
  { kind: "tritan", number: "3", fig: CYAN, bg: MINT, options: ["8", "3", "5"], seed: 67 },
  { kind: "rg", number: "45", fig: OLIVE, bg: GOLD, options: ["45", "15", "46"], seed: 71 },
  { kind: "classify", number: "42", fig: PROTAN_INVISIBLE, fig2: DEUTAN_INVISIBLE, bg: CLASS_BG, options: ["4", "2", "42"], protanSees: "2", deutanSees: "4", seed: 83 },
  { kind: "rg", number: "6", fig: GOLD, bg: OLIVE, options: ["5", "6", "9"], seed: 97 },
  { kind: "tritan", number: "57", fig: CYAN, bg: MINT, options: ["35", "51", "57"], seed: 101 },
];

export type ResultType = "normal" | "protan" | "deutan" | "redgreen" | "tritan" | "unclear";

/** Vyhodnocení odpovědí (null = „Nevidím číslo“). */
export function evaluate(answers: Array<string | null>): ResultType {
  let demoWrong = false, rgFails = 0, tritanFails = 0, protan = 0, deutan = 0;
  PLATES.forEach((p, i) => {
    const a = answers[i] ?? null;
    if (p.kind === "demo") demoWrong ||= a !== p.number;
    else if (p.kind === "rg") rgFails += a === p.number ? 0 : 1;
    else if (p.kind === "tritan") tritanFails += a === p.number ? 0 : 1;
    else if (a !== p.number) {
      rgFails += 1;
      if (a === p.protanSees) protan += 1;
      else if (a === p.deutanSees) deutan += 1;
    }
  });
  if (demoWrong) return "unclear";
  const byVotes = (): ResultType => (protan > deutan ? "protan" : deutan > protan ? "deutan" : "redgreen");
  if (rgFails >= 2) return tritanFails >= 2 ? "unclear" : byVotes();
  if (tritanFails >= 2) return "tritan";
  if (protan + deutan >= 2) return byVotes();
  return "normal";
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Vykreslí tabulku z teček (deterministicky podle seed). Číslice se čtou z masky vykreslené písmem. */
export function drawPlate(canvas: HTMLCanvasElement, plate: Plate, size: number, font: string) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext("2d");
  const mask = document.createElement("canvas");
  mask.width = size;
  mask.height = size;
  const m = mask.getContext("2d", { willReadFrequently: true });
  if (!ctx || !m) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  m.fillStyle = "#000";
  m.fillRect(0, 0, size, size);
  const fs = size * (plate.number.length > 1 ? 0.5 : 0.62);
  m.font = `800 ${fs}px ${font}`;
  m.textBaseline = "middle";
  const y = size / 2 + fs * 0.05;
  if (plate.fig2 && plate.number.length === 2) {
    const [a, b] = [plate.number[0]!, plate.number[1]!];
    const wa = m.measureText(a).width, wb = m.measureText(b).width, gap = fs * 0.08;
    const x0 = size / 2 - (wa + wb + gap) / 2;
    m.textAlign = "left";
    m.fillStyle = "rgb(255,0,0)";
    m.fillText(a, x0, y);
    m.fillStyle = "rgb(0,255,0)";
    m.fillText(b, x0 + wa + gap, y);
  } else {
    m.textAlign = "center";
    m.fillStyle = "rgb(255,0,0)";
    m.fillText(plate.number, size / 2, y);
  }
  const data = m.getImageData(0, 0, size, size).data;
  const rnd = mulberry32(plate.seed);
  const cx = size / 2, R = size / 2 - 3;
  const minR = size * 0.0075, maxR = size * 0.025;
  const cell = maxR * 2 + 2, cols = Math.ceil(size / cell);
  const grid: number[][] = Array.from({ length: cols * cols }, () => []);
  const dots: Array<{ x: number; y: number; r: number }> = [];
  for (let k = 0; k < 16000 && dots.length < 2600; k++) {
    const shrink = k < 2500 ? 1 : k < 7000 ? 0.7 : 0.45;
    const r = minR + (maxR - minR) * Math.pow(rnd(), 1.6) * shrink;
    const ang = rnd() * Math.PI * 2, rad = Math.sqrt(rnd()) * (R - r);
    const x = cx + Math.cos(ang) * rad, yy = cx + Math.sin(ang) * rad;
    const gx = Math.floor(x / cell), gy = Math.floor(yy / cell);
    let ok = true;
    for (let i = gx - 1; i <= gx + 1 && ok; i++) {
      for (let j = gy - 1; j <= gy + 1 && ok; j++) {
        if (i < 0 || j < 0 || i >= cols || j >= cols) continue;
        for (const idx of grid[j * cols + i]!) {
          const d = dots[idx]!;
          if ((d.x - x) ** 2 + (d.y - yy) ** 2 < (d.r + r + 1.1) ** 2) { ok = false; break; }
        }
      }
    }
    if (!ok) continue;
    grid[gy * cols + gx]!.push(dots.length);
    dots.push({ x, y: yy, r });
  }
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#f3eee2";
  ctx.beginPath();
  ctx.arc(cx, cx, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const shades = [0.9, 0.95, 1, 1.05, 1.1];
  for (const d of dots) {
    const i = (Math.min(size - 1, Math.round(d.y)) * size + Math.min(size - 1, Math.round(d.x))) * 4;
    const base = data[i]! > 128 ? plate.fig : data[i + 1]! > 128 ? (plate.fig2 ?? plate.fig) : plate.bg;
    ctx.fillStyle = shade(base, shades[Math.floor(rnd() * shades.length)]!);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
