/**
 * Procedural 3D shoe — built entirely from geometry (no image, no downloaded model).
 *
 * The upper is a loft of elliptical half–cross-sections along the length of a shoe last:
 *   z = s · w(t)            (s ∈ [-1, 1] across the foot, w = half width of the footprint)
 *   y = H(t) · √(1 − s²)    (H = crest height of the last at that point)
 * The collar opening is produced by limiting the ellipse angle near the heel, so the opening
 * edge is a clean grid row instead of a jagged cut. Details (laces, straps, stitching, buckle,
 * tassels, elastic gussets) are layered on the same surface function.
 */
import * as THREE from "three";

export type ShoeModel =
  | "pump"
  | "maryjane"
  | "ballerina"
  | "ankleboot"
  | "loafer"
  | "tassel"
  | "chelsea"
  | "oxford"
  | "derby"
  | "monk";
export type ShoeFinish = "polished" | "suede";

export type ShoeParams = {
  model: ShoeModel;
  upper: string;
  sole: string;
  finish?: ShoeFinish;
  toe?: "round" | "almond" | "pointed";
  stitch?: string;
  lining?: string;
  detail?: "high" | "low";
};

const L = 2.8; // shoe length in scene units (~28 cm)

/* ---------------- small math helpers ---------------- */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
function smooth(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
/** Cubic Hermite interpolation through knots (x_i, y_i) with Catmull-Rom tangents, flat ends. */
function spline(knots: [number, number][]) {
  const n = knots.length;
  const m = knots.map((_, i) =>
    i === 0 || i === n - 1 ? 0 : (knots[i + 1][1] - knots[i - 1][1]) / (knots[i + 1][0] - knots[i - 1][0])
  );
  return (x: number) => {
    if (x <= knots[0][0]) return knots[0][1];
    if (x >= knots[n - 1][0]) return knots[n - 1][1];
    let i = 0;
    while (x > knots[i + 1][0]) i++;
    const [x0, y0] = knots[i];
    const [x1, y1] = knots[i + 1];
    const h = x1 - x0;
    const u = (x - x0) / h;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
    const h10 = u ** 3 - 2 * u ** 2 + u;
    const h01 = -2 * u ** 3 + 3 * u ** 2;
    const h11 = u ** 3 - u ** 2;
    return h00 * y0 + h10 * h * m[i] + h01 * y1 + h11 * h * m[i + 1];
  };
}

/* ---------------- per-model geometry profile ---------------- */
type Profile = {
  tOpen: number; // where the collar opening closes (throat)
  collarBack: number; // collar height at heel
  collarDip: number; // lowest collar height along the sides
  openFrac: number; // opening width as fraction of foot width
  heelLift: number;
  soleT: number; // sole thickness
  toeSpring: number;
  crest: (t: number) => number; // top line of the closed part of the upper
  toeStart: number; // where the toe cap shape begins
  toeP: number; // footprint toe superellipse exponent (lower = pointier)
  width: number; // overall width scale
  heel: "block" | "tapered" | "stiletto";
  archA: number; // arch transition (heel seat -> ball)
  archB: number;
};

function profileFor(p: ShoeParams): Profile {
  const toe = p.toe ?? (["pump", "maryjane"].includes(p.model) ? "pointed" : "round");
  const toeStart = toe === "pointed" ? 0.72 : toe === "almond" ? 0.79 : 0.83;
  const toeP = toe === "pointed" ? 1.35 : toe === "almond" ? 1.65 : 2.05;
  const toeQ = toe === "pointed" ? 1.7 : toe === "almond" ? 2.2 : 2.6;
  const mkCrest = (knots: [number, number][]) => {
    const base = spline(knots);
    return (t: number) => {
      if (t <= toeStart) return base(t);
      const ht0 = base(toeStart);
      const u = (t - toeStart) / (1 - toeStart);
      return ht0 * Math.pow(Math.max(0, 1 - Math.pow(u, toeQ)), 1 / toeQ);
    };
  };
  const men = mkCrest([
    [0.3, 0.76],
    [0.42, 0.68],
    [0.55, 0.55],
    [0.68, 0.415],
    [toeStart, toe === "almond" ? 0.29 : 0.31],
  ]);
  const women = mkCrest([
    [0.3, 0.66],
    [0.45, 0.54],
    [0.58, 0.42],
    [0.7, 0.32],
    [toeStart, toe === "pointed" ? 0.24 : 0.27],
  ]);
  const common = { toeStart, toeP, toeSpring: 0.04, archA: 0.2, archB: 0.56 };
  switch (p.model) {
    case "pump":
      return { ...common, tOpen: 0.66, collarBack: 0.42, collarDip: 0.15, openFrac: 0.9, heelLift: 0.92, soleT: 0.035,
        crest: women, width: 0.86, heel: "stiletto", archA: 0.14, archB: 0.62, toeSpring: 0.015 };
    case "maryjane":
      return { ...common, tOpen: 0.62, collarBack: 0.42, collarDip: 0.17, openFrac: 0.88, heelLift: 0.55, soleT: 0.04,
        crest: women, width: 0.87, heel: "tapered", archA: 0.16, archB: 0.6, toeSpring: 0.02 };
    case "ballerina":
      return { ...common, tOpen: 0.64, collarBack: 0.36, collarDip: 0.15, openFrac: 0.9, heelLift: 0.07, soleT: 0.04,
        crest: women, width: 0.88, heel: "block" };
    case "loafer":
    case "tassel":
      return { ...common, tOpen: 0.56, collarBack: 0.55, collarDip: 0.38, openFrac: 0.76, heelLift: 0.13, soleT: 0.055,
        crest: women, width: 0.9, heel: "block" };
    case "ankleboot":
    case "chelsea": {
      const high = p.model === "ankleboot";
      const shaft = spline([
        [0.2, high ? 1.08 : 1.2],
        [0.33, high ? 1.0 : 1.12],
        [0.46, high ? 0.74 : 0.8],
        [0.56, 0.54],
        [0.64, 0.44],
      ]);
      return {
        ...common,
        tOpen: 0.33,
        collarBack: high ? 1.08 : 1.2,
        collarDip: high ? 0.98 : 1.1,
        openFrac: 0.72,
        heelLift: high ? 0.55 : 0.18,
        soleT: high ? 0.05 : 0.08,
        crest: (t) => (t < 0.64 ? Math.max(shaft(t), women(t)) : women(t)),
        width: 0.88,
        heel: high ? "tapered" : "block",
        archA: high ? 0.16 : 0.2,
        archB: high ? 0.6 : 0.56,
      };
    }
    default:
      return { ...common, tOpen: 0.41, collarBack: 0.62, collarDip: 0.45, openFrac: 0.7, heelLift: 0.16, soleT: 0.055,
        crest: men, width: 1, heel: "block", toeSpring: 0.05 };
  }
}

/* ---------------- textures (procedural, generated once) ---------------- */
let grainTex: THREE.Texture | null = null;
function leatherGrain() {
  if (grainTex) return grainTex;
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  // value noise with a few octaves -> pebble-like leather grain
  const rnd = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const noise = (x: number, y: number, f: number) => {
    const xi = Math.floor(x * f), yi = Math.floor(y * f);
    const xf = x * f - xi, yf = y * f - yi;
    const wrap = (v: number) => ((v % f) + f) % f;
    const a = rnd(wrap(xi), wrap(yi)), b = rnd(wrap(xi + 1), wrap(yi));
    const cc = rnd(wrap(xi), wrap(yi + 1)), d = rnd(wrap(xi + 1), wrap(yi + 1));
    const ux = xf * xf * (3 - 2 * xf), uy = yf * yf * (3 - 2 * yf);
    return a + (b - a) * ux + (cc - a) * uy + (a - b - cc + d) * ux * uy;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const n = 0.55 * noise(u, v, 32) + 0.3 * noise(u, v, 64) + 0.15 * noise(u, v, 128);
      const val = Math.round(255 * Math.pow(n, 1.4));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  grainTex = new THREE.CanvasTexture(c);
  grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping;
  grainTex.repeat.set(10, 3);
  grainTex.colorSpace = THREE.NoColorSpace;
  return grainTex;
}

let ribTex: THREE.Texture | null = null;
function ribbed() {
  if (ribTex) return ribTex;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 4;
  const g = c.getContext("2d")!;
  for (let x = 0; x < 64; x++) {
    const v = 128 + 120 * Math.sin((x / 64) * Math.PI * 2 * 8);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1, 4);
  }
  ribTex = new THREE.CanvasTexture(c);
  ribTex.wrapS = ribTex.wrapT = THREE.RepeatWrapping;
  return ribTex;
}

/* ---------------- materials ---------------- */
function upperMaterial(color: string, finish: ShoeFinish) {
  const c = new THREE.Color(color);
  if (finish === "suede") {
    return new THREE.MeshPhysicalMaterial({
      color: c,
      roughness: 0.95,
      metalness: 0,
      sheen: 1,
      sheenRoughness: 0.55,
      sheenColor: c.clone().lerp(new THREE.Color("#ffffff"), 0.12),
      bumpMap: leatherGrain(),
      bumpScale: 0.35,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.85,
    clearcoatRoughness: 0.2,
    bumpMap: leatherGrain(),
    bumpScale: 0.25,
  });
}

/* ---------------- the builder ---------------- */
export function buildShoe(params: ShoeParams): THREE.Group {
  const P = profileFor(params);
  const finish = params.finish ?? "polished";
  const hi = params.detail !== "low";
  const N = hi ? 140 : 80; // samples along length
  const M = hi ? 36 : 22; // samples up the cross-section
  const almond = params.toe === "almond";
  const toeStart = P.toeStart;

  /* footprint half-width (side +1 lateral, -1 medial) */
  const mid = spline([
    [0.13, 0.3],
    [0.24, 0.318],
    [0.4, 0.302],
    [0.55, 0.365],
    [0.68, 0.4],
    [toeStart, toeStart < 0.75 ? 0.385 : almond ? 0.345 : 0.365],
  ]);
  const heelCap = 0.13;
  const w = (t: number, side: number) => {
    let v: number;
    if (t < heelCap) {
      const u = (heelCap - t) / heelCap;
      v = mid(heelCap) * Math.sqrt(Math.max(0, 1 - u * u));
    } else if (t > toeStart) {
      const u = (t - toeStart) / (1 - toeStart);
      const p = P.toeP;
      v = mid(toeStart) * Math.pow(Math.max(0, 1 - Math.pow(u, p)), 1 / p);
    } else v = mid(t);
    v *= P.width;
    if (side < 0) v *= 1 - 0.09 * Math.exp(-(((t - 0.43) / 0.12) ** 2)); // medial arch
    return v;
  };

  /* collar & virtual heights in the open region */
  const collar = spline([
    [0, P.collarBack],
    [0.26, P.collarDip],
    [P.tOpen, P.crest(P.tOpen)],
  ]);
  const openR = (t: number) => P.openFrac * Math.sqrt(Math.max(0, 1 - Math.pow(t / P.tOpen, 3)));
  const H = (t: number) => {
    if (t >= P.tOpen) return P.crest(t);
    const r = openR(t);
    return collar(t) / Math.sqrt(Math.max(1e-4, 1 - r * r));
  };
  const thetaMax = (t: number) => (t >= P.tOpen ? Math.PI / 2 : Math.acos(Math.min(1, openR(t))));

  /* deformation: heel lift + toe spring */
  const lift = (t: number) => P.heelLift * (1 - smooth(P.archA, P.archB, t)) + P.toeSpring * Math.pow(smooth(0.78, 1, t), 2);
  const deform = (v: THREE.Vector3) => {
    v.y += lift(clamp01(v.x / L));
    return v;
  };
  const base = P.soleT; // upper starts on top of the sole

  /** Point on the upper surface. s: -1..1 across, off: offset along normal. */
  const surf = (t: number, s: number, off = 0) => {
    const side = s >= 0 ? 1 : -1;
    const ww = w(t, side);
    const hh = H(t);
    const c = Math.min(1, Math.abs(s));
    const sn = Math.sqrt(1 - c * c);
    const z = s * ww;
    const y = hh * sn;
    // ellipse normal in (z, y)
    let nz = z / (ww * ww + 1e-6), ny = y / (hh * hh + 1e-6);
    const nl = Math.hypot(nz, ny) || 1;
    nz /= nl;
    ny /= nl;
    return deform(new THREE.Vector3(t * L, base + y + ny * off, z + nz * off));
  };

  const group = new THREE.Group();
  group.name = `shoe-${params.model}`;

  /* ----- upper ----- */
  const ts: number[] = [];
  for (let i = 0; i <= N; i++) ts.push((1 - Math.cos((Math.PI * i) / N)) / 2);
  const ring: { t: number; side: number }[] = [];
  for (let i = 0; i <= N; i++) ring.push({ t: ts[i], side: 1 });
  for (let i = N - 1; i >= 1; i--) ring.push({ t: ts[i], side: -1 });
  const R = ring.length;

  const pos: number[] = [];
  const uv: number[] = [];
  for (let k = 0; k < R; k++) {
    const { t, side } = ring[k];
    const ww = w(t, side);
    const hh = H(t);
    const tm = thetaMax(t);
    for (let j = 0; j <= M; j++) {
      const th = (tm * j) / M;
      const v = deform(new THREE.Vector3(t * L, base + hh * Math.sin(th), side * ww * Math.cos(th)));
      pos.push(v.x, v.y, v.z);
      uv.push(k / R, j / M);
    }
  }
  const idx: number[] = [];
  for (let k = 0; k < R; k++) {
    const k2 = (k + 1) % R;
    for (let j = 0; j < M; j++) {
      const a = k * (M + 1) + j, b = k2 * (M + 1) + j, c = k2 * (M + 1) + j + 1, d = k * (M + 1) + j + 1;
      // orientation chosen so normals face outward
      idx.push(a, d, b, b, d, c);
    }
  }
  const upperGeo = new THREE.BufferGeometry();
  upperGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  upperGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  upperGeo.setIndex(idx);
  upperGeo.computeVertexNormals();
  // Make sure normals point outwards (z-sign test on a lateral vertex).
  {
    const n = upperGeo.getAttribute("normal");
    const probe = Math.floor(N * 0.6) * (M + 1) + 2;
    if (n.getZ(probe) < 0) {
      idx.length = 0;
      for (let k = 0; k < R; k++) {
        const k2 = (k + 1) % R;
        for (let j = 0; j < M; j++) {
          const a = k * (M + 1) + j, b = k2 * (M + 1) + j, c = k2 * (M + 1) + j + 1, d = k * (M + 1) + j + 1;
          idx.push(a, b, d, b, c, d);
        }
      }
      upperGeo.setIndex(idx);
      upperGeo.computeVertexNormals();
    }
  }

  const upperMat = upperMaterial(params.upper, finish);
  const upper = new THREE.Mesh(upperGeo, upperMat);
  upper.castShadow = true;
  upper.receiveShadow = true;
  group.add(upper);

  const liningColor = params.lining ?? (new THREE.Color(params.upper).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? "#c8b49a" : "#a9805c");
  const liningMat = new THREE.MeshStandardMaterial({ color: liningColor, roughness: 0.8, side: THREE.BackSide });
  group.add(new THREE.Mesh(upperGeo, liningMat));

  /* ----- footprint polyline helpers ----- */
  const outline = (offset: number, steps = N) => {
    const pts: THREE.Vector2[] = [];
    const raw: THREE.Vector2[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (1 - Math.cos((Math.PI * i) / steps)) / 2;
      raw.push(new THREE.Vector2(t * L, w(t, 1)));
    }
    for (let i = steps - 1; i >= 1; i--) {
      const t = (1 - Math.cos((Math.PI * i) / steps)) / 2;
      raw.push(new THREE.Vector2(t * L, -w(t, -1)));
    }
    const n = raw.length;
    for (let i = 0; i < n; i++) {
      const a = raw[(i - 1 + n) % n], b = raw[(i + 1) % n];
      const tx = b.x - a.x, ty = b.y - a.y;
      const l = Math.hypot(tx, ty) || 1;
      // outward normal for a counter-clockwise loop (lateral side first => +y first, clockwise in x/z)
      let nx = ty / l, ny = -tx / l;
      const p = raw[i];
      // ensure it points away from the centre line
      const cx = p.x - L * 0.5, cy = p.y;
      if (nx * cx * 0.15 + ny * cy < 0) {
        nx = -nx;
        ny = -ny;
      }
      pts.push(new THREE.Vector2(p.x + nx * offset, p.y + ny * offset));
    }
    return pts;
  };

  /* ----- sole ----- */
  const soleMat = new THREE.MeshStandardMaterial({ color: params.sole, roughness: 0.55, metalness: 0 });
  const soleEdge = 0.04;
  const solePts = outline(soleEdge, hi ? 120 : 70);

  /**
   * A slab following the footprint outline, triangulated as strips across the foot so that
   * the heel-lift deformation bends it smoothly (an extruded shape would cut through the arch).
   */
  const slab = (ring: THREE.Vector2[], yBottom: number, yTop: number, withBottom = true) => {
    const n = ring.length; // lateral heel->toe, then medial toe->heel
    const half = Math.round(n / 2);
    const K = 10;
    const p: number[] = [];
    const ix: number[] = [];
    const push = (x: number, y: number, z: number) => {
      const v = deform(new THREE.Vector3(x, y, z));
      p.push(v.x, v.y, v.z);
      return p.length / 3 - 1;
    };
    const faces = (y: number, up: boolean) => {
      const startIdx = p.length / 3;
      for (let i = 0; i <= half; i++) {
        const a = ring[i % n], b = ring[(n - i) % n];
        for (let k = 0; k <= K; k++) {
          const u = k / K;
          push(a.x + (b.x - a.x) * u, y, a.y + (b.y - a.y) * u);
        }
      }
      for (let i = 0; i < half; i++)
        for (let k = 0; k < K; k++) {
          const a = startIdx + i * (K + 1) + k, b = startIdx + (i + 1) * (K + 1) + k;
          if (up) ix.push(a, a + 1, b, b, a + 1, b + 1);
          else ix.push(a, b, a + 1, b, b + 1, a + 1);
        }
    };
    faces(yTop, true);
    if (yTop !== yBottom) {
      if (withBottom) faces(yBottom, false);
      const s0 = p.length / 3;
      for (let i = 0; i <= n; i++) {
        const r = ring[i % n];
        push(r.x, yBottom, r.y);
        push(r.x, yTop, r.y);
      }
      for (let i = 0; i < n; i++) {
        const a = s0 + i * 2, b = s0 + (i + 1) * 2;
        ix.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    return g;
  };

  const soleGeo = slab(solePts, 0, P.soleT);
  const sole = new THREE.Mesh(soleGeo, new THREE.MeshStandardMaterial({ color: params.sole, roughness: 0.55, side: THREE.DoubleSide }));
  sole.castShadow = true;
  sole.receiveShadow = true;
  group.add(sole);
  void soleMat;

  /* ----- heel (top follows the lifted sole, bottom on the ground) ----- */
  const heelColor = new THREE.Color(params.sole).lerp(new THREE.Color("#000"), 0.25);
  if (P.heel === "stiletto") {
    // covered stiletto: tapered elliptical column, flared under the heel seat
    const rings = 16, segs = 28;
        const p: number[] = [], ix: number[] = [];
    const cxTop = 0.095 * L, cxBot = 0.12 * L;
    for (let i = 0; i <= rings; i++) {
      const u = i / rings; // 0 top -> 1 ground
      const k = Math.pow(1 - u, 2.4);
      const rx = 0.032 + (0.16 - 0.032) * k;
      const rz = 0.03 + (0.13 * P.width - 0.03) * k;
      const cx = cxTop + (cxBot - cxTop) * Math.pow(u, 0.8) - 0.02 * Math.sin(u * Math.PI);
      for (let j = 0; j <= segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const x = cx + rx * Math.cos(a);
        const yTop = lift(clamp01(x / L)) + 0.004;
        const y = yTop * (1 - u);
        p.push(x, i === rings ? 0 : y, rz * Math.sin(a));
      }
    }
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j, b = (i + 1) * (segs + 1) + j;
        ix.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    const heel = new THREE.Mesh(g, upperMat);
    heel.castShadow = true;
    group.add(heel);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.034, 0.03, 20), new THREE.MeshStandardMaterial({ color: "#0d0c0b", roughness: 0.7 }));
    tip.position.set(cxBot, 0.015, 0);
    tip.scale.z = 0.95;
    group.add(tip);
  } else {
    const tapered = P.heel === "tapered";
    const heelEnd = (tapered ? 0.2 : 0.26) * L;
    // heel outline: sole outline points behind heelEnd, in ring order starting on the medial side
    const n = solePts.length;
    let start = 0;
    for (let i = n - 1; i > n / 2; i--) if (solePts[i].x <= heelEnd) start = i;
    const poly: THREE.Vector2[] = [];
    for (let k = 0; k < n; k++) {
      const pt = solePts[(start + k) % n];
      if (pt.x <= heelEnd) poly.push(pt);
      else if (poly.length > 4) break;
    }
    const cx = poly.reduce((a, b) => a + b.x, 0) / poly.length;
    const S = tapered ? 10 : 2;
    const p: number[] = [], ix: number[] = [];
    const m = poly.length;
    for (let j = 0; j <= S; j++) {
      const y01 = j / S; // 0 ground -> 1 top
      const k = tapered ? 0.58 + 0.42 * Math.pow(y01, 1.8) : 1;
      for (let i = 0; i <= m; i++) {
        const q = poly[i % m];
        const topY = lift(clamp01(q.x / L)) + 0.002;
        const x = cx + (q.x - cx) * k + (tapered ? (1 - y01) * 0.05 : 0);
        p.push(x, y01 * topY, q.y * k);
      }
    }
    for (let j = 0; j < S; j++)
      for (let i = 0; i < m; i++) {
        const a = j * (m + 1) + i, b = (j + 1) * (m + 1) + i;
        ix.push(a, a + 1, b, b, a + 1, b + 1);
      }
    // ground cap (fan)
    const c0 = p.length / 3;
    p.push(cx + (tapered ? 0.05 : 0), 0, 0);
    for (let i = 0; i < m; i++) ix.push(c0, i + 1, i);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    const heel = new THREE.Mesh(
      g,
      tapered
        ? upperMat
        : new THREE.MeshStandardMaterial({ color: heelColor, roughness: 0.6, side: THREE.DoubleSide })
    );
    heel.castShadow = true;
    group.add(heel);
  }

  /* ----- insole (seen through the opening) ----- */
  {
    const g = slab(outline(-0.035, 60), base + 0.025, base + 0.025);
    group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: liningColor, roughness: 0.85, side: THREE.DoubleSide })));
  }

  /* ----- collar rim ----- */
  const darker = new THREE.Color(params.upper).lerp(new THREE.Color("#000"), 0.35);
  const trimMat = new THREE.MeshStandardMaterial({ color: darker, roughness: 0.5 });
  {
    const pts: THREE.Vector3[] = [];
    const edge = (t: number, side: number) => {
      const th = thetaMax(t);
      return deform(new THREE.Vector3(t * L, base + H(t) * Math.sin(th), side * w(t, side) * Math.cos(th)));
    };
    const tEnd = P.tOpen - 0.004;
    for (let i = 60; i >= 1; i--) pts.push(edge((tEnd * i) / 60, -1));
    pts.push(edge(0, 1));
    for (let i = 1; i <= 60; i++) pts.push(edge((tEnd * i) / 60, 1));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, hi ? 220 : 120, 0.02, 8, false), trimMat);
    tube.castShadow = true;
    group.add(tube);
  }

  /* ----- stitching (instanced) ----- */
  const stitchColor = params.stitch ?? "#c9a640";
  const stitchMat = new THREE.MeshStandardMaterial({ color: stitchColor, roughness: 0.6 });
  const stitchGeo = new THREE.CapsuleGeometry(0.0055, 0.022, 2, 5);
  stitchGeo.rotateZ(Math.PI / 2); // align with +x
  const stitchLines: THREE.Vector3[][] = [];
  const addStitches = (pts: THREE.Vector3[]) => stitchLines.push(pts);

  const surfLine = (fn: (u: number) => [number, number], off = 0.006, steps = 80) => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const [t, s] = fn(i / steps);
      out.push(surf(t, s, off));
    }
    return out;
  };

  // welt stitch around the top of the sole
  {
    const pts = outline(soleEdge - 0.018, hi ? 140 : 80).map((p) => deform(new THREE.Vector3(p.x, P.soleT + 0.004, p.y)));
    pts.push(pts[0].clone());
    addStitches(pts);
  }

  const laceMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(params.upper).lerp(new THREE.Color("#000"), 0.55),
    roughness: 0.75,
  });

  const addLaces = (tA: number, tB: number, n: number, halfS: number) => {
    for (let i = 0; i < n; i++) {
      const t = tA + ((tB - tA) * i) / (n - 1);
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 16; k++) pts.push(surf(t, -halfS + (2 * halfS * k) / 16, 0.022));
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.013, 6), laceMat));
      for (const s of [-halfS, halfS]) {
        const e = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.006, 6, 14), trimMat);
        const p = surf(t, s, 0.008);
        e.position.copy(p);
        const nrm = surf(t, s, 0.05).sub(p).normalize();
        e.lookAt(p.clone().add(nrm));
        group.add(e);
      }
    }
    // bow
    const top = surf(tA - 0.005, 0, 0.03);
    for (const side of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 24, Math.PI * 1.4), laceMat);
      loop.position.copy(top).add(new THREE.Vector3(-0.02, 0.02, side * 0.07));
      loop.rotation.set(Math.PI / 2 - 0.5, side * 0.6, side > 0 ? 0.4 : Math.PI - 0.4);
      group.add(loop);
      const endPts = [top.clone(), top.clone().add(new THREE.Vector3(0.06, -0.05, side * 0.05)), top.clone().add(new THREE.Vector3(0.12, -0.13, side * 0.11))];
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(endPts), 10, 0.011, 6), laceMat));
    }
    // tongue gap
    const gap: THREE.Vector3[] = [];
    for (let k = 0; k <= 20; k++) gap.push(surf(tA - 0.01 + ((tB + 0.012 - tA) * k) / 20, 0, 0.004));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gap), 20, 0.016, 5), trimMat));
  };

  /** A thin leather band lying on the surface between tA..tB across sA..sB (strap / saddle). */
  const addBand = (tA: number, tB: number, sA: number, sB: number, mat: THREE.Material, off = 0.014) => {
    const nt = 6, ns = 40;
    const p: number[] = [];
    const ix: number[] = [];
    for (let i = 0; i <= nt; i++)
      for (let j = 0; j <= ns; j++) {
        const v = surf(tA + ((tB - tA) * i) / nt, sA + ((sB - sA) * j) / ns, off);
        p.push(v.x, v.y, v.z);
      }
    for (let i = 0; i < nt; i++)
      for (let j = 0; j < ns; j++) {
        const a = i * (ns + 1) + j, b = (i + 1) * (ns + 1) + j;
        ix.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    group.add(m);
    addStitches(surfLine((u) => [tA + 0.008, sA + (sB - sA) * u], off + 0.004));
    addStitches(surfLine((u) => [tB - 0.008, sA + (sB - sA) * u], off + 0.004));
  };

  const bandMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(params.upper).lerp(new THREE.Color("#000"), 0.12),
    roughness: finish === "suede" ? 0.9 : 0.4,
    clearcoat: finish === "suede" ? 0 : 0.7,
    clearcoatRoughness: 0.25,
    side: THREE.DoubleSide,
  });
  const brass = new THREE.MeshStandardMaterial({ color: "#c7a467", metalness: 1, roughness: 0.3 });

  /** collar edge point (top of the opening) on one side */
  const edgePt = (t: number, side: number, off = 0) => {
    const th = thetaMax(t);
    const ww = w(t, side), hh = H(t);
    return deform(new THREE.Vector3(t * L, base + hh * Math.sin(th) + off, side * ww * Math.cos(th)));
  };

  switch (params.model) {
    case "pump":
      break;
    case "ballerina": {
      // small flat bow at the throat
      const c = surf(params.toe === "pointed" ? 0.67 : 0.665, 0, 0.02);
      const bowMat = bandMat;
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 10), bowMat);
        wing.scale.set(0.55, 0.28, 1);
        wing.position.copy(c).add(new THREE.Vector3(0.0, 0.0, side * 0.09));
        wing.rotation.x = side * 0.25;
        wing.castShadow = true;
        group.add(wing);
      }
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 10), trimMat);
      knot.position.copy(c).add(new THREE.Vector3(0, 0.01, 0));
      knot.scale.set(1.2, 0.8, 1);
      group.add(knot);
      break;
    }
    case "maryjane": {
      // instep strap spanning the opening, buckled on the lateral side
      const t = 0.47;
      const a = edgePt(t, -1), b = edgePt(t, 1);
      const midTop = surf(t, 0, 0).y + 0.03;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 24; k++) {
        const u = k / 24;
        const p = a.clone().lerp(b, u);
        p.y += (midTop - (a.y + b.y) / 2) * Math.sin(Math.PI * u);
        pts.push(p);
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const pos2: number[] = [], ix2: number[] = [];
      const half = 0.04;
      for (let k = 0; k <= 48; k++) {
        const p = curve.getPoint(k / 48);
        pos2.push(p.x - half, p.y, p.z, p.x + half, p.y, p.z);
        if (k < 48) {
          const i0 = k * 2;
          ix2.push(i0, i0 + 2, i0 + 1, i0 + 1, i0 + 2, i0 + 3);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos2, 3));
      g.setIndex(ix2);
      g.computeVertexNormals();
      const strap = new THREE.Mesh(g, bandMat);
      strap.castShadow = true;
      group.add(strap);
      const bp = b.clone().add(new THREE.Vector3(0, -0.04, 0.012));
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 8, 4), brass);
      frame.position.copy(bp);
      frame.rotation.z = Math.PI / 4;
      frame.scale.set(1, 1.2, 1);
      group.add(frame);
      break;
    }
    case "ankleboot": {
      // vamp seam + lateral zip with a brass pull
      addStitches(surfLine((u) => { const s = -0.98 + 1.96 * u; return [0.5 + 0.07 * (1 - s * s), s]; }));
      const zip: THREE.Vector3[] = [];
      const zt = 0.2;
      const top = edgePt(zt, 1);
      const bottom = surf(zt, 0.99, 0.006);
      for (let k = 0; k <= 30; k++) {
        const u = k / 30;
        const y = top.y - 0.02 + (bottom.y + 0.1 - (top.y - 0.02)) * u;
        // walk down the wall at constant t
        const hh = H(zt), ww = w(zt, 1);
        const sn = Math.min(1, (y - base - lift(zt)) / hh);
        const cs = Math.sqrt(Math.max(0, 1 - sn * sn));
        zip.push(new THREE.Vector3(zt * L, y, ww * cs + 0.008));
      }
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zip), 40, 0.011, 6), trimMat));
      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.012), brass);
      pull.position.copy(zip[2]).add(new THREE.Vector3(0, -0.04, 0.014));
      group.add(pull);
      break;
    }
    case "oxford": {
      addLaces(0.43, 0.56, 5, 0.3);
      // quarter seams (closed lacing) + cap toe double stitch
      for (const side of [-1, 1]) {
        addStitches(surfLine((u) => [0.585 - 0.24 * u, side * (0.33 + 0.64 * Math.pow(u, 1.3))]));
        addStitches(surfLine((u) => [0.57 - 0.24 * u, side * (0.33 + 0.64 * Math.pow(u, 1.3))]));
      }
      addStitches(surfLine((u) => [0.585, -0.33 + 0.66 * u], 0.006, 30));
      if (!almond || true) {
        addStitches(surfLine((u) => { const s = -0.995 + 1.99 * u; return [0.835 + 0.035 * (1 - s * s), s]; }));
        addStitches(surfLine((u) => { const s = -0.995 + 1.99 * u; return [0.85 + 0.035 * (1 - s * s), s]; }));
      }
      break;
    }
    case "derby": {
      addLaces(0.43, 0.56, 4, 0.33);
      // open facings: stitched flap outlines that run down to the sole
      for (const side of [-1, 1]) {
        addStitches(surfLine((u) => [0.6 - 0.2 * u * u, side * (0.4 + 0.58 * Math.sin((u * Math.PI) / 2))]));
        addStitches(surfLine((u) => [0.415, side * (0.32 + 0.66 * u)], 0.006, 30));
      }
      addStitches(surfLine((u) => [0.6, -0.4 + 0.8 * u], 0.006, 30));
      break;
    }
    case "loafer":
    case "tassel": {
      // moccasin apron (U-shaped) — double row
      for (const k of [0, 0.018]) {
        addStitches(
          surfLine((u) => {
            const ph = u * Math.PI;
            return [0.585 + (0.25 - k) * Math.sin(ph), (0.78 - k) * Math.cos(ph)];
          }, 0.006, 90)
        );
      }
      if (params.model === "loafer") {
        addBand(0.585, 0.64, -0.95, 0.95, bandMat);
        // penny slot
        const slot: THREE.Vector3[] = [];
        for (let k = 0; k <= 16; k++) slot.push(surf(0.6125, -0.28 + (0.56 * k) / 16, 0.02));
        group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(slot), 16, 0.011, 5), trimMat));
      } else {
        // tassels on a cord
        const cord: THREE.Vector3[] = [];
        for (let k = 0; k <= 24; k++) cord.push(surf(0.565, -0.9 + (1.8 * k) / 24, 0.016));
        group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cord), 30, 0.011, 6), laceMat));
        for (const s of [-0.17, 0.17]) {
          const anchor = surf(0.575, s, 0.03);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), bandMat);
          head.position.copy(anchor).add(new THREE.Vector3(0.05, 0.01, 0));
          head.scale.set(1.15, 0.85, 0.85);
          group.add(head);
          const fringe = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.15, 18, 1, false), bandMat);
          fringe.position.copy(head.position).add(new THREE.Vector3(0.06, -0.045, 0));
          fringe.rotation.z = 0.75;
          fringe.castShadow = true;
          group.add(fringe);
        }
      }
      break;
    }
    case "monk": {
      // vamp seam
      for (const side of [-1, 1]) addStitches(surfLine((u) => [0.44 - 0.12 * u, side * (0.2 + 0.78 * u)]));
      addStitches(surfLine((u) => [0.44, -0.2 + 0.4 * u], 0.006, 20));
      addBand(0.43, 0.52, -0.96, 0.56, bandMat, 0.016);
      // buckle on the lateral side
      const bp = surf(0.475, 0.66, 0.03);
      const nrm = surf(0.475, 0.66, 0.2).sub(bp).normalize();
      const buckle = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.011, 8, 4, Math.PI * 2), brass);
      frame.rotation.z = Math.PI / 4;
      frame.scale.set(1, 1.35, 1);
      buckle.add(frame);
      const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.13, 6), brass);
      prong.rotation.z = Math.PI / 2;
      buckle.add(prong);
      buckle.position.copy(bp);
      buckle.lookAt(bp.clone().add(nrm));
      group.add(buckle);
      // strap tail
      addBand(0.44, 0.51, 0.58, 0.82, bandMat, 0.03);
      break;
    }
    case "chelsea": {
      // elastic side gussets (V-shaped panels)
      const elastic = new THREE.MeshStandardMaterial({
        color: new THREE.Color(params.upper).lerp(new THREE.Color("#000"), 0.6),
        roughness: 0.85,
        bumpMap: ribbed(),
        bumpScale: 1.2,
        side: THREE.DoubleSide,
      });
      for (const side of [-1, 1]) {
        const nt = 18, nv = 10;
        const p: number[] = [], ix: number[] = [], uvs: number[] = [];
        const t0 = 0.16, t1 = 0.31, tc = (t0 + t1) / 2;
        for (let i = 0; i <= nt; i++) {
          const t = t0 + ((t1 - t0) * i) / nt;
          const tm = thetaMax(t);
          const depth = 0.55 * (1 - Math.abs(t - tc) / ((t1 - t0) / 2)); // V shape (fraction of the wall)
          const thLow = tm * (1 - Math.max(0.05, depth) * 0.55);
          for (let j = 0; j <= nv; j++) {
            const th = thLow + ((tm - thLow) * j) / nv;
            const ww = w(t, side), hh = H(t);
            const z = side * ww * Math.cos(th), y = hh * Math.sin(th);
            const nz = z / (ww * ww), ny = y / (hh * hh), nl = Math.hypot(nz, ny);
            const v = deform(new THREE.Vector3(t * L, base + y + (ny / nl) * 0.005, z + (nz / nl) * 0.005));
            p.push(v.x, v.y, v.z);
            uvs.push(i / nt, j / nv);
          }
        }
        for (let i = 0; i < nt; i++)
          for (let j = 0; j < nv; j++) {
            const a = i * (nv + 1) + j, b = (i + 1) * (nv + 1) + j;
            if (side > 0) ix.push(a, a + 1, b, b, a + 1, b + 1);
            else ix.push(a, b, a + 1, b, b + 1, a + 1);
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        g.setIndex(ix);
        g.computeVertexNormals();
        group.add(new THREE.Mesh(g, elastic));
      }
      // pull tab at the back
      const tabBase = deform(new THREE.Vector3(0.0, base + P.collarBack - 0.02, 0));
      const tabPts = [
        tabBase.clone().add(new THREE.Vector3(0.02, -0.1, 0)),
        tabBase.clone().add(new THREE.Vector3(-0.05, 0.03, 0)),
        tabBase.clone().add(new THREE.Vector3(-0.02, 0.12, 0)),
        tabBase.clone().add(new THREE.Vector3(0.05, 0.1, 0)),
      ];
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tabPts), 20, 0.018, 6), trimMat));
      // vamp seam
      addStitches(surfLine((u) => { const s = -0.98 + 1.96 * u; return [0.48 + 0.08 * (1 - s * s), s]; }));
      break;
    }
  }

  /* ----- build instanced stitches ----- */
  {
    const spacing = 0.042;
    const placements: { p: THREE.Vector3; d: THREE.Vector3 }[] = [];
    for (const line of stitchLines) {
      let acc = spacing * 0.5;
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i];
        const seg = b.clone().sub(a);
        const len = seg.length();
        if (len < 1e-6) continue;
        const dir = seg.clone().divideScalar(len);
        while (acc <= len) {
          placements.push({ p: a.clone().addScaledVector(dir, acc), d: dir });
          acc += spacing;
        }
        acc -= len;
      }
    }
    const inst = new THREE.InstancedMesh(stitchGeo, stitchMat, placements.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const xAxis = new THREE.Vector3(1, 0, 0);
    const one = new THREE.Vector3(1, 1, 1);
    placements.forEach(({ p, d }, i) => {
      q.setFromUnitVectors(xAxis, d);
      m.compose(p, q, one);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  }

  // centre: length on x, sitting on y = 0
  group.children.forEach((c) => c.position.x -= L / 2);
  return group;
}

export function disposeShoe(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

export const SHOE_LENGTH = L;
