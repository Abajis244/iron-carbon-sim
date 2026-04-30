import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback, useTransition } from 'react';
import { 
  Target, Layers, Zap, Search, Sun, Moon, 
  GraduationCap, MapPin, BookOpen, MousePointerClick, 
  Beaker, Flame, Activity, Download, Camera, Plus, Minus, 
  Shield, LineChart, FileSpreadsheet, Trash2, Lightbulb, 
  AlertTriangle, Info, Database, Share2, Loader2,
  RefreshCw, Crosshair, Image as ImageIcon, Magnet, Github, Link as LinkIcon, Wand2, Settings, ChevronDown, ChevronUp,
  Compass, CheckCircle2, ChevronRight, X, PlayCircle, SkipForward
} from 'lucide-react';

// ============================================================================
// MODULE: CONFIGURATION & CONSTANTS
// ============================================================================
const APP_VERSION = "v17.0 PRO (ABAJIS SteelLab)";

const CONSTANTS = {
  FE_C: {
    T_MAX: 1600, T_MELT: 1538, T_PERITECTIC: 1495, T_GAMMA_MAX: 1394, T_EUTECTIC: 1147,
    T_A3_PURE: 912, T_CURIE: 768, T_EUTECTOID: 727, T_A0: 210, 
    C_PURE: 0.00, C_FERRITE_MAX: 0.022, C_PERITECTIC_S: 0.09, C_PERITECTIC_G: 0.17,
    C_PERITECTIC_L: 0.53, C_EUTECTOID: 0.76, C_AUSTENITE_MAX: 2.11, C_EUTECTIC: 4.30, C_CEMENTITE: 6.67,
  },
  RATES: { ANNEAL: 2, NORMALIZE: 15, QUENCH: 150, CRITICAL_MARTENSITE: 80, CRITICAL_BAINITE: 35 },
  KM_EQ: { MS_BASE: 561, C_FACTOR: 474, K_BASE: 0.011, BS_BASE: 830, BS_C_FACTOR: 270 },
  CRITICAL_COMPS: [0.022, 0.76, 2.11, 4.30, 6.67]
};

const PTS = {
  MELT: { c: CONSTANTS.FE_C.C_PURE, t: CONSTANTS.FE_C.T_MELT },
  N: { c: CONSTANTS.FE_C.C_PURE, t: CONSTANTS.FE_C.T_GAMMA_MAX },
  G: { c: CONSTANTS.FE_C.C_PURE, t: CONSTANTS.FE_C.T_A3_PURE },
  PERI_L: { c: CONSTANTS.FE_C.C_PERITECTIC_L, t: CONSTANTS.FE_C.T_PERITECTIC },
  PERI_S: { c: CONSTANTS.FE_C.C_PERITECTIC_S, t: CONSTANTS.FE_C.T_PERITECTIC },
  PERI_G: { c: CONSTANTS.FE_C.C_PERITECTIC_G, t: CONSTANTS.FE_C.T_PERITECTIC },
  EUTEC_G: { c: CONSTANTS.FE_C.C_AUSTENITE_MAX, t: CONSTANTS.FE_C.T_EUTECTIC },
  EUTEC_L: { c: CONSTANTS.FE_C.C_EUTECTIC, t: CONSTANTS.FE_C.T_EUTECTIC },
  EUTEC_C: { c: CONSTANTS.FE_C.C_CEMENTITE, t: CONSTANTS.FE_C.T_EUTECTIC },
  EUTECTOID_A: { c: CONSTANTS.FE_C.C_FERRITE_MAX, t: CONSTANTS.FE_C.T_EUTECTOID },
  EUTECTOID_G: { c: CONSTANTS.FE_C.C_EUTECTOID, t: CONSTANTS.FE_C.T_EUTECTOID },
  EUTECTOID_C: { c: CONSTANTS.FE_C.C_CEMENTITE, t: CONSTANTS.FE_C.T_EUTECTOID },
  ROOM_A: { c: 0.008, t: 20 }, ROOM_C: { c: CONSTANTS.FE_C.C_CEMENTITE, t: 20 }
};

const STEEL_GRADES = [
  { name: "AISI 1018", c: 0.18, mn: 0.75, si: 0.20, cr: 0, mo: 0, v: 0, ni: 0, cu: 0, group: "Low Carbon", desc: "Excellent weldability. Case hardening." },
  { name: "AISI 1045", c: 0.45, mn: 0.75, si: 0.20, cr: 0, mo: 0, v: 0, ni: 0, cu: 0, group: "Medium Carbon", desc: "Good balance of strength & toughness." },
  { name: "AISI 1095", c: 0.95, mn: 0.40, si: 0.20, cr: 0, mo: 0, v: 0, ni: 0, cu: 0, group: "High Carbon", desc: "High hardness. Cutting tools, blades." },
  { name: "AISI 4140", c: 0.40, mn: 0.85, si: 0.20, cr: 0.95, mo: 0.20, v: 0, ni: 0, cu: 0, group: "Cr-Mo Alloy", desc: "High fatigue strength." },
  { name: "AISI D2", c: 1.50, mn: 0.30, si: 0.30, cr: 12.0, mo: 0.80, v: 0.90, ni: 0, cu: 0, group: "Tool Steel", desc: "High wear resistance." },
  { name: "Gray Iron", c: 3.20, mn: 0.60, si: 2.00, cr: 0, mo: 0, v: 0, ni: 0, cu: 0, group: "Cast Iron", desc: "Excellent damping. Engine blocks." }
];

const SCENARIOS = [
  {
    title: "1. The Eutectoid Point",
    desc: "Discover the critical intersection of phases in plain carbon steel.",
    steps: [
      { text: "Adjust the Carbon input to exactly 0.76 wt%.", check: (s) => Math.abs(parseFloat(s.carbon) - 0.76) <= 0.02 },
      { text: "Heat the steel into the Austenite (γ) region (>800°C).", check: (s) => parseFloat(s.temp) > 800 && Math.abs(parseFloat(s.carbon) - 0.76) <= 0.02 },
      { text: "Cool it slowly below 727°C. Watch it transform to 100% Pearlite.", check: (s) => parseFloat(s.temp) < 727 && s.simState.micro.includes('Pearlite') }
    ]
  },
  {
    title: "2. Quench Hardening",
    desc: "Learn how rapid cooling traps carbon to form ultra-hard Martensite.",
    steps: [
      { text: "Load a medium carbon steel (e.g., 'AISI 1045').", check: (s) => Math.abs(parseFloat(s.carbon) - 0.45) <= 0.02 },
      { text: "Heat the sample to 900°C to Austenitize.", check: (s) => parseFloat(s.temp) >= 900 },
      { text: "Hit the 'Quench' button rapidly cool and form Martensite.", check: (s) => s.simState.isQuenched }
    ]
  }
];

const TOUR_STEPS = [
  { target: 'none', title: 'Welcome to SteelLab', text: 'This is an advanced metallurgical simulator mapping thermodynamics, kinetics, and mechanics.' },
  { target: 'controls', title: 'Thermodynamic Controls', text: 'Adjust parameters here. Colors throughout the app represent phases: Gold = Austenite, Silver = Ferrite, Purple = Martensite.' },
  { target: 'diagram', title: 'Phase Map', text: 'Boundaries warp dynamically based on alloy composition. Drag the crosshair to explore.' },
  { target: 'kinetics', title: 'Kinetics (TTT/CCT)', text: 'Isothermal and continuous cooling curves derived from your composition.' },
  { target: 'telemetry', title: 'Telemetry', text: 'Real-time property predictions and generated microstructures.' },
  { target: 'optimizer', title: 'Inverse Design', text: 'Input target properties, and our simplex algorithm will find the right composition.' }
];

// ============================================================================
// MODULE: UTILITIES & MATERIAL SCIENCE HELPERS
// ============================================================================
const cn = (...classes) => classes.filter(Boolean).join(' ');
const parseNum = (val, fallback = 0) => { const n = parseFloat(val); return isNaN(n) ? fallback : n; };
const seededRandom = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };

const getCarbonEquivalent = (c, mn=0.5, cr=0, mo=0, v=0, ni=0, cu=0) => c + (mn/6) + ((cr + mo + v)/5) + ((ni + cu)/15);

const getWeldability = (alloy) => {
  let ce = getCarbonEquivalent(alloy.c, alloy.mn, alloy.cr, alloy.mo, alloy.v, alloy.ni, alloy.cu);
  if (ce <= 0.35) return { rating: 'Excellent', ce: ce.toFixed(2), desc: 'No pre-heat needed', color: 'text-emerald-500', bg: 'bg-[#10b981]/10 border-[#10b981]/30' };
  if (ce <= 0.50) return { rating: 'Fair', ce: ce.toFixed(2), desc: 'Pre-heat required', color: 'text-amber-500', bg: 'bg-[#f59e0b]/10 border-[#f59e0b]/30' };
  if (alloy.c <= CONSTANTS.FE_C.C_AUSTENITE_MAX) return { rating: 'Poor', ce: ce.toFixed(2), desc: 'Post-weld heat treat required', color: 'text-rose-500', bg: 'bg-[#f43f5e]/10 border-[#f43f5e]/30' };
  return { rating: 'Unweldable', ce: ce.toFixed(2), desc: 'Cast Iron structure', color: 'text-red-600', bg: 'bg-[#dc2626]/10 border-[#dc2626]/30' };
};

const getBlackbodyGlow = (t, alphaMulti = 1) => {
  if (t < 600) return 'rgba(0,0,0,0)'; 
  const safeT = Math.max(600, t);
  const intensity = Math.min(1, Math.pow((safeT - 600) / 800, 2)); 
  if (safeT < 750) return `rgba(139, 0, 0, ${alphaMulti * intensity * 0.8})`; 
  if (safeT < 900) return `rgba(255, 69, 0, ${alphaMulti * intensity * 0.9})`; 
  if (safeT < 1100) return `rgba(255, 140, 0, ${alphaMulti * intensity})`; 
  if (safeT < 1300) return `rgba(255, 215, 0, ${alphaMulti * Math.min(1.0, intensity + 0.2)})`; 
  return `rgba(255, 250, 180, ${alphaMulti})`; 
};

const convertHardness = (hv) => {
  const safeHV = Math.max(0, hv);
  return {
    hv: Math.round(safeHV),
    hrc: safeHV > 200 ? Math.max(0, Math.min(70, Math.round((116 - (1500 / Math.sqrt(safeHV))) * 10) / 10)) : 0,
    hb: Math.round(safeHV * 0.95)
  };
};

const generateVoronoi = (seed, w, h, numPoints = 40) => {
  let s = Math.abs(Math.sin(seed) * 10000) || 1;
  const rand = () => { s = (s * 16807) % 2147483647; return (s / 2147483647); };
  
  const points = Array.from({ length: numPoints }, () => ({ x: rand() * w, y: rand() * h }));
  
  const clipPolygon = (poly, p1, p2) => {
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const nx = p2.x - p1.x, ny = p2.y - p1.y;
    const inside = (p) => (p.x - mx) * nx + (p.y - my) * ny <= 0;
    const intersect = (a, b) => {
      const t = ((mx - a.x) * nx + (my - a.y) * ny) / ((b.x - a.x) * nx + (b.y - a.y) * ny);
      return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    };
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const curr = poly[i], prev = poly[(i === 0 ? poly.length : i) - 1];
      const inCurr = inside(curr), inPrev = inside(prev);
      if (inCurr && !inPrev) out.push(intersect(prev, curr));
      if (inCurr) out.push(curr);
      if (!inCurr && inPrev) out.push(intersect(prev, curr));
    }
    return out;
  };

  for(let iter=0; iter<3; iter++) {
      points.forEach((p, i) => {
          let poly = [{x:0,y:0}, {x:w,y:0}, {x:w,y:h}, {x:0,y:h}];
          points.forEach((p2, j) => { if (i !== j) poly = clipPolygon(poly, p, p2); });
          if(poly.length > 0) {
              let cx = 0, cy = 0;
              poly.forEach(v => { cx += v.x; cy += v.y; });
              p.x = cx / poly.length; p.y = cy / poly.length;
          }
      });
  }
  
  return points.map((p1, i) => {
    let poly = [{x:0,y:0}, {x:w,y:0}, {x:w,y:h}, {x:0,y:h}];
    points.forEach((p2, j) => { if (i !== j) poly = clipPolygon(poly, p1, p2); });
    return poly.length > 0 ? `M ${poly.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' L ')} Z` : '';
  }).filter(p => p !== '');
};

// ============================================================================
// MODULE: THERMODYNAMIC & KINETIC ENGINE
// ============================================================================

const KineticEngine = {
  avrami: (t, k, n) => 1 - Math.exp(-k * Math.pow(Math.max(0, t), n)),
  pearliteStartTime: (T, alloy, consts) => {
    const { mn, cr, mo } = alloy;
    const dT = Math.max(1, consts.T_EUTECTOID - T);
    const alloyFactor = Math.exp(1.0 * mn + 0.7 * cr + 1.2 * mo);
    return alloyFactor * Math.exp(23500 / (8.314 * (T + 273))) / Math.pow(dT, 3);
  }, 
  getCCTTransformation: (coolingPath, alloy, consts) => {
    let pearliteSum = 0, bainiteSum = 0, X_pearlite = 0, X_bainite = 0;
    let pearliteStartT = null, bainiteStartT = null;

    for (let i = 1; i < coolingPath.length; i++) {
      const T = coolingPath[i].t;
      const dt = Math.max(0, coolingPath[i].time - coolingPath[i-1].time);
      
      if (T < consts.T_EUTECTOID && T > consts.T_bs) {
        const t_start = KineticEngine.pearliteStartTime(T, alloy, consts);
        pearliteSum += dt / t_start;
        if (pearliteSum >= 1 && X_pearlite < 0.99) {
          if (pearliteStartT === null) pearliteStartT = coolingPath[i].time;
          const t_elapsed = coolingPath[i].time - pearliteStartT;
          X_pearlite = KineticEngine.avrami(t_elapsed, 0.02, 1.8);
        }
      }
      
      if (T <= consts.T_bs && T > consts.T_ms) {
        const t_start = KineticEngine.pearliteStartTime(T, alloy, consts) * 1.5;
        bainiteSum += dt / t_start;
        if (bainiteSum >= 1 && X_bainite < 0.99) {
          if (bainiteStartT === null) bainiteStartT = coolingPath[i].time;
          const t_elapsed = coolingPath[i].time - bainiteStartT;
          X_bainite = KineticEngine.avrami(t_elapsed, 0.01, 2.2);
        }
      }
    }
    
    const T_final = coolingPath.length > 0 ? coolingPath[coolingPath.length - 1].t : 20;
    const X_martensite = T_final < consts.T_ms ? 1 - Math.exp(-0.011 * (consts.T_ms - T_final)) : 0;
      
    return {
      fractions: {
        pearlite: Math.max(0, Math.min(1 - X_martensite, X_pearlite)),
        bainite: Math.max(0, Math.min(1 - X_martensite - X_pearlite, X_bainite)),
        martensite: Math.max(0, Math.min(1, X_martensite)),
        retained_austenite: Math.max(0, 1 - X_pearlite - X_bainite - X_martensite)
      },
      pearliteStarted: pearliteSum >= 1,
      bainiteStarted: bainiteSum >= 1
    };
  }
};

const ThermoEngine = {
  getAlloyAdjustedConstants: function(alloy) {
    const { c=0, mn=0, si=0, cr=0, ni=0, mo=0, v=0 } = alloy || {};
    const dT_eutectoid = -(16.9 * ni) + (29.1 * si) + (16.9 * cr) - (10.7 * mn) + (290 * v) + (6.38 * mo);
    const dC_eutectoid = -(0.018 * mn) - (0.022 * si) + (0.031 * mo) - (0.0075 * cr) + (0.018 * ni);
    const dT_A3 = -(14 * ni) + (44 * si) + (10 * cr) - (35 * mn) + (60 * mo);
    const Ms = 539 - (423 * c) - (30.4 * mn) - (17.7 * ni) - (12.1 * cr) - (7.5 * mo);
    const Mf = Ms - 215; 
    const Bs = 830 - (270 * c) - (90 * mn) - (37 * ni) - (70 * cr) - (83 * mo);

    return {
      T_EUTECTOID: CONSTANTS.FE_C.T_EUTECTOID + dT_eutectoid,
      C_EUTECTOID: Math.max(0.1, CONSTANTS.FE_C.C_EUTECTOID + dC_eutectoid),
      T_A3_PURE: CONSTANTS.FE_C.T_A3_PURE + dT_A3,
      T_ms: Math.max(20, Ms),
      T_mf: Math.max(0, Mf),
      T_bs: Math.max(100, Bs)
    };
  },
  c_alpha: (T, consts) => T > consts.T_A3_PURE ? 0 : (T >= consts.T_EUTECTOID ? CONSTANTS.FE_C.C_FERRITE_MAX * ((consts.T_A3_PURE - T) / (consts.T_A3_PURE - consts.T_EUTECTOID)) : CONSTANTS.FE_C.C_FERRITE_MAX * Math.pow(Math.max(0, T) / consts.T_EUTECTOID, 3)),
  c_a3: (T, consts) => T > consts.T_A3_PURE ? 0 : (T < consts.T_EUTECTOID ? consts.C_EUTECTOID : consts.C_EUTECTOID * Math.pow((consts.T_A3_PURE - T) / (consts.T_A3_PURE - consts.T_EUTECTOID), 0.9)),
  c_acm: (T, consts) => T < consts.T_EUTECTOID ? consts.C_EUTECTOID : (T > CONSTANTS.FE_C.T_EUTECTIC ? CONSTANTS.FE_C.C_AUSTENITE_MAX : consts.C_EUTECTOID + (CONSTANTS.FE_C.C_AUSTENITE_MAX - consts.C_EUTECTOID) * Math.pow((T - consts.T_EUTECTOID) / (CONSTANTS.FE_C.T_EUTECTIC - consts.T_EUTECTOID), 1.4)),
  c_solidus: (T) => T < CONSTANTS.FE_C.T_EUTECTIC ? CONSTANTS.FE_C.C_AUSTENITE_MAX : (T > CONSTANTS.FE_C.T_PERITECTIC ? CONSTANTS.FE_C.C_PERITECTIC_G : CONSTANTS.FE_C.C_PERITECTIC_G + (CONSTANTS.FE_C.C_AUSTENITE_MAX - CONSTANTS.FE_C.C_PERITECTIC_G) * Math.pow((CONSTANTS.FE_C.T_PERITECTIC - T) / (CONSTANTS.FE_C.T_PERITECTIC - CONSTANTS.FE_C.T_EUTECTIC), 0.85)),
  c_liquidus: (T) => T < CONSTANTS.FE_C.T_EUTECTIC ? CONSTANTS.FE_C.C_EUTECTIC : (T > CONSTANTS.FE_C.T_PERITECTIC ? CONSTANTS.FE_C.C_PERITECTIC_L : CONSTANTS.FE_C.C_PERITECTIC_L + (CONSTANTS.FE_C.C_EUTECTIC - CONSTANTS.FE_C.C_PERITECTIC_L) * Math.pow((CONSTANTS.FE_C.T_PERITECTIC - T) / (CONSTANTS.FE_C.T_PERITECTIC - CONSTANTS.FE_C.T_EUTECTIC), 0.85)),
  c_l_fe3c: (T) => T < CONSTANTS.FE_C.T_EUTECTIC ? CONSTANTS.FE_C.C_EUTECTIC : CONSTANTS.FE_C.C_EUTECTIC + (CONSTANTS.FE_C.C_CEMENTITE - CONSTANTS.FE_C.C_EUTECTIC) * ((T - CONSTANTS.FE_C.T_EUTECTIC) / 103),

  leverRule: function(id, name1, name2, c_bulk, c1, c2) {
    const span = Math.abs(c2 - c1);
    if (span <= 1e-4) return { regionId: id, fractions: [{ name: name1, frac: 100, pos: c1 }] };
    const clampedC = Math.max(Math.min(c1, c2), Math.min(c_bulk, Math.max(c1, c2)));
    let w2 = (Math.abs(clampedC - c1) / span) * 100;
    return { regionId: id, fractions: [ { name: name1, frac: Math.max(0, Math.min(100, 100 - w2)), pos: c1 }, { name: name2, frac: Math.max(0, Math.min(100, w2)), pos: c2 } ] };
  },

  singlePhase: function(id, name, c_bulk) { return { regionId: id, fractions: [{ name, frac: 100, pos: c_bulk }] }; },

  calculateEquilibrium: function(safeC, safeT, alloyObj) {
    const consts = this.getAlloyAdjustedConstants(alloyObj);

    if (safeT >= CONSTANTS.FE_C.T_GAMMA_MAX) {
      if (safeT >= CONSTANTS.FE_C.T_MELT) return this.singlePhase('L', 'Liquid', safeC);
      if (safeT >= CONSTANTS.FE_C.T_PERITECTIC) {
        let cd_s = PTS.PERI_S.c * ((CONSTANTS.FE_C.T_MELT - safeT) / (CONSTANTS.FE_C.T_MELT - CONSTANTS.FE_C.T_PERITECTIC));
        let cd_l = PTS.PERI_L.c * ((CONSTANTS.FE_C.T_MELT - safeT) / (CONSTANTS.FE_C.T_MELT - CONSTANTS.FE_C.T_PERITECTIC));
        if (safeC <= cd_s) return this.singlePhase('delta', 'Delta Ferrite (δ)', safeC);
        if (safeC < cd_l) return this.leverRule('delta_L', 'Delta Ferrite (δ)', 'Liquid', safeC, cd_s, cd_l);
        return this.singlePhase('L', 'Liquid', safeC);
      } else {
        let cd_s = PTS.PERI_S.c * ((safeT - CONSTANTS.FE_C.T_GAMMA_MAX) / (CONSTANTS.FE_C.T_PERITECTIC - CONSTANTS.FE_C.T_GAMMA_MAX));
        let c_perit_gamma = PTS.PERI_G.c * ((safeT - CONSTANTS.FE_C.T_GAMMA_MAX) / (CONSTANTS.FE_C.T_PERITECTIC - CONSTANTS.FE_C.T_GAMMA_MAX));
        let c_sol = this.c_solidus(safeT);
        let c_liq = this.c_liquidus(safeT);
        if (safeC <= cd_s) return this.singlePhase('delta', 'Delta Ferrite (δ)', safeC);
        if (safeC < c_perit_gamma) return this.leverRule('delta_gamma', 'Delta Ferrite (δ)', 'Austenite (γ)', safeC, cd_s, c_perit_gamma);
        if (safeC <= c_sol) return this.singlePhase('gamma', 'Austenite (γ)', safeC);
        if (safeC < c_liq) return this.leverRule('gamma_L', 'Austenite (γ)', 'Liquid', safeC, c_sol, c_liq);
        if (safeC <= this.c_l_fe3c(safeT)) return this.singlePhase('L', 'Liquid', safeC);
        return this.leverRule('L_Fe3C', 'Liquid', 'Cementite (Fe₃C)', safeC, this.c_l_fe3c(safeT), CONSTANTS.FE_C.C_CEMENTITE);
      }
    }
    if (safeT > CONSTANTS.FE_C.T_EUTECTIC) {
      let c_sol = this.c_solidus(safeT); let c_liq = this.c_liquidus(safeT); let c_lf = this.c_l_fe3c(safeT);
      if (safeC <= c_sol) return this.singlePhase('gamma', 'Austenite (γ)', safeC);
      if (safeC < c_liq) return this.leverRule('gamma_L', 'Austenite (γ)', 'Liquid', safeC, c_sol, c_liq);
      if (safeC <= c_lf) return this.singlePhase('L', 'Liquid', safeC);
      return this.leverRule('L_Fe3C', 'Liquid', 'Cementite (Fe₃C)', safeC, c_lf, CONSTANTS.FE_C.C_CEMENTITE);
    }
    if (safeT > consts.T_EUTECTOID) {
      let c_a3_val = this.c_a3(safeT, consts); let c_acm_val = this.c_acm(safeT, consts); let c_al = this.c_alpha(safeT, consts);
      if (safeC <= c_al) return this.singlePhase('alpha', 'Ferrite (α)', safeC);
      if (safeC <= c_a3_val) return this.leverRule('alpha_gamma', 'Ferrite (α)', 'Austenite (γ)', safeC, c_al, c_a3_val);
      if (safeC <= c_acm_val) return this.singlePhase('gamma', 'Austenite (γ)', safeC);
      return this.leverRule('gamma_Fe3C', 'Austenite (γ)', 'Cementite (Fe₃C)', safeC, c_acm_val, CONSTANTS.FE_C.C_CEMENTITE);
    }
    let c_al = this.c_alpha(safeT, consts);
    if (safeC <= c_al) return this.singlePhase('alpha', 'Ferrite (α)', safeC);
    return this.leverRule('alpha_Fe3C', 'Ferrite (α)', 'Cementite (Fe₃C)', safeC, c_al, CONSTANTS.FE_C.C_CEMENTITE);
  },

  getState: function(alloy, T, rate, processMode, maxRateExperienced, lowestTemp, historyTrail = []) {
    const alloyObj = typeof alloy === 'object' ? alloy : { c: alloy, mn: 0.5, si: 0.2, cr: 0, ni: 0, mo: 0, cu: 0, v: 0 };
    const safeC = Math.max(0, Math.min(CONSTANTS.FE_C.C_CEMENTITE, alloyObj.c));
    const safeT = Math.max(0, T);
    const consts = this.getAlloyAdjustedConstants(alloyObj);

    let { regionId, fractions: phaseFractions } = this.calculateEquilibrium(safeC, safeT, alloyObj);
    const msTemp = consts.T_ms; const mfTemp = consts.T_mf; const bsTemp = consts.T_bs;

    let microState = { isQuenched: false, isMetastable: false, isBainitic: false, isTempered: false, martensiteFrac: 0 };
    let activeRate = Math.max(rate, maxRateExperienced);
    let microFractions = [...phaseFractions];

    let effHistory = historyTrail;
    if (effHistory.length < 2 && activeRate > 0) {
        effHistory = []; let time = 0; const startT = Math.max(safeT, 900);
        for (let t = startT; t >= safeT; t -= 5) { effHistory.push({ t, time, c: safeC }); time += 5 / activeRate; }
    }

    if (safeC < CONSTANTS.FE_C.C_AUSTENITE_MAX && safeT <= consts.T_EUTECTOID) {
      if (processMode === 'temper' && maxRateExperienced >= CONSTANTS.RATES.CRITICAL_MARTENSITE) {
        microState.isTempered = true; regionId = 'tempered_martensite';
        phaseFractions = JSON.parse(JSON.stringify(this.calculateEquilibrium(safeC, 20, alloyObj).fractions)); 
        microFractions = [{ name: 'Tempered Martensite', frac: 100, pos: safeC }];
      } else if (effHistory.length > 2) {
        const cct = KineticEngine.getCCTTransformation(effHistory, alloyObj, consts);
        const { pearlite, bainite, martensite, retained_austenite } = cct.fractions;
        const fProeutectoidAlpha = safeC < consts.C_EUTECTOID ? (consts.C_EUTECTOID - safeC) / (consts.C_EUTECTOID - CONSTANTS.FE_C.C_FERRITE_MAX) : 0;
        const fProeutectoidCem = safeC > consts.C_EUTECTOID ? (safeC - consts.C_EUTECTOID) / (CONSTANTS.FE_C.C_CEMENTITE - consts.C_EUTECTOID) : 0;
        const fAusteniteAvailable = 1 - fProeutectoidAlpha - fProeutectoidCem;

        const dynFractions = [];
        if (fProeutectoidAlpha > 0.01) dynFractions.push({ name: 'Proeutectoid Ferrite', frac: fProeutectoidAlpha * 100, pos: safeC });
        if (fProeutectoidCem > 0.01) dynFractions.push({ name: 'Proeutectoid Cementite', frac: fProeutectoidCem * 100, pos: safeC });
        if (pearlite > 0.01) dynFractions.push({ name: 'Pearlite', frac: pearlite * fAusteniteAvailable * 100, pos: safeC });
        if (bainite > 0.01) dynFractions.push({ name: 'Bainite', frac: bainite * fAusteniteAvailable * 100, pos: safeC });
        if (martensite > 0.01) dynFractions.push({ name: 'Martensite', frac: martensite * fAusteniteAvailable * 100, pos: safeC });
        if (retained_austenite > 0.01) dynFractions.push({ name: safeT > consts.T_ms ? 'Supercooled Austenite' : 'Retained Austenite', frac: retained_austenite * fAusteniteAvailable * 100, pos: safeC });

        if (dynFractions.length > 0) {
          microFractions = dynFractions;
          phaseFractions = JSON.parse(JSON.stringify(dynFractions)); 
          microState.isQuenched = martensite > 0.1; microState.martensiteFrac = martensite;
          microState.isBainitic = bainite > Math.max(pearlite, martensite);
          microState.isMetastable = retained_austenite > 0.5 && safeT > consts.T_ms;
          if (microState.isQuenched) regionId = 'martensite';
          else if (microState.isBainitic) regionId = 'bainite';
          else if (microState.isMetastable) regionId = 'gamma_metastable';
        }
      }
    }

    if (!microState.isQuenched && !microState.isBainitic && !microState.isTempered && !microState.isMetastable && effHistory.length <= 2) {
       if (regionId === 'alpha_Fe3C') {
          if (safeC < consts.C_EUTECTOID) {
             const fAlphaPro = (consts.C_EUTECTOID - safeC) / (consts.C_EUTECTOID - CONSTANTS.FE_C.C_FERRITE_MAX);
             microFractions = [{ name: 'Proeutectoid Ferrite', frac: fAlphaPro*100 }, { name: 'Pearlite', frac: (1-fAlphaPro)*100 }];
          } else if (Math.abs(safeC - consts.C_EUTECTOID) < 0.02) {
             microFractions = [{ name: 'Pearlite', frac: 100 }];
          } else if (safeC <= CONSTANTS.FE_C.C_AUSTENITE_MAX) {
             const fCemPro = (safeC - consts.C_EUTECTOID) / (CONSTANTS.FE_C.C_CEMENTITE - consts.C_EUTECTOID);
             microFractions = [{ name: 'Proeutectoid Cementite', frac: fCemPro*100 }, { name: 'Pearlite', frac: (1-fCemPro)*100 }];
          } else {
             const fLedeburite = (safeC - CONSTANTS.FE_C.C_AUSTENITE_MAX) / (CONSTANTS.FE_C.C_CEMENTITE - CONSTANTS.FE_C.C_AUSTENITE_MAX);
             microFractions = [{ name: 'Pearlite', frac: (1-fLedeburite)*100 }, { name: 'Ledeburite', frac: fLedeburite*100 }];
          }
       }
    }

    if (phaseFractions.length === 2) phaseFractions[1].frac = 100 - phaseFractions[0].frac;
    if (microFractions.length === 2) microFractions[1].frac = 100 - microFractions[0].frac;

    let regionLabel = 'Equilibrium';
    if (microState.isTempered) regionLabel = 'Tempered Martensite';
    else if (microState.isQuenched) regionLabel = 'Martensitic Zone';
    else if (microState.isBainitic) regionLabel = 'Bainitic Zone';
    else if (microState.isMetastable) regionLabel = 'Supercooled γ';
    else if (regionId === 'L') regionLabel = 'Liquid Melt';
    else if (regionId === 'gamma') regionLabel = 'Austenite (γ)';
    else if (regionId === 'alpha') regionLabel = 'Ferrite (α)';
    else if (regionId === 'delta') regionLabel = 'Delta Ferrite (δ)';
    else if (regionId === 'gamma_L') regionLabel = 'Mushy (L + γ)';
    else if (regionId === 'delta_L') regionLabel = 'Mushy (L + δ)';
    else if (regionId === 'delta_gamma') regionLabel = 'Two-Phase (δ + γ)';
    else if (regionId === 'alpha_gamma') regionLabel = 'Intercritical (α + γ)';
    else if (regionId === 'gamma_Fe3C') regionLabel = safeC < CONSTANTS.FE_C.C_AUSTENITE_MAX ? 'Austenite + Fe₃C' : 'Austenite + Ledeburite';
    else if (regionId === 'alpha_Fe3C') regionLabel = safeC < consts.C_EUTECTOID ? 'Hypoeutectoid (α + P)' : Math.abs(safeC-consts.C_EUTECTOID)<0.02 ? 'Eutectoid (Pearlite)' : safeC <= CONSTANTS.FE_C.C_AUSTENITE_MAX ? 'Hypereutectoid (P + Fe₃C)' : 'White Cast Iron';
    else if (regionId === 'L_Fe3C') regionLabel = 'Liquid + Fe₃C';

    return { 
      regionId, regionLabel, phaseFractions, microFractions, ...microState,
      msTemp: safeC < CONSTANTS.FE_C.C_AUSTENITE_MAX ? msTemp : null,
      mfTemp: safeC < CONSTANTS.FE_C.C_AUSTENITE_MAX ? mfTemp : null,
      bsTemp: safeC < CONSTANTS.FE_C.C_AUSTENITE_MAX ? bsTemp : null,
      ...this.predictProperties(alloyObj, safeT, phaseFractions, microFractions, microState, activeRate)
    };
  },

  predictProperties: function(alloy, T, phaseFractions, microFractions, microState, coolingRate) {
    let c = alloy.c;
    let fLiq = phaseFractions.find(f => f.name.includes('Liquid'))?.frac / 100 || 0;
    if (fLiq > 0.99) return { micro: 'Uniform Liquid Phase', crystal: 'Amorphous', yield: 0, uts: 0, hardness: { hv: 0, hrc: 0, hb: 0 }, elong: 100, grainSize: 0, fatigue: 0, dbtt: 0, paramA: 0, paramC: 0 };

    const getF = (n) => phaseFractions.find(f => f.name.includes(n))?.frac / 100 || 0;
    let fGamma = getF('Austenite'), fAlpha = getF('Ferrite'), fDelta = getF('Delta'), fMart = getF('Martensite');
    const consts = this.getAlloyAdjustedConstants(alloy);

    const effectiveT = T < consts.T_EUTECTOID ? consts.T_EUTECTOID : T;
    let grainSizeASTM = Math.max(1, 10 - Math.max(0, effectiveT - 700) / 150); 
    if (coolingRate > 5) grainSizeASTM += Math.min(4, coolingRate / 10); 
    if (microState.isQuenched) grainSizeASTM = Math.min(14, grainSizeASTM + 4);
    const d_mm = Math.pow(2, -(grainSizeASTM + 1)) * 25.4;

    const { mn, si, cr, ni, mo, cu, v } = alloy;
    const c_in_solution = microState.isQuenched ? c : Math.min(c, 0.022);
    const sigma_ss = (32 * mn) + (84 * si) + (38 * cu) + (11 * mo) + (15 * cr) + (600 * Math.sqrt(c_in_solution));

    const sigma_0 = 53.9; const k_y = 17.4; 
    const sigma_hp = k_y / Math.sqrt(d_mm);

    let hv_mart_safe = 0;
    if (microState.isQuenched || microState.isTempered) {
      hv_mart_safe = 127 + (949 * c) + (27 * si) + (11 * mn) + (8 * ni) + (16 * cr);
      if (v > 0.01) hv_mart_safe += 21 * Math.log10(v);
      hv_mart_safe = Math.max(100, hv_mart_safe);
    }

    let fPearlite = microFractions.find(f => f.name.includes('Pearlite'))?.frac / 100 || 0;
    if (fPearlite === 0 && !microState.isQuenched && !microState.isBainitic && !microState.isTempered && !microState.isMetastable && T < consts.T_EUTECTOID) {
       if (c < CONSTANTS.FE_C.C_FERRITE_MAX) fPearlite = 0;
       else if (c <= consts.C_EUTECTOID) fPearlite = (c - CONSTANTS.FE_C.C_FERRITE_MAX) / (consts.C_EUTECTOID - CONSTANTS.FE_C.C_FERRITE_MAX);
       else if (c <= CONSTANTS.FE_C.C_AUSTENITE_MAX) fPearlite = (CONSTANTS.FE_C.C_CEMENTITE - c) / (CONSTANTS.FE_C.C_CEMENTITE - consts.C_EUTECTOID);
       else fPearlite = Math.max(0, (6.67 - c) / (6.67 - 0.76) * (CONSTANTS.FE_C.C_AUSTENITE_MAX/c));
    }
    fPearlite = Math.max(0, Math.min(1, fPearlite));
    const formUndercooling = Math.max(10, 10 * Math.sqrt(Math.max(0.1, coolingRate || 1)));
    const S0_mm = 8.02e-4 / formUndercooling; 
    const sigma_pearlite = fPearlite > 0.01 ? fPearlite * (286 + 2.18 / Math.sqrt(S0_mm)) : 0;

    let fBainite = microFractions.find(f => f.name.includes('Bainite'))?.frac / 100 || 0;
    const sigma_bainite = (microState.isBainitic || fBainite > 0.01) ? (395 * Math.sqrt(c)) + (68 * mn) + (75 * si) + (15 * ni) + (183 * mo) : 0;

    const Tm_K = (CONSTANTS.FE_C.T_MELT + 273);
    const T_K = T + 273;
    const thermalFactor = T_K < 0.3 * Tm_K ? 1.0 : Math.exp(-3.5 * Math.pow((T_K - 0.3 * Tm_K) / (0.7 * Tm_K), 1.8));

    let yieldStr = (sigma_0 + sigma_ss + sigma_hp + sigma_pearlite + sigma_bainite) * thermalFactor;
    if (microState.isQuenched) yieldStr = (hv_mart_safe * 3.3) * thermalFactor; 
    if (microState.isTempered) yieldStr = (hv_mart_safe * 3.3 * 0.75) * thermalFactor; 
    if (T >= consts.T_EUTECTOID && !microState.isQuenched && !microState.isBainitic && !microState.isMetastable) {
       let baseHighT = (fGamma * 150) + (fDelta * 100);
       yieldStr = Math.max(yieldStr, baseHighT * thermalFactor);
    }

    const n_strain_harden = microState.isQuenched ? 0.05 : Math.max(0.05, 0.22 - (0.14 * c));
    const utsMultiplier = Math.pow(n_strain_harden / 0.002, n_strain_harden) * Math.exp(-n_strain_harden);
    let uts = yieldStr * utsMultiplier;
    uts = Math.max(yieldStr * 1.05, uts); 

    let elong = microState.isQuenched ? Math.max(1, 18 - (30 * c)) : Math.min(45, 10 + (50 * n_strain_harden));
    elong = elong * (1 + (1 - thermalFactor)); 

    let hv = microState.isQuenched ? hv_mart_safe : (yieldStr / 3.3);
    if (microState.isTempered) hv = hv_mart_safe * 0.8;
    hv = hv * thermalFactor;

    let fatigueLimit = T > 600 ? 0 : Math.min(uts * 0.5, 700);
    let dbtt = -50 + (c * 200) - (grainSizeASTM * 5) + (mn * -30) + (ni * -25) + (si * 44) + (cr * 10); 
    if (microState.isQuenched) dbtt += 150; 
    if (microState.isBainitic) dbtt -= 20; 
    if (microState.isTempered) dbtt -= 50; 

    let crystal = 'Mixed'; let a = 2.866, c_param = 2.866; 
    if (fGamma > 0.5 || microState.isMetastable) { crystal = 'FCC'; a = 3.56 + 0.03 * c; c_param = a; }
    else if (microState.isQuenched && (microState.martensiteFrac > 0.5 || fMart > 0.5)) { crystal = 'BCT'; a = 2.866 - 0.013 * c; c_param = 2.866 + 0.116 * c; }
    else if (fAlpha > 0.5 || fDelta > 0.5 || microState.isTempered || microState.isBainitic) { crystal = 'BCC'; a = 2.866; c_param = a; }

    let micro = 'Mixed Phase';
    if (microState.isTempered) micro = 'Tempered Martensite (α + Fe₃C)';
    else if (microState.isQuenched) micro = c < 0.6 ? `Lath Martensite + ${Math.round((1-(microState.martensiteFrac||1))*100)}% Ret. γ` : `Plate Martensite + ${Math.round((1-(microState.martensiteFrac||1))*100)}% Ret. γ`;
    else if (microState.isBainitic) micro = T > 400 ? 'Upper Bainite (Feathery)' : 'Lower Bainite (Acicular)';
    else if (microState.isMetastable) micro = 'Supercooled Austenite';
    else if (T > consts.T_EUTECTOID) {
      if (fDelta > 0.5) micro = 'Delta Ferrite Matrix';
      else if (fGamma > 0.5) micro = 'Austenitic Grains';
      else micro = 'High Temp Mixed Phase';
    } else {
      if (c < CONSTANTS.FE_C.C_FERRITE_MAX) micro = 'Equiaxed Ferrite';
      else if (Math.abs(c - consts.C_EUTECTOID) < 0.02) micro = '100% Pearlite (Lamellar)';
      else if (c < consts.C_EUTECTOID) micro = 'Proeutectoid Ferrite + Pearlite';
      else if (c <= CONSTANTS.FE_C.C_AUSTENITE_MAX) micro = 'Proeutectoid Cementite Network + Pearlite';
      else if (Math.abs(c - CONSTANTS.FE_C.C_EUTECTIC) < 0.05) micro = 'Ledeburite (Eutectic)';
      else micro = 'Primary Cementite + Transformed Ledeburite';
    }

    return { 
      micro, crystal, paramA: a, paramC: c_param,
      yield: Math.round(yieldStr), uts: Math.round(uts), hardness: convertHardness(hv), 
      elong: Math.round(elong), grainSize: Math.round(grainSizeASTM * 10) / 10,
      fatigue: Math.round(fatigueLimit), dbtt: Math.round(dbtt)
    };
  }
};

const NelderMead = {
  minimize: function(f, x0, options = {}) {
    const { maxIter = 200, tol = 1e-4, alpha = 1, beta = 0.5, gamma = 2 } = options;
    const n = x0.length;
    
    const clampComposition = (x) => [
      Math.max(0.01, Math.min(2.0, x[0])),  // C
      Math.max(0.1,  Math.min(2.0, x[1])),  // Mn
      Math.max(0.1,  Math.min(1.5, x[2])),  // Si
      Math.max(0,    Math.min(5.0, x[3])),  // Cr
      Math.max(0,    Math.min(4.0, x[4])),  // Ni
      Math.max(0,    Math.min(1.0, x[5])),  // Mo
    ];

    let simplex = [x0];
    const stepSizes = [0.15, 0.3, 0.2, 0.8, 0.8, 0.2]; 
    for (let i = 0; i < n; i++) {
      const vertex = [...x0]; vertex[i] = vertex[i] + stepSizes[i];
      simplex.push(clampComposition(vertex));
    }

    for (let iter = 0; iter < maxIter; iter++) {
      simplex.sort((a, b) => f(a) - f(b));
      const fBest = f(simplex[0]); const fWorst = f(simplex[n]);
      if (Math.abs(fWorst - fBest) < tol) break;

      const centroid = x0.map((_, j) => simplex.slice(0, n).reduce((sum, v) => sum + v[j], 0) / n);
      const xr = clampComposition(centroid.map((c, j) => c + alpha * (c - simplex[n][j])));
      
      if (f(xr) < f(simplex[n-1]) && f(xr) >= f(simplex[0])) { simplex[n] = xr; continue; }
      if (f(xr) < f(simplex[0])) {
        const xe = clampComposition(centroid.map((c, j) => c + gamma * (xr[j] - c)));
        simplex[n] = f(xe) < f(xr) ? xe : xr; continue;
      }
      const xc = clampComposition(centroid.map((c, j) => c + beta * (simplex[n][j] - c)));
      if (f(xc) < f(simplex[n])) { simplex[n] = xc; continue; }
      for (let i = 1; i <= n; i++) {
        simplex[i] = clampComposition(simplex[0].map((c, j) => c + beta * (simplex[i][j] - c)));
      }
    }
    const best = simplex[0];
    return { c: best[0], mn: best[1], si: best[2], cr: best[3], ni: best[4], mo: best[5] };
  }
};

const OptimizationEngine = {
  runInverseDesign: function(targets, baseAlloy) {
    let bestResults = [];
    const processes = [
      { name: 'Annealed', rate: CONSTANTS.RATES.ANNEAL, mode: 'anneal' },
      { name: 'Normalized', rate: CONSTANTS.RATES.NORMALIZE, mode: 'normalize' },
      { name: 'Quenched', rate: CONSTANTS.RATES.QUENCH, mode: 'quench' },
      { name: 'Quenched & Tempered', rate: CONSTANTS.RATES.QUENCH, mode: 'temper' }
    ];
    const startingPoints = [
      [0.20, 0.75, 0.25, 0.0, 0.0, 0.0], [0.40, 0.85, 0.25, 1.0, 0.0, 0.2], 
      [0.95, 0.40, 0.25, 0.0, 0.0, 0.0], [0.30, 1.50, 0.25, 0.0, 2.0, 0.0]
    ];

    processes.forEach(proc => {
      const maxRate = proc.mode === 'temper' ? CONSTANTS.RATES.QUENCH : proc.rate;
      const objectiveFunction = (x) => {
        const testAlloy = { c: x[0], mn: x[1], si: x[2], cr: x[3], ni: x[4], mo: x[5], v: baseAlloy.v || 0, cu: baseAlloy.cu || 0 };
        const state = ThermoEngine.getState(testAlloy, 20, 0, proc.mode, maxRate, 20);
        let loss = 0; let weightSum = 0;
        
        if (targets.hv.val > 0) { loss += targets.hv.weight * Math.pow((state.hardness.hv - targets.hv.val) / targets.hv.val, 2); weightSum += targets.hv.weight; }
        if (targets.yield.val > 0) { loss += targets.yield.weight * Math.pow((state.yield - targets.yield.val) / targets.yield.val, 2); weightSum += targets.yield.weight; }
        if (targets.uts.val > 0) { loss += targets.uts.weight * Math.pow((state.uts - targets.uts.val) / targets.uts.val, 2); weightSum += targets.uts.weight; }
        if (targets.elong.val > 0 && state.elong < targets.elong.val) { loss += (targets.elong.weight * 3) * Math.pow((targets.elong.val - state.elong) / targets.elong.val, 2); weightSum += targets.elong.weight; }
        return weightSum === 0 ? 9999 : loss / weightSum;
      };

      startingPoints.forEach(x0 => {
        const composition = NelderMead.minimize(objectiveFunction, x0);
        const testAlloy = { c: composition.c, mn: composition.mn, si: composition.si, cr: composition.cr, ni: composition.ni, mo: composition.mo, v: baseAlloy.v || 0, cu: baseAlloy.cu || 0 };
        const state = ThermoEngine.getState(testAlloy, 20, 0, proc.mode, maxRate, 20);
        const mse = objectiveFunction([composition.c, composition.mn, composition.si, composition.cr, composition.ni, composition.mo]);
        const rmse = Math.sqrt(mse);
        let matchScore = Math.max(0, 100 * Math.exp(-rmse * 4)); 
        bestResults.push({ alloy: testAlloy, process: proc.name, state: state, rmse: rmse, matchScore: matchScore, procMode: proc.mode });
      });
    });

    bestResults.sort((a, b) => b.matchScore - a.matchScore);
    let distinctResults = []; let seenConfigGroups = new Set();
    
    for (let res of bestResults) {
        let configKey = `${Math.round(res.alloy.c * 10) / 10}_${Math.round(res.alloy.cr * 2) / 2}_${Math.round(res.alloy.ni * 2) / 2}`;
        if (!seenConfigGroups.has(configKey)) {
            seenConfigGroups.add(configKey); distinctResults.push(res);
        }
        if (distinctResults.length >= 3) break;
    }
    return distinctResults;
  }
};

const ExportEngine = {
  downloadBlob: (content, type, filename) => {
    const blob = new Blob([content], { type }); const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
  },
  generateTXT: (alloy, temp, mode, state, weldStatus) => {
    const timestamp = new Date().toISOString();
    let fracStr = state.phaseFractions.map(f => `- ${f.name}: ${f.frac.toFixed(1)}%`).join('\n');
    let microStr = state.microFractions.map(f => `- ${f.name}: ${f.frac.toFixed(1)}%`).join('\n');
    return `ABAJIS-SteelLab Analytical Report\nGenerated: ${timestamp}\nVersion: ${APP_VERSION}\n\n====================================================\nCOMPOSITION & THERMAL STATE\n====================================================\nCarbon Content   : ${alloy.c.toFixed(3)} wt%\nAlloying Elements: Mn:${alloy.mn.toFixed(2)}% Si:${alloy.si.toFixed(2)}% Cr:${alloy.cr.toFixed(2)}% Ni:${alloy.ni.toFixed(2)}% Mo:${alloy.mo.toFixed(2)}% V:${alloy.v.toFixed(2)}% Cu:${alloy.cu.toFixed(2)}%\nTemperature      : ${temp.toFixed(1)} °C\nProcessing Mode  : ${mode.toUpperCase()}\nPhase Region     : ${state.regionLabel}\nState            : ${state.isQuenched ? 'Martensitic Transformation' : state.isBainitic ? 'Bainitic Transformation' : 'Equilibrium / Near-Equilibrium'}\n\n====================================================\nPHASE CONSTITUTION (Thermodynamic)\n====================================================\n${fracStr}\n\n====================================================\nMICROCONSTITUENTS (Morphological)\n====================================================\n${microStr}\nCrystal Structure: ${state.crystal}\nLattice Param a  : ${state.paramA.toFixed(4)} Å\nLattice Param c  : ${state.paramC.toFixed(4)} Å\nASTM Grain Size  : G${state.grainSize.toFixed(1)}\n\n====================================================\nMECHANICAL PREDICTIONS (at T=${temp.toFixed(0)}°C)\n====================================================\nYield Strength   : ${state.yield} MPa\nUlt. Tensile Str : ${state.uts} MPa\nFatigue Limit    : ${state.fatigue} MPa\nHardness         : ${state.hardness.hv} HV / ${state.hardness.hrc > 0 ? state.hardness.hrc + ' HRC' : state.hardness.hb + ' HB'}\nElongation       : ${state.elong}%\nDBTT             : ${state.dbtt} °C\n\n====================================================\nWELDABILITY (IIW Carbon Equivalent Model)\n====================================================\nRating           : ${weldStatus.rating}\nC.E. Value       : ${weldStatus.ce}\nNotes            : ${weldStatus.desc}\n`.trim();
  },
  generateCSV: (alloy, temp, state, snapshots) => {
    const headers = "Source,C_wt%,Mn_wt%,Si_wt%,Cr_wt%,Ni_wt%,Mo_wt%,V_wt%,Cu_wt%,Temperature_C,Yield_MPa,UTS_MPa,Hardness_HV,Elongation_%,DBTT_C,Crystal,Microstructure\n";
    let content = headers + `Current,${alloy.c.toFixed(3)},${alloy.mn.toFixed(2)},${alloy.si.toFixed(2)},${alloy.cr.toFixed(2)},${alloy.ni.toFixed(2)},${alloy.mo.toFixed(2)},${alloy.v.toFixed(2)},${alloy.cu.toFixed(2)},${temp.toFixed(1)},${state.yield},${state.uts},${state.hardness.hv},${state.elong},${state.dbtt},${state.crystal},"${state.micro}"\n`;
    if (snapshots && snapshots.length > 0) {
      snapshots.forEach((s, i) => { 
        let a = s.alloy || { c: s.c, mn: 0.5, si: 0.2, cr: 0, ni: 0, mo: 0, v: 0, cu: 0 };
        content += `Snapshot_${i+1},${a.c.toFixed(3)},${a.mn.toFixed(2)},${a.si.toFixed(2)},${a.cr.toFixed(2)},${a.ni.toFixed(2)},${a.mo.toFixed(2)},${a.v.toFixed(2)},${a.cu.toFixed(2)},${s.t.toFixed(1)},${s.state.yield},${s.state.uts},${s.state.hv},${s.state.elong},${s.state.dbtt},${s.state.crystal},"${s.state.micro}"\n`; 
      });
    }
    return content;
  }
};

// ============================================================================
// MODULE: CUSTOM HOOKS
// ============================================================================

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(initialValue);
  return [storedValue, setStoredValue];
};

const useEphemeralMessage = (duration = 2000) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);
  const trigger = useCallback(() => {
    setIsVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(false), duration);
  }, [duration]);
  useEffect(() => () => clearTimeout(timeoutRef.current), []);
  return [isVisible, trigger];
};

const useHeatTreatment = (temp, carbon, setTemp) => {
  const [mode, setMode] = useState('manual');
  const [coolingRate, setCoolingRate] = useState(0);
  const [maxRate, setMaxRate] = useState(0);
  const [historyTrail, setHistoryTrail] = useState([]);
  const simRef = useRef({ t: parseNum(temp, 20), c: parseNum(carbon, 0), phase: 'idle', timer: 0 });

  useEffect(() => {
    if (mode === 'manual') {
      simRef.current.t = parseNum(temp, 20); simRef.current.c = parseNum(carbon, 0);
      if (simRef.current.t >= CONSTANTS.FE_C.T_EUTECTOID) setMaxRate(0);
    }
  }, [temp, carbon, mode]);

  const changeMode = useCallback((newMode, keepHistory = false) => {
    if (newMode === 'manual' && !keepHistory) { setHistoryTrail([]); setMaxRate(0); }
    if (['anneal', 'normalize'].includes(newMode)) setMaxRate(0);
    setMode(newMode);
  }, []);

  useEffect(() => {
    if (['anneal', 'normalize', 'quench', 'temper'].includes(mode)) {
      let reqId; let lastTime = performance.now(); let lastRenderTime = performance.now(); let simTime = 0; 
      const TARGET_COOL = 20; const TARGET_TEMPER = 500; const AUSTENITE_TEMP = 900;

      if (mode === 'temper') simRef.current.phase = 'heating';
      else simRef.current.phase = simRef.current.t < 800 ? 'heating_to_austenitize' : 'cooling';

      const rateMagnitude = mode === 'anneal' ? CONSTANTS.RATES.ANNEAL : mode === 'normalize' ? CONSTANTS.RATES.NORMALIZE : mode === 'quench' ? CONSTANTS.RATES.QUENCH : 100;
      setHistoryTrail(prev => prev.length === 0 ? [{ c: simRef.current.c, t: simRef.current.t, time: 0 }] : prev);

      const animateStep = (time) => {
        const dt = Math.min((time - lastTime) / 1000, 0.1); lastTime = time;
        let { t: currentT, phase } = simRef.current; let displayRate = 0; let isDone = false;

        if (phase === 'heating_to_austenitize') {
          displayRate = -250; currentT += Math.abs(displayRate) * dt * 3; simTime += dt * 3;
          if (currentT >= AUSTENITE_TEMP) { currentT = AUSTENITE_TEMP; simRef.current.phase = 'cooling'; }
        } else if (phase === 'heating') {
          displayRate = -150; currentT += Math.abs(displayRate) * dt * 2; simTime += dt * 2;
          if (currentT >= TARGET_TEMPER) { currentT = TARGET_TEMPER; simRef.current.phase = 'holding'; simRef.current.timer = 1.0; }
        } else if (phase === 'holding') {
          displayRate = 0; simRef.current.timer -= dt; simTime += dt;
          if (simRef.current.timer <= 0) simRef.current.phase = 'cooling';
        } else if (phase === 'cooling') {
          let actualRate = rateMagnitude;
          if ((mode === 'anneal' || mode === 'normalize') && ((currentT > 700 && currentT < 740) || (currentT > 1130 && currentT < 1160))) actualRate = Math.max(1, rateMagnitude / 3);
          displayRate = actualRate;
          let timeMultiplier = mode === 'anneal' ? 40 : mode === 'normalize' ? 20 : mode === 'quench' ? 4 : 20;
          currentT -= actualRate * dt * timeMultiplier; simTime += dt * timeMultiplier;
          if (currentT <= TARGET_COOL) { currentT = TARGET_COOL; isDone = true; }
        }

        simRef.current.t = currentT;

        if (time - lastRenderTime > 33 || isDone) {
          setTemp(Math.round(currentT).toString());
          setCoolingRate(displayRate > 0 ? displayRate : 0);
          if (displayRate > 0) setMaxRate(prev => Math.max(prev, displayRate));
          setHistoryTrail(prev => {
              const last = prev[prev.length - 1];
              if (last && Math.abs(last.t - currentT) < 2 && !isDone) return prev;
              return [...prev.slice(-300), { c: simRef.current.c, t: currentT, time: simTime }];
          });
          lastRenderTime = time;
        }

        if (isDone) { changeMode('manual', true); setCoolingRate(0); return; }
        reqId = requestAnimationFrame(animateStep);
      };
      reqId = requestAnimationFrame(animateStep); return () => cancelAnimationFrame(reqId);
    } else { setCoolingRate(0); }
  }, [mode, setTemp, changeMode]); 

  return { mode, changeMode, coolingRate, maxRate, historyTrail };
};

const useDiagramInteractions = (svgRef, alloy, carbon, temp, setCarbon, setTemp, changeMode, maxC, geometry) => {
  const [isDragging, setIsDragging] = useState(false);
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);

  const getCoords = useCallback((e) => {
    if (!svgRef.current) return { c: 0, t: 20 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = geometry.w / rect.width; const scaleY = geometry.h / rect.height;
    let clientX = e.clientX; let clientY = e.clientY;
    
    if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
    else if (e.changedTouches && e.changedTouches.length > 0) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }

    let c = maxC === 0 ? geometry.m.left : ((clientX - rect.left) * scaleX - geometry.m.left) / geometry.innerW * maxC;
    let t = CONSTANTS.FE_C.T_MAX - ((clientY - rect.top) * scaleY - geometry.m.top) / geometry.innerH * CONSTANTS.FE_C.T_MAX;
    return { c: Math.max(0, Math.min(maxC, c)), t: Math.max(0, Math.min(CONSTANTS.FE_C.T_MAX, t)) };
  }, [svgRef, maxC, geometry]); 

  const snapToCritical = useCallback((c, t) => {
      let snapC = c; let snapT = t;
      if (Math.abs(c - consts.C_EUTECTOID) < 0.05) snapC = consts.C_EUTECTOID;
      else if (Math.abs(c - CONSTANTS.FE_C.C_EUTECTIC) < 0.1) snapC = CONSTANTS.FE_C.C_EUTECTIC;
      else if (Math.abs(c - CONSTANTS.FE_C.C_AUSTENITE_MAX) < 0.05) snapC = CONSTANTS.FE_C.C_AUSTENITE_MAX;
      
      if (Math.abs(t - consts.T_EUTECTOID) < 15) snapT = consts.T_EUTECTOID;
      else if (Math.abs(t - CONSTANTS.FE_C.T_EUTECTIC) < 15) snapT = CONSTANTS.FE_C.T_EUTECTIC;
      else if (c < consts.C_EUTECTOID) {
          const dynamicA3Temp = consts.T_A3_PURE - (consts.T_A3_PURE - consts.T_EUTECTOID) * Math.pow(c / consts.C_EUTECTOID, 1/0.9); 
          if (Math.abs(t - dynamicA3Temp) < 15) snapT = dynamicA3Temp;
      } else if (c >= consts.C_EUTECTOID && c <= CONSTANTS.FE_C.C_AUSTENITE_MAX) {
          const dynamicAcmTemp = consts.T_EUTECTOID + (CONSTANTS.FE_C.T_EUTECTIC - consts.T_EUTECTOID) * Math.pow((c - consts.C_EUTECTOID) / (CONSTANTS.FE_C.C_AUSTENITE_MAX - consts.C_EUTECTOID), 1/1.4);
          if (Math.abs(t - dynamicAcmTemp) < 15) snapT = dynamicAcmTemp;
      } else if (Math.abs(t - consts.T_A3_PURE) < 15) snapT = consts.T_A3_PURE;
      return { c: snapC, t: snapT };
  }, [consts]);

  const updatePosition = useCallback((e, snap = false) => {
      let { c, t } = getCoords(e);
      if (snap) { const snapped = snapToCritical(c, t); c = snapped.c; t = snapped.t; }
      setCarbon(c.toFixed(3)); setTemp(Math.round(t).toString());
  }, [getCoords, snapToCritical, setCarbon, setTemp]);

  const onPointerDown = useCallback((e) => { 
    if(e.target.setPointerCapture && e.pointerId) e.target.setPointerCapture(e.pointerId); 
    setIsDragging(true); changeMode('manual', true); updatePosition(e, true); 
  }, [updatePosition, changeMode]);
  
  const onPointerMove = useCallback((e) => { if (!isDragging) return; updatePosition(e, e.shiftKey); }, [isDragging, updatePosition]);
  const onPointerUp = useCallback((e) => { 
    if (e.target.hasPointerCapture && e.pointerId) e.target.releasePointerCapture(e.pointerId); 
    setIsDragging(false); 
  }, []);

  return { isDragging, onPointerDown, onPointerMove, onPointerUp };
};


// ============================================================================
// COMPONENT SECTIONS
// ============================================================================
const ThermoStateContext = createContext();
const ThermoActionContext = createContext();
const useThermoState = () => useContext(ThermoStateContext);
const useThermoAction = () => useContext(ThermoActionContext);

const ThermoProvider = ({ children }) => {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialC = parseNum(urlParams.get('c'), 0.40);
  const initialT = parseNum(urlParams.get('t'), CONSTANTS.FE_C.T_MAX);

  const [alloy, setAlloy] = useState({ c: initialC, mn: 0.50, si: 0.20, cr: 0.0, ni: 0.0, mo: 0.0, v: 0.0, cu: 0.0 });
  const carbon = alloy.c.toString();
  const setCarbon = useCallback((val) => { setAlloy(prev => ({...prev, c: parseNum(typeof val === 'function' ? val(prev.c) : val, 0)})); }, []);
  const [temp, setTemp] = useState(initialT.toString());
  const [phaseFlash, setPhaseFlash] = useState({ active: false, color: 'transparent' });
  const [isPending, startTransition] = useTransition();
  const svgRef = useRef(null);
  
  const [isDark, setIsDark] = useLocalStorage('abajis_isDark_pro', true);
  const [snapshots, setSnapshots] = useLocalStorage('abajis_snapshots', []); 
  const [etchant, setEtchant] = useLocalStorage('abajis_etchant', 'nital');
  const [zoomSteel, setZoomSteel] = useState(false);
  const [showWeldability, setShowWeldability] = useLocalStorage('abajis_weld_overlay', false);
  
  const [guidedScenarioId, setGuidedScenarioId] = useState(null);
  const [guidedStep, setGuidedStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useLocalStorage('abajis_tour_v3', false);
  const [tourStep, setTourStep] = useState(0);
  const isTourActive = !hasSeenTour && tourStep >= 0;
  
  const prevTempRef = useRef(initialT);
  const lowestTempRef = useRef(initialT);
  const { mode, changeMode, coolingRate, maxRate, historyTrail } = useHeatTreatment(temp, carbon, setTemp);

  const currentT = parseNum(temp, 20);
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);
  let effectiveLowestTemp = currentT > consts.T_EUTECTOID ? currentT : Math.min(lowestTempRef.current, currentT);

  const playPhaseSound = useCallback((type) => {
      try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = type === 'austenite' ? 'sine' : 'triangle';
          const freq = type === 'austenite' ? 880 : 440;

          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.98, ctx.currentTime + 0.3);

          filter.type = 'bandpass';
          filter.frequency.value = freq;
          filter.Q.value = 10;

          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.5);
      } catch(e) { /* Audio context not ready or disabled */ }
  }, []);

  useEffect(() => {
    lowestTempRef.current = effectiveLowestTemp;
    const prevTemp = prevTempRef.current; prevTempRef.current = currentT;
    
    if (Math.abs(prevTemp - currentT) < 0.1) return; 
    
    if ((prevTemp > consts.T_EUTECTOID && currentT <= consts.T_EUTECTOID) || (prevTemp < consts.T_EUTECTOID && currentT >= consts.T_EUTECTOID) || (prevTemp > consts.T_A3_PURE && currentT <= consts.T_A3_PURE) || (prevTemp < consts.T_A3_PURE && currentT >= consts.T_A3_PURE)) {
        
        let flashColor = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)'; 
        let phaseType = 'ferrite';

        if (currentT > consts.T_A3_PURE) {
            flashColor = isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.15)'; 
            phaseType = 'austenite';
        }

        setPhaseFlash({ active: true, color: flashColor });
        playPhaseSound(phaseType);
        setTimeout(() => setPhaseFlash({ active: false, color: 'transparent' }), 400);
    }
  }, [currentT, effectiveLowestTemp, consts, isDark, playPhaseSound]);

  const activeGrade = useMemo(() => STEEL_GRADES.find(g => Math.abs(g.c - alloy.c) < 0.01 && Math.abs(g.mn - alloy.mn) < 0.1 && Math.abs(g.cr - alloy.cr) < 0.1), [alloy]);
  const weldStatus = useMemo(() => getWeldability(alloy), [alloy, activeGrade]);
  const simState = useMemo(() => ThermoEngine.getState(alloy, currentT, coolingRate, mode, maxRate, effectiveLowestTemp, historyTrail), [alloy, currentT, coolingRate, mode, maxRate, effectiveLowestTemp, historyTrail]);
  
  const maxC = zoomSteel ? 2.5 : CONSTANTS.FE_C.C_CEMENTITE;
  const geometry = useMemo(() => {
    const w = 850, h = 650; const m = { top: 40, right: 60, bottom: 80, left: 70 };
    return { w, h, m, innerW: w - m.left - m.right, innerH: h - m.top - m.bottom, mapX: (c) => m.left + (Math.min(c, maxC) / maxC) * (w - m.left - m.right), mapY: (t) => m.top + (h - m.top - m.bottom) - (t / CONSTANTS.FE_C.T_MAX) * (h - m.top - m.bottom) };
  }, [maxC]);

  const PHASE_COLORS = useMemo(() => ({
    austenite: isDark ? '#fbbf24' : '#d97706', 
    ferrite: isDark ? '#94a3b8' : '#64748b',   
    cementite: isDark ? '#1e293b' : '#334155', 
    martensite: isDark ? '#a855f7' : '#9333ea',
    bainite: isDark ? '#10b981' : '#059669',   
    pearlite: isDark ? '#64748b' : '#475569',  
    liquid: isDark ? '#f97316' : '#ea580c',    
    delta: isDark ? '#cbd5e1' : '#94a3b8'      
  }), [isDark]);

  const theme = useMemo(() => ({
    bg: isDark ? 'bg-[#0f1115]' : 'bg-[#e2e4e9]', 
    panelBg: isDark ? 'bg-[#181a20] border-[#2a2d35]' : 'bg-[#f4f5f8] border-[#caced4]', 
    textMain: isDark ? 'text-slate-200' : 'text-slate-800', 
    textMuted: isDark ? 'text-slate-400' : 'text-slate-600', 
    diagramBgClass: isDark ? 'bg-[#0b0c0f]' : 'bg-white',
    colors: PHASE_COLORS,
    btnPrimary: 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    btnSecondary: isDark ? 'bg-[#181a20] border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
  }), [isDark, PHASE_COLORS]);

  const handleAlloyChange = useCallback((elem, val) => { changeMode('manual', true); setAlloy(prev => ({...prev, [elem]: parseNum(val, 0)})); }, [changeMode, setAlloy]);

  const stateValue = useMemo(() => ({ alloy, carbon, temp, simState, coolingRate, maxRate, historyTrail, activeGrade, weldStatus, phaseFlash, isPending, guidedScenarioId, guidedStep, isTourActive, tourStep }), [alloy, carbon, temp, simState, coolingRate, maxRate, historyTrail, activeGrade, weldStatus, phaseFlash, isPending, guidedScenarioId, guidedStep, isTourActive, tourStep]);
  const actionValue = useMemo(() => ({ alloy, setAlloy, handleAlloyChange, setCarbon, setTemp, isDark, setIsDark, zoomSteel, setZoomSteel, showWeldability, setShowWeldability, snapshots, setSnapshots, etchant, setEtchant, mode, changeMode, maxC, geometry, theme, svgRef, startTransition, setGuidedScenarioId, setGuidedStep, setTourStep, setHasSeenTour, startTour: () => { setHasSeenTour(false); setTourStep(0); } }), [alloy, setAlloy, handleAlloyChange, setCarbon, setTemp, isDark, setIsDark, zoomSteel, setZoomSteel, showWeldability, setShowWeldability, snapshots, setSnapshots, etchant, setEtchant, mode, changeMode, maxC, geometry, theme, svgRef, setGuidedScenarioId, setGuidedStep, setTourStep, setHasSeenTour]);

  return (
    <ThermoStateContext.Provider value={stateValue}>
      <ThermoActionContext.Provider value={actionValue}>
        {children}
      </ThermoActionContext.Provider>
    </ThermoStateContext.Provider>
  );
};

const SmartAssistant = React.memo(() => {
  const { carbon, temp, simState: state } = useThermoState();
  const cNum = parseNum(carbon, 0); const tNum = parseNum(temp, 20);

  const getAdvice = () => {
    if (tNum > CONSTANTS.FE_C.T_MELT) return { type: 'warn', msg: `T > Melting Point (${CONSTANTS.FE_C.T_MELT}°C). Material is completely molten.` };
    if (tNum > 1400 && cNum > 2.0) return { type: 'warn', msg: "Approaching liquidus. Material structural integrity compromised." };
    if (tNum < 0) return { type: 'warn', msg: "Cryogenic Range: Impact toughness decreased. Risk of brittle fracture." };
    if (state.isQuenched && !state.isTempered) return { type: 'warn', msg: `Untempered Martensite detected. Highly stressed/brittle. Temper immediately. M_s: ${Math.round(state.msTemp)}°C.` };
    if (state.isTempered) return { type: 'tip', msg: "Tempered Martensite: Optimal balance of toughness and hardness achieved." };
    if (state.isBainitic) return { type: 'tip', msg: "Bainitic Structure: High strength formed without extreme brittleness." };
    if (state.isMetastable) return { type: 'tip', msg: `Supercooled Austenite active. M_s occurs at ${Math.round(state.msTemp)}°C.` };
    if (state.regionId === 'gamma') return { type: 'tip', msg: "Austenite Field: Ready for heat treatment processing." };
    if (Math.abs(cNum - CONSTANTS.FE_C.C_EUTECTOID) < 0.05 && tNum < CONSTANTS.FE_C.T_EUTECTOID) return { type: 'tip', msg: "Eutectoid Composition: Forms 100% Pearlite for excellent strength-to-wear." };
    if (cNum > CONSTANTS.FE_C.C_AUSTENITE_MAX) return { type: 'info', msg: "Cast Iron Range: Excellent castability, but brittle." };
    if (cNum < 0.2) return { type: 'info', msg: "Low Carbon Steel: Excellent weldability, poor quench-hardenability." };
    return { type: 'info', msg: "Equilibrium thermodynamic state. Adjust parameters to initiate phase transformations." };
  };

  const advice = getAdvice();
  const styles = {
    warn: "border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]",
    info: "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]",
    tip: "border-[#10b981] bg-[#10b981]/10 text-[#10b981]"
  };
  const Icon = advice.type === 'warn' ? AlertTriangle : advice.type === 'tip' ? Lightbulb : Info;

  return (
    <div className={cn("mt-6 p-4 rounded-sm border-l-4 border-y border-r flex items-start gap-4", styles[advice.type])}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>
        <h4 className="font-display text-xs mb-1 opacity-80 uppercase tracking-widest">System Analysis</h4>
        <p className="font-data text-xs leading-snug">{advice.msg}</p>
      </div>
    </div>
  );
});

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, errorMessage: '' }; }
  static getDerivedStateFromError(error) { return { hasError: true, errorMessage: error.message }; }
  componentDidCatch(error, errorInfo) { console.error("Simulation error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 border-2 border-red-500 bg-[#1a0f0f] text-red-500 rounded-sm flex flex-col items-center justify-center text-center h-screen font-data">
          <AlertTriangle size={48} className="mb-4" />
          <h2 className="text-xl font-display mb-2 tracking-widest">SYSTEM FAULT</h2>
          <p className="text-sm opacity-80 mb-2">Thermodynamic state encountered an unexpected parameter.</p>
          <p className="text-xs opacity-80 mb-6 max-w-md">{this.state.errorMessage}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-sm font-bold uppercase tracking-widest hover:bg-red-500 transition-colors">Restart Sequence</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const WeldabilityOverlay = React.memo(() => {
  const { alloy } = useThermoState();
  const { geometry, maxC, isDark, showWeldability } = useThermoAction();
  if (!showWeldability) return null;

  const K = (alloy.mn / 6) + ((alloy.cr + alloy.mo + alloy.v) / 5) + ((alloy.ni + alloy.cu) / 15);
  const cExc = 0.35 - K; const cFair = 0.50 - K;
  const { mapX, m, innerH } = geometry;
  const x0 = mapX(0); const xMax = mapX(maxC);
  const xExcClamped = mapX(Math.max(0, Math.min(maxC, cExc)));
  const xFairClamped = mapX(Math.max(0, Math.min(maxC, cFair)));

  return (
    <g className="weldability-overlay">
      <g opacity={isDark ? "0.15" : "0.1"}>
        {cExc > 0 && <rect x={x0} y={m.top} width={xExcClamped - x0} height={innerH} fill="#10b981" style={{ transition: 'all 0.3s ease-out' }} />}
        {cFair > 0 && cExc < maxC && <rect x={xExcClamped} y={m.top} width={Math.max(0, xFairClamped - xExcClamped)} height={innerH} fill="#f59e0b" style={{ transition: 'all 0.3s ease-out' }} />}
        {cFair < maxC && <rect x={xFairClamped} y={m.top} width={xMax - xFairClamped} height={innerH} fill="#ef4444" style={{ transition: 'all 0.3s ease-out' }} />}
      </g>
      {cExc > 0 && cExc <= maxC && (
        <g opacity="0.8" style={{ transition: 'all 0.3s ease-out' }} transform={`translate(${mapX(cExc)}, 0)`}>
          <line x1={0} y1={m.top} x2={0} y2={geometry.h - m.bottom} stroke="#10b981" strokeWidth="2.5" strokeDasharray="4,4" />
          <text x={0} y={m.top + 15} fill="#10b981" className="font-data font-bold text-[10px]" transform={`rotate(-90 0 ${m.top + 15})`} dy="-6">CE=0.35(Exc)</text>
        </g>
      )}
      {cFair > 0 && cFair <= maxC && (
        <g opacity="0.8" style={{ transition: 'all 0.3s ease-out' }} transform={`translate(${mapX(cFair)}, 0)`}>
          <line x1={0} y1={m.top} x2={0} y2={geometry.h - m.bottom} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4,4" />
          <text x={0} y={m.top + 15} fill="#f59e0b" className="font-data font-bold text-[10px]" transform={`rotate(-90 0 ${m.top + 15})`} dy="-6">CE=0.50(Fair)</text>
        </g>
      )}
    </g>
  );
});

const DiagramSkeleton = React.memo(() => {
  const { alloy } = useThermoState();
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);
  const { geometry, maxC, isDark, zoomSteel, theme } = useThermoAction();
  const { mapX, mapY, m, w, h } = geometry;
  const strokeMain = isDark ? '#475569' : '#94a3b8';
  const strokeGrid = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const textMain = isDark ? 'text-slate-300' : 'text-slate-700';

  const dynamicA1 = consts.T_EUTECTOID; const dynamicA3 = consts.T_A3_PURE; const dynamicC1 = consts.C_EUTECTOID;
  const { colors } = theme;

  const getPts = useCallback((fn, tS, tE, steps = 30) => {
    let pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = tS + (tE - tS) * (i / steps);
      pts.push(`${mapX(fn(t))},${mapY(t)}`);
    }
    return pts;
  }, [mapX, mapY]);

  const fills = useMemo(() => {
    const polyGamma = [...getPts(()=>0, 912, 1394), ...getPts(t => PTS.PERI_G.c * (t - 1394)/(1495 - 1394), 1394, 1495), ...getPts(ThermoEngine.c_solidus, 1495, 1147), ...getPts(t => ThermoEngine.c_acm(t, consts), 1147, dynamicA1), ...getPts(t => ThermoEngine.c_a3(t, consts), dynamicA1, 912)].join(' ');
    const polyAlpha = [...getPts(()=>0, 20, 912), ...getPts(t => ThermoEngine.c_alpha(t, consts), 912, dynamicA1), ...getPts(t => ThermoEngine.c_alpha(t, consts), dynamicA1, 20)].join(' ');
    const polyAlphaGamma = [...getPts(t => ThermoEngine.c_alpha(t, consts), dynamicA1, 912), ...getPts(t => ThermoEngine.c_a3(t, consts), 912, dynamicA1)].join(' ');
    const polyGammaFe3C = [...getPts(t => ThermoEngine.c_acm(t, consts), dynamicA1, 1147), `${mapX(maxC)},${mapY(1147)}`, `${mapX(maxC)},${mapY(dynamicA1)}`].join(' ');
    const polyPearlFe3C = [...getPts(t => ThermoEngine.c_alpha(t, consts), 20, dynamicA1), `${mapX(maxC)},${mapY(dynamicA1)}`, `${mapX(maxC)},${mapY(20)}`].join(' ');
    const polyLiquidGamma = [...getPts(ThermoEngine.c_solidus, 1495, 1147), `${mapX(4.3)},${mapY(1147)}`, ...getPts(ThermoEngine.c_liquidus, 1147, 1495)].join(' ');
    const polyLiquidFe3C = [...getPts(ThermoEngine.c_l_fe3c, 1147, 1391), `${mapX(maxC)},${mapY(1391)}`, `${mapX(maxC)},${mapY(1147)}`].join(' ');
    const polyLiquid = [`${mapX(0)},${mapY(1538)}`, `${mapX(0)},${mapY(1600)}`, `${mapX(maxC)},${mapY(1600)}`, `${mapX(maxC)},${mapY(1391)}`, ...getPts(ThermoEngine.c_l_fe3c, 1391, 1147), ...getPts(ThermoEngine.c_liquidus, 1147, 1495), `${mapX(0.09)},${mapY(1495)}`, `${mapX(0.53)},${mapY(1495)}`].join(' ');
    const polyDelta = [`${mapX(0)},${mapY(1394)}`, `${mapX(0)},${mapY(1538)}`, `${mapX(0.09)},${mapY(1495)}`].join(' ');

    return { polyGamma, polyAlpha, polyAlphaGamma, polyGammaFe3C, polyPearlFe3C, polyLiquidGamma, polyLiquidFe3C, polyLiquid, polyDelta };
  }, [getPts, maxC, mapX, mapY, dynamicA1, consts]);

  const paths = useMemo(() => {
    const genC = (fn, tS, tE) => {
      let p = ''; const step = (tE - tS) / 40;
      for (let i = 0; i <= 40; i++) { const t = tS + i * step; p += i === 0 ? `M ${mapX(fn(t))},${mapY(t)} ` : `L ${mapX(fn(t))},${mapY(t)} `; }
      return p;
    };
    return {
      periL: `M ${mapX(PTS.MELT.c)},${mapY(PTS.MELT.t)} L ${mapX(PTS.PERI_L.c)},${mapY(PTS.PERI_L.t)}`, periS: `M ${mapX(PTS.MELT.c)},${mapY(PTS.MELT.t)} L ${mapX(PTS.PERI_S.c)},${mapY(PTS.PERI_S.t)}`,
      periN1: `M ${mapX(PTS.N.c)},${mapY(PTS.N.t)} L ${mapX(PTS.PERI_S.c)},${mapY(PTS.PERI_S.t)}`, periN2: `M ${mapX(PTS.N.c)},${mapY(PTS.N.t)} L ${mapX(PTS.PERI_G.c)},${mapY(PTS.PERI_G.t)}`,
      solidus: genC(ThermoEngine.c_solidus, PTS.PERI_G.t, PTS.EUTEC_G.t), liquidus: genC(ThermoEngine.c_liquidus, PTS.PERI_L.t, PTS.EUTEC_L.t),
      lFe3C: genC(ThermoEngine.c_l_fe3c, PTS.EUTEC_L.t, 1250), a3: genC((t) => ThermoEngine.c_a3(t, consts), dynamicA3, dynamicA1),
      acm: genC((t) => ThermoEngine.c_acm(t, consts), PTS.EUTEC_G.t, dynamicA1), alpha1: genC((t) => ThermoEngine.c_alpha(t, consts), dynamicA3, dynamicA1), alpha2: genC((t) => ThermoEngine.c_alpha(t, consts), dynamicA1, PTS.ROOM_A.t)
    };
  }, [mapX, mapY, consts, dynamicA1, dynamicA3]);

  return (
    <>
      <g stroke={strokeGrid} strokeWidth="1">
        {(zoomSteel ? [0.5, 1.0, 1.5, 2.0] : [1,2,3,4,5,6]).map(c => <line key={`vg-${c}`} x1={mapX(c)} y1={m.top} x2={mapX(c)} y2={h - m.bottom} />)}
        {[400,800,1200,1600].map(t => <line key={`hg-${t}`} x1={m.left} y1={mapY(t)} x2={w - m.right} y2={mapY(t)} />)}
      </g>

      <g clipPath="url(#graphClip)">
        <clipPath id="graphClip"><rect x={m.left} y={m.top} width={geometry.innerW} height={geometry.innerH} /></clipPath>
        
        <g opacity={isDark ? "0.2" : "0.15"} className="transition-spring">
           <polygon points={fills.polyGamma} fill={colors.austenite} />
           <polygon points={fills.polyAlpha} fill={colors.ferrite} />
           <polygon points={fills.polyLiquid} fill={colors.liquid} />
           <polygon points={fills.polyDelta} fill={colors.delta} />
           <polygon points={fills.polyAlphaGamma} fill={colors.ferrite} opacity="0.5" />
           <polygon points={fills.polyGammaFe3C} fill={colors.cementite} opacity="0.5" />
           <polygon points={fills.polyPearlFe3C} fill={colors.pearlite} opacity="0.5" />
           <polygon points={fills.polyLiquidGamma} fill={colors.liquid} opacity="0.5" />
           <polygon points={fills.polyLiquidFe3C} fill={colors.cementite} opacity="0.5" />
        </g>

        <g className="pointer-events-none transition-spring" stroke={strokeMain} strokeWidth="2.5" fill="none" strokeLinecap="square" strokeLinejoin="miter">
          <path d={paths.periL} /><path d={paths.periS} /><path d={paths.periN1} /><path d={paths.periN2} /><path d={paths.solidus} /><path d={paths.liquidus} /><path d={paths.lFe3C} /><path d={paths.a3} /><path d={paths.acm} /><path d={paths.alpha1} /><path d={paths.alpha2} />
          <line x1={mapX(PTS.PERI_S.c)} y1={mapY(PTS.PERI_S.t)} x2={mapX(PTS.PERI_L.c)} y2={mapY(PTS.PERI_L.t)} /> 
          <line x1={mapX(PTS.EUTEC_G.c)} y1={mapY(PTS.EUTEC_G.t)} x2={mapX(PTS.EUTEC_C.c)} y2={mapY(PTS.EUTEC_C.t)} /> 
          <line x1={mapX(0)} y1={mapY(dynamicA1)} x2={mapX(PTS.EUTECTOID_C.c)} y2={mapY(dynamicA1)} /> 
          <line x1={mapX(0)} y1={mapY(0)} x2={mapX(0)} y2={mapY(PTS.MELT.t)} />
          {!zoomSteel && <line x1={mapX(PTS.EUTEC_C.c)} y1={mapY(0)} x2={mapX(PTS.EUTEC_C.c)} y2={mapY(1250)} />}
        </g>

        <g className="pointer-events-none transition-spring" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" opacity="0.4">
          <line x1={mapX(0)} y1={mapY(CONSTANTS.FE_C.T_CURIE)} x2={mapX(dynamicC1)} y2={mapY(CONSTANTS.FE_C.T_CURIE)} />
        </g>
        
        <text x={mapX(0.38)} y={mapY(CONSTANTS.FE_C.T_CURIE) - 4} className={cn("font-data text-[10px] pointer-events-none hidden md:block", isDark ? 'fill-red-400' : 'fill-red-600/80')} textAnchor="middle">768°C (A₂)</text>

        <g className={cn("font-display text-[14px] pointer-events-none hidden md:block transition-all duration-300")} textAnchor="middle">
          <text x={mapX(1.0)} y={mapY(1000)} fill={colors.austenite}>AUSTENITE (γ)</text>
          <text x={mapX(0.01)} y={mapY(500)} textAnchor="start" fill={colors.ferrite} fontSize="16">α</text>
          <text x={mapX(Math.max(0.05, dynamicC1 / 3))} y={mapY(dynamicA1 + 40)} fill={colors.ferrite}>α + γ</text>
          <text x={mapX(0.04)} y={mapY(1460)} fill={colors.delta}>δ</text>
          <text x={mapX(dynamicC1 / 2)} y={mapY(400)} fill={colors.pearlite}>α + PEARLITE</text>
          <text x={mapX(dynamicC1 + (CONSTANTS.FE_C.C_AUSTENITE_MAX - dynamicC1)/2)} y={mapY(400)} fill={colors.pearlite}>PEARLITE + Fe₃C</text>
          <text x={mapX(1.55)} y={mapY(850)} fill={colors.cementite}>γ + Fe₃C</text>
          <text x={mapX(1.4)} y={mapY(1350)} fill={colors.liquid}>L + γ</text>
          {!zoomSteel && (
            <>
              <text x={mapX(3.5)} y={mapY(1450)} fill={colors.liquid}>LIQUID (L)</text>
              <text x={mapX(5.5)} y={mapY(1220)} fill={colors.liquid}>L + Fe₃C</text>
              <text x={mapX(3.2)} y={mapY(950)} fill={colors.austenite}>γ + LEDEBURITE I + Fe₃C</text>
              <text x={mapX(5.5)} y={mapY(950)} fill={colors.cementite}>LEDEBURITE I + Fe₃C</text>
              <text x={mapX(3.2)} y={mapY(400)} fill={colors.pearlite}>PEARLITE + LEDEBURITE II + Fe₃C</text>
              <text x={mapX(5.5)} y={mapY(400)} fill={colors.cementite}>LEDEBURITE II + Fe₃C</text>
            </>
          )}
        </g>

        <g className={cn("font-data text-[10px] pointer-events-none transition-spring", isDark ? 'fill-slate-300' : 'fill-slate-600')} textAnchor="middle">
          <text x={mapX(dynamicC1 / 1.5)} y={mapY(dynamicA3 - 100) + 12} transform={`rotate(-40 ${mapX(dynamicC1 / 1.5)} ${mapY(dynamicA3 - 100) + 12})`} fill="#f97316">A₃</text>
          <text x={mapX(1.6)} y={mapY(980) - 8} transform={`rotate(38 ${mapX(1.6)} ${mapY(980) - 8})`} fill="#8b5cf6">Acm</text>
          <text x={mapX(1.0)} y={mapY(dynamicA1) + 14}>A₁ ({Math.round(dynamicA1)}°C)</text>
          {!zoomSteel && <text x={mapX(CONSTANTS.FE_C.C_EUTECTIC)} y={mapY(CONSTANTS.FE_C.T_EUTECTIC) - 8}>EUTECTIC</text>}
        </g>
      </g>

      <path className="pointer-events-none" d={`M ${m.left} ${m.top} L ${m.left} ${h - m.bottom} L ${w - m.right} ${h - m.bottom}`} fill="none" stroke={axisColor} strokeWidth="2.5" strokeLinecap="square" />

      <g className={cn("font-data text-[10px] pointer-events-none transition-spring", textMain)} textAnchor="middle">
        {(zoomSteel ? [0.5, 1.0, 1.5, 2.0, 2.5] : [1, 2, 3, 4, 5, 6]).map(c => (
          <g key={`tx-${c}`} transform={`translate(${mapX(c)}, ${h - m.bottom})`}>
            <line y2="6" stroke={axisColor} strokeWidth="2" />
            <text y="20" className="opacity-80">{c}</text>
          </g>
        ))}
        
        {(zoomSteel ? [CONSTANTS.FE_C.C_FERRITE_MAX, dynamicC1, CONSTANTS.FE_C.C_AUSTENITE_MAX] : [CONSTANTS.FE_C.C_FERRITE_MAX, dynamicC1, CONSTANTS.FE_C.C_AUSTENITE_MAX, CONSTANTS.FE_C.C_EUTECTIC, CONSTANTS.FE_C.C_CEMENTITE]).map(c => (
          <g key={`ctx-${c}`} transform={`translate(${mapX(c)}, ${h - m.bottom})`}>
            <line y2="8" stroke={colors.ferrite} strokeWidth="2" />
            <text y="24" textAnchor={c === CONSTANTS.FE_C.C_FERRITE_MAX ? "start" : "middle"} dx={c === CONSTANTS.FE_C.C_FERRITE_MAX ? 3 : 0} fill={colors.ferrite} className="font-bold">{c.toFixed(2)}</text>
          </g>
        ))}

        <text x={m.left + geometry.innerW/2} y={h - 5} className={cn("font-display text-sm tracking-widest", isDark ? 'fill-slate-400' : 'fill-slate-600')}>CARBON MASS FRACTION (wt%)</text>
        
        {[0, 200, 400, 600, 800, 1000, 1200, 1400, 1600].map(t => (
          <g key={`ty-${t}`} transform={`translate(${m.left}, ${mapY(t)})`}>
            <line x2="-5" stroke={axisColor} strokeWidth="2" />
            <text x="-10" y="4" textAnchor="end" className="opacity-80">{t}</text>
          </g>
        ))}

        <text transform={`rotate(-90) translate(${-m.top - geometry.innerH/2}, ${m.left - 45})`} className={cn("font-display text-sm tracking-widest", isDark ? 'fill-slate-400' : 'fill-slate-600')}>TEMPERATURE (°C)</text>
      </g>
    </>
  );
});

const CustomLogo = ({ isDark }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 drop-shadow-md">
    <path d="M2 12l10-8 10 8v8H2v-8z" stroke={isDark ? "#94a3b8" : "#475569"} strokeWidth="2" strokeLinecap="square"/>
    <path d="M12 4v16M7 8v12M17 8v12" stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="1.5" strokeDasharray="2,2"/>
    <circle cx="12" cy="12" r="3" fill="#fbbf24" className="animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
  </svg>
);

const CrystalCell = React.memo(({ type, c_param, a_param, isDark }) => {
  const stroke = isDark ? '#475569' : '#94a3b8';
  if (type === 'Amorphous' || !a_param || a_param === 0) {
    return (
      <svg viewBox="0 0 100 120" className="w-16 h-16 drop-shadow-md" role="img">
         <g fill={isDark ? '#64748b' : '#94a3b8'} opacity="0.6">
           <circle cx="30" cy="40" r="6" /> <circle cx="70" cy="30" r="8" /> <circle cx="50" cy="70" r="7" />
           <circle cx="20" cy="80" r="5" /> <circle cx="80" cy="80" r="6" /> <circle cx="50" cy="20" r="5" />
         </g>
      </svg>
    );
  }
  const atom = type.includes('FCC') ? '#fbbf24' : type.includes('BCT') ? '#a855f7' : '#94a3b8';
  const cRatio = c_param / a_param;
  const proj = (x, y, z) => ({ cx: 50 + (x - y) * 35, cy: 100 - (x + y) * 20 - (z * cRatio) * 45 });

  const pts = [ proj(0,0,0), proj(1,0,0), proj(0,1,0), proj(1,1,0), proj(0,0,1), proj(1,0,1), proj(0,1,1), proj(1,1,1) ];
  const edges = [[0,1], [0,2], [1,3], [2,3], [4,5], [4,6], [5,7], [6,7], [0,4], [1,5], [2,6], [3,7]];

  return (
    <svg viewBox="0 0 100 120" className="w-16 h-16 drop-shadow-md" role="img">
      <g stroke={stroke} strokeWidth="1.5" strokeOpacity="0.8" fill="none" strokeLinejoin="miter">
        {edges.map((e, i) => <line key={i} x1={pts[e[0]].cx} y1={pts[e[0]].cy} x2={pts[e[1]].cx} y2={pts[e[1]].cy} />)}
      </g>
      <g fill={atom}>
        {pts.map((p, i) => <circle key={`c-${i}`} cx={p.cx} cy={p.cy} r={i===7 ? 4.5 : 4} stroke={stroke} strokeWidth="1"/>)}
        {(type.includes('BCC') || type.includes('BCT')) && (<circle cx={proj(0.5,0.5,0.5).cx} cy={proj(0.5,0.5,0.5).cy} r="6" stroke={stroke} strokeWidth="1.5"/>)}
        {type.includes('FCC') && [ proj(0.5,0.5,0), proj(0.5,0.5,1), proj(0.5,0,0.5), proj(0.5,1,0.5), proj(0,0.5,0.5), proj(1,0.5,0.5) ].map((p, i) => <circle key={`f-${i}`} cx={p.cx} cy={p.cy} r="4" stroke={stroke} strokeWidth="1"/>)}
      </g>
    </svg>
  );
});

const MicrostructureDisplay = React.memo(({ onCapture }) => {
  const { simState: state, carbon, temp } = useThermoState();
  const { isDark, etchant, theme } = useThermoAction();
  const c = parseNum(carbon, 0); const t = parseNum(temp, 20);

  const [flash, triggerFlash] = useEphemeralMessage(300);
  const pid = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const filterId = `warp-${pid}`;
  
  const coreTheme = theme.colors;
  const colors = {
    nital: { ferrite: coreTheme.ferrite, austenite: '#eab308', cementite: '#0f172a', liquid: coreTheme.liquid, bainiteDark: coreTheme.bainite },
    picral: { ferrite: isDark?'#020617':'#ffffff', austenite: coreTheme.austenite, cementite: '#000', liquid: coreTheme.liquid, bainiteDark: '#000' },
    polished: { ferrite: isDark?'#334155':'#e2e8f0', austenite: isDark?'#475569':'#cbd5e1', cementite: isDark?'#1e293b':'#94a3b8', liquid: coreTheme.liquid, bainiteDark: isDark?'#1e293b':'#94a3b8' }
  };
  const mapTheme = colors[etchant];
  
  let pSpace = 10;
  if (t < CONSTANTS.FE_C.T_EUTECTOID) {
    const dT = Math.max(1, CONSTANTS.FE_C.T_EUTECTOID - t);
    pSpace = Math.max(2, Math.min(15, 150 / Math.sqrt(dT)));
  }

  const handleCapture = useCallback(() => { triggerFlash(); onCapture(); }, [triggerFlash, onCapture]);

  const voronoiPaths = useMemo(() => {
     const seedStr = c * 1000 + (state.regionId ? state.regionId.length : 0);
     return generateVoronoi(seedStr, 300, 300, 45);
  }, [c, state.regionId]);

  const patterns = (
    <defs>
      <pattern id={`pearlite-${pid}`} width={pSpace} height={pSpace} patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
        <rect width={pSpace} height={pSpace} fill={mapTheme.ferrite} />
        {etchant !== 'polished' && <line x1="0" y1={pSpace/2} x2={pSpace} y2={pSpace/2} stroke={mapTheme.cementite} strokeWidth={pSpace * 0.4} />}
      </pattern>
      <pattern id={`ledeburite-${pid}`} width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill={mapTheme.cementite} />
        <circle cx="4" cy="4" r="2.5" fill={t < CONSTANTS.FE_C.T_EUTECTOID ? `url(#pearlite-${pid})` : mapTheme.austenite} />
        <circle cx="10" cy="10" r="2" fill={t < CONSTANTS.FE_C.T_EUTECTOID ? `url(#pearlite-${pid})` : mapTheme.austenite} />
      </pattern>
      <pattern id={`martensite-${pid}`} width="30" height="30" patternUnits="userSpaceOnUse">
        <rect width="30" height="30" fill={mapTheme.ferrite} />
        <rect width="30" height="30" fill={coreTheme.martensite} opacity="0.3" />
        {etchant !== 'polished' && (
          <>
            <path d="M-5,15 L35,15 M15,-5 L15,35 M0,0 L30,30 M30,0 L0,30" stroke={mapTheme.cementite} strokeWidth="1" opacity="0.6" />
            <path d="M5,10 L25,20 M10,5 L20,25" stroke={isDark ? '#cbd5e1' : '#475569'} strokeWidth="2" />
          </>
        )}
      </pattern>
      <pattern id={`tempered-${pid}`} width="15" height="15" patternUnits="userSpaceOnUse">
        <rect width="15" height="15" fill={mapTheme.ferrite} />
        {etchant !== 'polished' && (
          <>
            <circle cx="3" cy="3" r="1" fill={mapTheme.cementite} /> <circle cx="10" cy="7" r="1.5" fill={mapTheme.cementite} /> <circle cx="5" cy="12" r="1" fill={mapTheme.cementite} />
            <path d="M0,0 L15,15 M15,0 L0,15" stroke={mapTheme.cementite} strokeWidth="0.5" opacity="0.3" />
          </>
        )}
      </pattern>
      <pattern id={`bainite-${pid}`} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill={mapTheme.ferrite} />
        <rect width="20" height="20" fill={coreTheme.bainite} opacity="0.2" />
        {etchant !== 'polished' && (
          <>
             <path d="M2,10 Q10,2 18,10 Q10,18 2,10" fill="none" stroke={mapTheme.bainiteDark} strokeWidth="1.5" /> <circle cx="10" cy="10" r="1.5" fill={mapTheme.cementite} />
             <path d="M-5,-5 L25,25" stroke={mapTheme.bainiteDark} strokeWidth="0.5" opacity="0.6" />
          </>
        )}
      </pattern>
      <filter id={filterId}><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed={Math.floor(c * 1337) % 100} result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" /></filter>
      <clipPath id={`microscopeClip-${pid}`}><circle cx="150" cy="150" r="145" /></clipPath>
      <radialGradient id={`vignetteGrad-${pid}`} cx="50%" cy="50%" r="50%"><stop offset="70%" stopColor="transparent" /><stop offset="100%" stopColor="rgba(0,0,0,0.8)" /></radialGradient>
    </defs>
  );

  const getPhaseFill = (name) => {
    if (name.includes('Liquid')) return mapTheme.liquid;
    if (name.includes('Austenite')) return mapTheme.austenite;
    if (name.includes('Ferrite') || name.includes('Delta')) return mapTheme.ferrite;
    if (name.includes('Cementite')) return mapTheme.cementite;
    if (name.includes('Martensite')) return `url(#martensite-${pid})`;
    if (name.includes('Tempered')) return `url(#tempered-${pid})`;
    if (name.includes('Bainite')) return `url(#bainite-${pid})`;
    if (name === 'Pearlite') return `url(#pearlite-${pid})`;
    if (name === 'Ledeburite') return `url(#ledeburite-${pid})`;
    return mapTheme.ferrite;
  };

  const regionId = state.regionId;
  const renderContent = useMemo(() => {
    let indices = voronoiPaths.map((_, i) => i);
    const stableSeed = Math.floor(c * 10) * 100 + (regionId ? regionId.length : 0);
    indices.sort((a, b) => seededRandom(stableSeed + a) - seededRandom(stableSeed + b));
    let assignments = []; let currentIdx = 0;
    state.microFractions.forEach(f => {
       const count = Math.round((f.frac / 100) * voronoiPaths.length);
       for(let i=0; i<count && currentIdx < indices.length; i++) assignments[indices[currentIdx++]] = getPhaseFill(f.name);
    });
    while(currentIdx < indices.length) assignments[indices[currentIdx++]] = getPhaseFill(state.microFractions[0]?.name || 'Ferrite');

    const boundaryColor = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)';
    return voronoiPaths.map((d, i) => <path key={i} d={d} fill={assignments[i]} stroke={boundaryColor} strokeWidth={etchant === 'polished' ? 0.5 : 1.5} strokeLinejoin="miter" filter={`url(#${filterId})`}/>);
  }, [c, regionId, state.microFractions, mapTheme, pid, filterId, etchant, isDark, t, voronoiPaths]);

  const glowStyle = {
    boxShadow: t > 600 ? `0 0 40px 10px ${getBlackbodyGlow(t, 0.6)}, inset 0 0 30px 5px ${getBlackbodyGlow(t, 0.6)}` : 'none',
    borderColor: t > 600 ? getBlackbodyGlow(t, 1.0) : (isDark ? '#1e293b' : '#94a3b8')
  };

  return (
    <div className="flex flex-col items-center relative w-full mb-4 mt-2">
      <div className={cn("relative w-56 h-56 md:w-64 md:h-64 rounded-full flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 group border-[14px]", isDark ? 'bg-black border-[#1e293b]' : 'bg-white border-[#94a3b8]')} style={glowStyle}>
         
         <div className="absolute inset-0 rounded-full border border-black/60 pointer-events-none z-20"></div>
         <div className="absolute inset-1 rounded-full border border-white/20 pointer-events-none z-20"></div>
         
         <div className="absolute inset-0 rounded-full border-[3px] border-red-500/30 translate-x-[1px] pointer-events-none z-20 mix-blend-screen"></div>
         <div className="absolute inset-0 rounded-full border-[3px] border-blue-500/30 -translate-x-[1px] pointer-events-none z-20 mix-blend-screen"></div>

         <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 opacity-40 drop-shadow-md">
           <path id={`bezelPath-${pid}`} d="M 24, 128 A 104,104 0 1,1 232,128" fill="none" />
           <text className="font-display text-[10px] tracking-widest uppercase" fill={isDark?"#cbd5e1":"#1e293b"}>
              <textPath href={`#bezelPath-${pid}`} startOffset="50%" textAnchor="middle">PLAN APOCHROMAT 50X / 0.95</textPath>
           </text>
         </svg>

        <svg viewBox="0 0 300 300" className="w-[98%] h-[98%] rounded-full block" role="img">
          {patterns}
          <g clipPath={`url(#microscopeClip-${pid})`}>
            {renderContent}
            <circle cx="150" cy="150" r="145" fill={`url(#vignetteGrad-${pid})`} className="pointer-events-none"/>
            <line x1="150" y1="5" x2="150" y2="295" stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)"} strokeWidth="1" strokeDasharray="4,4" />
            <line x1="5" y1="150" x2="295" y2="150" stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)"} strokeWidth="1" strokeDasharray="4,4" />
            <circle cx="150" cy="150" r="75" fill="none" stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)"} strokeWidth="1" />
          </g>
          <circle cx="150" cy="150" r="145" fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="10" />
          <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        </svg>

        <div className="absolute bottom-[18%] right-[18%] z-30 flex flex-col items-center pointer-events-none opacity-90 drop-shadow-md">
            <div className="w-12 h-1 border-x-2 border-b-2 border-white/90"></div>
            <span className="font-data text-[9px] text-white font-bold mt-0.5" style={{textShadow: '0 1px 2px #000'}}>50 µm</span>
        </div>

        <div className="absolute inset-0 pointer-events-none transition-colors duration-500 mix-blend-hard-light" style={{ backgroundColor: getBlackbodyGlow(t, isDark ? 0.7 : 0.55) }} />
        <div className={cn("absolute inset-0 bg-white pointer-events-none transition-opacity duration-300", flash ? 'opacity-100' : 'opacity-0')} />
        <button onClick={handleCapture} className="absolute bottom-4 right-4 p-2.5 bg-slate-800 text-white rounded-sm shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-700 active:scale-95 z-30"><Camera size={16} /></button>

        {state.isQuenched && !state.isTempered && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-purple-600/90 backdrop-blur-md text-white font-data text-[10px] px-2 py-0.5 rounded-sm border border-purple-400 font-bold uppercase pointer-events-none whitespace-nowrap z-30">MARTENSITIC</div>
        )}
      </div>
    </div>
  );
});

const InstrumentGauge = React.memo(({ label, value, unit, max, colorHex, isDark }) => {
  const radius = 36;
  const strokeWidth = 5;
  const cx = 50, cy = 46;
  const startAngle = -120;
  const endAngle = 120;
  const dangerAngle = 70; 
  
  const polarToCartesian = (r, deg) => {
    const rad = (deg - 90) * Math.PI / 180.0;
    return { x: cx + (r * Math.cos(rad)), y: cy + (r * Math.sin(rad)) };
  };
  
  const describeArc = (r, a1, a2) => {
    const start = polarToCartesian(r, a2);
    const end = polarToCartesian(r, a1);
    const largeArc = a2 - a1 <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", r, r, 0, largeArc, 0, end.x, end.y].join(" ");
  };

  const valClamp = Math.max(0, Math.min(max, value));
  const valAngle = startAngle + (valClamp / max) * (endAngle - startAngle);
  const needlePos = polarToCartesian(radius - 8, valAngle);

  return (
    <div className={cn("flex flex-col items-center p-4 border rounded-sm relative shadow-inner overflow-hidden w-full", isDark ? 'bg-[#0b0c0f] border-[#2a2d35]' : 'bg-[#e2e4e9] border-[#caced4]')}>
      <div className="absolute top-2.5 left-3 font-display text-[10px] tracking-widest uppercase opacity-80">{label}</div>
      <svg viewBox="0 0 100 65" className="w-full max-w-[140px] h-auto drop-shadow-md mt-5">
         {Array.from({length: 11}).map((_, i) => {
            const a = startAngle + (i/10)*(endAngle - startAngle);
            const p1 = polarToCartesian(radius + 1, a);
            const p2 = polarToCartesian(radius - 2, a);
            return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={isDark?"#475569":"#94a3b8"} strokeWidth={i%5===0 ? 1.5 : 0.5} />
         })}
         <path d={describeArc(radius, startAngle, dangerAngle)} fill="none" stroke={isDark?"#1e293b":"#cbd5e1"} strokeWidth={strokeWidth} strokeLinecap="round" />
         <path d={describeArc(radius, dangerAngle, endAngle)} fill="none" stroke="#ef4444" strokeWidth={strokeWidth} strokeOpacity="0.4" strokeLinecap="round" />
         <path d={describeArc(radius, startAngle, valAngle)} fill="none" stroke={colorHex} strokeWidth={strokeWidth} strokeLinecap="round" className="transition-all duration-700 ease-out" />
         <line x1={cx} y1={cy} x2={needlePos.x} y2={needlePos.y} stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" className="transition-all duration-700 ease-out" style={{transformOrigin: `${cx}px ${cy}px`}} />
         <circle cx={cx} cy={cy} r="3" fill={isDark?"#0f1115":"#e2e4e9"} stroke="#ef4444" strokeWidth="1.5" />
      </svg>
      <div className="absolute bottom-1.5 w-full text-center">
        <div className={cn("font-data text-[20px] font-black leading-none", isDark ? 'text-slate-100' : 'text-slate-900')}>{Math.round(value)}</div>
        <div className="font-display text-[10px] tracking-widest uppercase opacity-80 mt-0.5">{unit}</div>
      </div>
    </div>
  );
});

const CompactStat = React.memo(({ label, val, unit, isDark }) => (
   <div className={cn("p-4 border rounded-sm flex flex-col justify-between items-center", isDark ? 'bg-[#0b0c0f] border-[#2a2d35]' : 'bg-white border-[#caced4]')}>
      <span className="font-display text-[11px] tracking-widest uppercase opacity-80 font-semibold">{label}</span>
      <span className="font-data text-[14px] font-bold mt-1 text-center leading-none">{val}<span className="text-[10px] opacity-80 ml-0.5">{unit}</span></span>
   </div>
));

const CoolingCurvePlot = React.memo(() => {
  const { historyTrail, temp, alloy } = useThermoState();
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);
  const { isDark, theme } = useThermoAction();

  const w = 320, h = 140; const m = { top: 16, right: 16, bottom: 36, left: 48 };
  const innerW = w - m.left - m.right; const innerH = h - m.top - m.bottom;
  const currentT = parseNum(temp, 20);

  const trail = useMemo(() => {
    if (!historyTrail || historyTrail.length < 2) return [];
    let startIdx = 0;
    for (let i = 1; i < historyTrail.length; i++) { if (historyTrail[i].t < historyTrail[i - 1].t) { startIdx = i - 1; break; } }
    return historyTrail.slice(startIdx);
  }, [historyTrail]);

  const { minT, maxT, minTime, maxTime } = useMemo(() => {
    if (trail.length < 2) return { minT: 0, maxT: CONSTANTS.FE_C.T_MAX, minTime: 0, maxTime: 1 };
    const temps = trail.map(p => p.t); const times = trail.map(p => p.time);
    return { minT: Math.max(0, Math.min(...temps) - 20), maxT: Math.min(CONSTANTS.FE_C.T_MAX, Math.max(...temps) + 20), minTime: Math.min(...times), maxTime: Math.max(...times) + 0.01 };
  }, [trail]);

  const mapX = (time) => m.left + ((time - minTime) / (maxTime - minTime)) * innerW;
  const mapY = (t) => m.top + (1 - (t - minT) / (maxT - minT)) * innerH;

  const pathStr = useMemo(() => {
    if (trail.length < 2) return '';
    return trail.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.time)},${mapY(p.t)}`).join(' ');
  }, [trail, minT, maxT, minTime, maxTime]);

  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  const criticalLines = [
    { t: consts.T_EUTECTOID, label: 'A₁', color: '#f43f5e' },
    { t: consts.T_A3_PURE, label: 'A₃', color: '#f97316' },
  ].filter(l => l.t >= minT && l.t <= maxT);

  if (trail.length < 2) {
    return (
      <div className={cn("border rounded-sm overflow-hidden relative", theme.diagramBgClass, theme.border)}>
        <div className={cn("px-6 pt-4 pb-2 font-display text-[12px] tracking-widest flex items-center gap-2 border-b", theme.border, theme.textMuted)}>
          <LineChart size={12} /> COOLING PROFILE
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 pt-8">
            <p className={cn("font-display text-[11px] uppercase tracking-widest bg-black/80 px-3 py-1.5 rounded-sm border border-white/20 text-slate-200 backdrop-blur-md shadow-lg")}>INITIALIZE HEAT TREATMENT</p>
        </div>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block opacity-30">
          <g stroke={gridColor} strokeWidth="1">
            {[0.25, 0.5, 0.75].map(f => <line key={`gx-${f}`} x1={m.left + f * innerW} y1={m.top} x2={m.left + f * innerW} y2={h - m.bottom} />)}
            {[0.33, 0.67].map(f => <line key={`gy-${f}`} x1={m.left} y1={m.top + f * innerH} x2={w - m.right} y2={m.top + f * innerH} />)}
          </g>
          <path d={`M ${m.left} ${m.top} Q ${m.left + 60} ${m.top} ${m.left + 100} ${m.top + 40} T ${w - m.right} ${h - m.bottom}`} fill="none" stroke={axisColor} strokeWidth="2" strokeDasharray="4,4" />
          <path d={`M ${m.left} ${m.top} L ${m.left} ${h - m.bottom} L ${w - m.right} ${h - m.bottom}`} fill="none" stroke={axisColor} strokeWidth="1.5" />
          <text x={m.left + innerW / 2} y={h - 4} textAnchor="middle" className="font-display text-[10px] tracking-widest" fill={axisColor}>TIME (s)</text>
          <text transform={`rotate(-90) translate(${-(m.top + innerH / 2)}, 12)`} textAnchor="middle" className="font-display text-[10px] tracking-widest" fill={axisColor}>°C</text>
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-sm overflow-hidden", theme.diagramBgClass, theme.border)}>
      <div className={cn("px-6 pt-4 pb-2 font-display text-[12px] tracking-widest flex items-center gap-2 border-b", theme.border, theme.textMuted)}>
        <LineChart size={12} /> COOLING PROFILE
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block">
        <g stroke={gridColor} strokeWidth="1">
          {[0.25, 0.5, 0.75].map(f => <line key={`gx-${f}`} x1={m.left + f * innerW} y1={m.top} x2={m.left + f * innerW} y2={h - m.bottom} />)}
          {[0.33, 0.67].map(f => <line key={`gy-${f}`} x1={m.left} y1={m.top + f * innerH} x2={w - m.right} y2={m.top + f * innerH} />)}
        </g>
        {criticalLines.map(l => (
          <g key={`cl-${l.t}`}>
            <line x1={m.left} y1={mapY(l.t)} x2={w - m.right} y2={mapY(l.t)} stroke={l.color} strokeWidth="1" strokeDasharray="4,2" opacity="0.6" />
            <text x={w - m.right + 2} y={mapY(l.t) + 3} className="font-data text-[10px]" fill={l.color}>{l.label}</text>
          </g>
        ))}
        {pathStr && (
          <>
            <path d={pathStr} fill="none" stroke="#ea580c" strokeWidth="4" strokeOpacity="0.2" style={{ filter: 'blur(2px)' }} />
            <path d={pathStr} fill="none" stroke="#ea580c" strokeWidth="1.5" />
          </>
        )}
        {trail.length > 0 && <circle cx={mapX(trail[trail.length - 1].time)} cy={mapY(currentT)} r="3" fill="#ea580c" />}
        <path d={`M ${m.left} ${m.top} L ${m.left} ${h - m.bottom} L ${w - m.right} ${h - m.bottom}`} fill="none" stroke={axisColor} strokeWidth="1.5" />
        {[minT, (minT + maxT) / 2, maxT].map((t, i) => (
          <g key={`ty-${i}`} transform={`translate(${m.left}, ${mapY(t)})`}>
            <line x2="-4" stroke={axisColor} strokeWidth="1" />
            <text x="-6" y="3" textAnchor="end" className="font-data text-[10px]" fill={axisColor}>{Math.round(t)}</text>
          </g>
        ))}
        <text x={m.left + innerW / 2} y={h - 4} textAnchor="middle" className="font-display text-[10px] tracking-widest" fill={axisColor}>TIME (s)</text>
        <text transform={`rotate(-90) translate(${-(m.top + innerH / 2)}, 12)`} textAnchor="middle" className="font-display text-[10px] tracking-widest" fill={axisColor}>°C</text>
      </svg>
    </div>
  );
});

const TopNav = () => {
  const { carbon, temp } = useThermoState();
  const { isDark, setIsDark, zoomSteel, setZoomSteel, theme, guidedScenarioId, setGuidedScenarioId, setGuidedStep, startTour } = useThermoAction();
  const [copiedLink, triggerCopiedLink] = useEphemeralMessage(2000);

  const shareState = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?c=${parseNum(carbon, 0).toFixed(3)}&t=${parseNum(temp, 0).toFixed(0)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(triggerCopiedLink);
  }, [carbon, temp, triggerCopiedLink]);

  return (
    <nav className={cn("sticky top-0 z-50 px-6 py-4 border-b flex flex-wrap justify-between items-center gap-4", theme.border, theme.panelBg)}>
      <div className="flex items-center gap-4">
        <CustomLogo isDark={isDark} />
        <div>
          <h1 className="font-display text-2xl tracking-widest flex items-center gap-2 uppercase">
            ABAJIS<span className={cn(theme.textMuted, "font-light")}>STEELLAB</span>
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button onClick={startTour} className={theme.btnSecondary}>
          <PlayCircle size={14}/> <span className="hidden sm:inline">Tour</span>
        </button>
        <button onClick={() => { setGuidedScenarioId(guidedScenarioId === null ? 0 : null); setGuidedStep(0); }} className={guidedScenarioId !== null ? theme.btnPrimary : theme.btnSecondary}>
          <Compass size={14}/> <span className="hidden sm:inline">{guidedScenarioId !== null ? 'Exit' : 'Guide'}</span>
        </button>
        <button onClick={shareState} className={copiedLink ? theme.btnPrimary : theme.btnSecondary}>
          <Share2 size={14}/> <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
        </button>
        <button onClick={() => setZoomSteel(!zoomSteel)} className={zoomSteel ? theme.btnPrimary : theme.btnSecondary}>
          <Search size={14}/> <span className="hidden sm:inline">{zoomSteel ? 'Map' : 'Steel'}</span>
        </button>
        <button onClick={() => setIsDark(!isDark)} className={cn("p-2 rounded-sm border transition-colors", isDark ? 'bg-[#181a20] border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-300 hover:bg-slate-50')}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </nav>
  );
};

const ControlsSection = () => {
  const { carbon, temp, mode, maxRate, isTourActive, tourStep } = useThermoState();
  const { alloy, setAlloy, handleAlloyChange, setCarbon, setTemp, changeMode, zoomSteel, setZoomSteel, theme, isDark } = useThermoAction();
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);

  const [showAlloys, setShowAlloys] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const stepC = (dir) => { changeMode('manual', true); setCarbon(prev => Number(Math.max(0, Math.min(zoomSteel ? 2.5 : CONSTANTS.FE_C.C_CEMENTITE, parseNum(prev, 0) + dir * 0.01)).toFixed(3)).toString()); };
  const stepT = (dir) => { changeMode('manual', true); setTemp(prev => Math.max(0, Math.min(CONSTANTS.FE_C.T_MAX, parseNum(prev, 0) + dir * 5)).toString()); };
  const handleC = (e) => { changeMode('manual', true); setCarbon(e.target.value); if (!isNaN(parseFloat(e.target.value)) && parseFloat(e.target.value) > 2.5 && zoomSteel) setZoomSteel(false); };
  const handleT = (e) => { changeMode('manual', true); setTemp(e.target.value); };

  const highlightClass = isTourActive && TOUR_STEPS[tourStep].target === 'controls' ? "ring-2 ring-emerald-500 z-50 transform scale-[1.01]" : "";
  const isExpanded = mobileExpanded || isTourActive;

  return (
    <section className={cn("border rounded-sm shrink-0 transition-all duration-300 relative overflow-hidden", theme.panelBg, highlightClass)}>
      
      {/* Mobile Accordion Header */}
      <div 
        className={cn("xl:hidden p-4 flex justify-between items-center cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5", isExpanded ? "border-b border-inherit" : "")}
        onClick={() => setMobileExpanded(!mobileExpanded)}
      >
        <span className="font-display text-[16px] tracking-widest uppercase flex items-center gap-2 font-semibold">
          <Flame size={16} className={theme.textMuted}/> THERMODYNAMIC CONTROLS
        </span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      <div className={cn("p-4 md:p-6 flex-col gap-6", isExpanded ? "flex" : "hidden xl:flex")}>
        <style dangerouslySetInnerHTML={{__html: `
          .temp-slider-track { background: linear-gradient(to right, #000 0%, #8b0000 35%, #ff4500 55%, #ff8c00 70%, #ffd700 85%, #ffffff 100%) !important; }
          .temp-slider::-webkit-slider-thumb {
              -webkit-appearance: none; appearance: none; width: 14px; height: 24px;
              background: ${getBlackbodyGlow(parseNum(temp, 20), 1)};
              border: 2px solid ${isDark ? '#fff' : '#000'}; border-radius: 4px;
              box-shadow: 0 0 10px ${getBlackbodyGlow(parseNum(temp, 20), 1)}; cursor: ew-resize;
          }
        `}} />

        <div className="flex flex-col gap-4 pb-4 border-b border-inherit">
          <span className={cn("font-display text-[14px] uppercase tracking-widest flex items-center gap-2 font-semibold", theme.textMuted)}>
            <Database size={14} /> MATERIALS DATABASE
          </span>
          <div className="flex flex-wrap gap-2">
            {STEEL_GRADES.map((grade) => (
              <button 
                key={grade.name} onClick={() => { setAlloy({ c: grade.c, mn: grade.mn, si: grade.si || 0.2, cr: grade.cr, mo: grade.mo, v: grade.v, ni: grade.ni, cu: grade.cu }); changeMode('manual', false); if (grade.c > 2.5 && zoomSteel) setZoomSteel(false); }}
                title={grade.desc}
                className={cn("px-4 py-2 rounded-sm font-data text-xs border transition-colors", Math.abs(parseNum(carbon, 0) - grade.c) < 0.01 && Math.abs(alloy.cr - grade.cr) < 0.1 ? 'bg-slate-700 border-slate-500 text-white' : (isDark ? 'bg-[#0b0c0f] border-[#2a2d35] hover:border-slate-500' : 'bg-white border-[#caced4] hover:border-slate-400'))}
              >
                {grade.name} <span className="opacity-80 ml-1">({grade.group})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <label className="font-display text-[14px] tracking-widest uppercase font-semibold">CARBON (wt%)</label>
              <div className="flex items-center border rounded-sm overflow-hidden" style={{ borderColor: isDark ? '#2a2d35' : '#caced4' }}>
                <button onClick={() => stepC(-1)} className={cn("p-2", isDark?'bg-[#0b0c0f] hover:bg-[#2a2d35]':'bg-white hover:bg-slate-100')}><Minus size={14} /></button>
                <input type="number" step="0.01" min="0" max="6.67" value={carbon} onChange={handleC} className={cn("w-16 text-center py-1 bg-transparent font-data text-xs focus:outline-none")} />
                <button onClick={() => stepC(1)} className={cn("p-2", isDark?'bg-[#0b0c0f] hover:bg-[#2a2d35]':'bg-white hover:bg-slate-100')}><Plus size={14} /></button>
              </div>
            </div>
            <input type="range" min="0" max={zoomSteel ? 2.5 : CONSTANTS.FE_C.C_CEMENTITE} step="0.001" value={parseNum(carbon, 0)} onChange={handleC} className="w-full accent-slate-500 h-1.5 bg-slate-200 dark:bg-slate-700 appearance-none cursor-pointer rounded-none" />
            
            <button onClick={() => setShowAlloys(!showAlloys)} className="font-display text-xs tracking-widest uppercase opacity-80 hover:opacity-100 flex items-center gap-1 mt-2 focus:outline-none font-semibold">
              <Settings size={12} /> {showAlloys ? 'Hide Alloys' : 'Advanced Alloys'} {showAlloys ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <label className="font-display text-[14px] tracking-widest uppercase text-[#ea580c] font-semibold">TEMP (°C)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => { changeMode('manual', true); setTemp("20"); }} className="font-display text-xs tracking-widest bg-[#ea580c]/10 text-[#ea580c] px-2 py-1 rounded-sm border border-[#ea580c]/20 hover:bg-[#ea580c]/20 font-semibold">ROOM</button>
                <div className="flex items-center border rounded-sm overflow-hidden" style={{ borderColor: isDark ? '#2a2d35' : '#caced4' }}>
                  <button onClick={() => stepT(-1)} className={cn("p-2", isDark?'bg-[#0b0c0f] hover:bg-[#2a2d35]':'bg-white hover:bg-slate-100')}><Minus size={14} /></button>
                  <input type="number" step="1" min="0" max="1600" value={temp} onChange={handleT} className={cn("w-14 text-center py-1 bg-transparent font-data text-xs focus:outline-none")} />
                  <button onClick={() => stepT(1)} className={cn("p-2", isDark?'bg-[#0b0c0f] hover:bg-[#2a2d35]':'bg-white hover:bg-slate-100')}><Plus size={14} /></button>
                </div>
              </div>
            </div>
            <input type="range" min="0" max={CONSTANTS.FE_C.T_MAX} step="1" value={parseNum(temp, 0)} onChange={handleT} className="w-full temp-slider temp-slider-track h-2 border border-slate-800 rounded-sm appearance-none cursor-pointer" />
          </div>
        </div>

        {showAlloys && (
          <div className={cn("grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mt-2 p-4 rounded-sm border", isDark?'bg-[#0b0c0f] border-[#2a2d35]':'bg-slate-50 border-[#caced4]')}>
             {['mn', 'si', 'cr', 'ni', 'mo', 'v', 'cu'].map(elem => (
                 <div key={elem}>
                     <div className="flex justify-between items-center mb-1">
                       <label className="font-display text-[12px] uppercase font-semibold">{elem}</label>
                       <input type="number" step="0.01" min="0" max="15" value={alloy[elem]} onChange={(e) => handleAlloyChange(elem, e.target.value)} className={cn("w-10 px-1 font-data text-[10px] text-right focus:outline-none bg-transparent border-b", isDark?'border-slate-700':'border-slate-300')} />
                     </div>
                     <input type="range" step="0.01" min="0" max={elem==='cr'||elem==='ni'?15:elem==='mn'?5:2} value={alloy[elem]} onChange={(e) => handleAlloyChange(elem, e.target.value)} className="w-full accent-slate-500 h-1 bg-slate-200 dark:bg-slate-700 appearance-none rounded-none" />
                 </div>
             ))}
          </div>
        )}

        <div className="pt-4 border-t border-inherit flex flex-col md:flex-row gap-6 items-center">
            <div className="font-display text-[14px] uppercase tracking-widest flex items-center gap-2 opacity-80 font-semibold">
              <Flame size={14}/> THERMAL MOD
            </div>
            <div className="flex gap-2 w-full md:w-auto font-display text-xs tracking-widest font-semibold">
              <button onClick={() => changeMode(mode === 'anneal' ? 'manual' : 'anneal')} className={cn("flex-1 md:flex-none px-4 py-2 border rounded-sm transition-colors", mode === 'anneal' ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_15px_rgba(217,119,6,0.2)]' : theme.btnSecondary)}>ANNEAL</button>
              <button onClick={() => changeMode(mode === 'normalize' ? 'manual' : 'normalize')} className={cn("flex-1 md:flex-none px-4 py-2 border rounded-sm transition-colors", mode === 'normalize' ? 'bg-sky-600 border-sky-500 text-white shadow-[0_0_15px_rgba(2,132,199,0.2)]' : theme.btnSecondary)}>NORM</button>
              <button onClick={() => changeMode(mode === 'quench' ? 'manual' : 'quench')} className={cn("flex-1 md:flex-none px-4 py-2 border rounded-sm transition-colors flex items-center justify-center gap-2", mode === 'quench' ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.2)]' : theme.btnSecondary)}>
                <Zap size={14} className={mode === 'quench' ? 'animate-pulse' : ''} /> QUENCH
              </button>
              {maxRate >= CONSTANTS.RATES.CRITICAL_MARTENSITE && parseNum(temp, 20) <= consts.T_EUTECTOID && (
                <button onClick={() => changeMode(mode === 'temper' ? 'manual' : 'temper')} className={cn("flex-1 md:flex-none px-4 py-2 border rounded-sm transition-colors flex items-center justify-center gap-2", mode === 'temper' ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.2)]' : theme.btnSecondary)}>
                  <RefreshCw size={14} className={mode === 'temper' ? 'animate-spin' : ''} /> TEMPER
                </button>
              )}
            </div>
        </div>
        <SmartAssistant />
      </div>
    </section>
  );
};

const TargetInput = React.memo(({ label, targetKey, placeholder, targets, setTargets, isDark }) => (
  <div className={cn("flex flex-col gap-2 p-4 border rounded-sm", isDark ? 'bg-[#0b0c0f] border-[#2a2d35]' : 'bg-white border-[#caced4]')}>
     <div className="flex justify-between items-center">
       <label className="font-display text-xs uppercase tracking-widest opacity-80 font-semibold">{label}</label>
       <select value={targets[targetKey].weight} onChange={(e) => setTargets(prev => ({...prev, [targetKey]: {...prev[targetKey], weight: parseFloat(e.target.value)}}))} className="font-display text-[10px] uppercase bg-transparent opacity-80 focus:outline-none font-semibold">
         <option value="0.5">LOW</option><option value="1">NORM</option><option value="2">HIGH</option>
       </select>
     </div>
     <input type="number" placeholder={placeholder} value={targets[targetKey].val} onChange={(e) => setTargets(prev => ({...prev, [targetKey]: {...prev[targetKey], val: e.target.value}}))} className="w-full font-data text-sm bg-transparent focus:outline-none" />
  </div>
));

const InverseDesignSection = () => {
  const { alloy, isTourActive, tourStep } = useThermoState();
  const { setAlloy, setCarbon, setTemp, changeMode, theme, isDark, startTransition } = useThermoAction();
  const [targets, setTargets] = useState({ hv: { val: '', weight: 1 }, yield: { val: '', weight: 1 }, uts: { val: '', weight: 1 }, elong: { val: '', weight: 1 } });
  const [results, setResults] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = () => {
    startTransition(() => setIsOptimizing(true)); 
    setResults([]);
    setTimeout(() => {
      const parsedTargets = {
        hv: { val: parseFloat(targets.hv.val) || 0, weight: targets.hv.weight }, yield: { val: parseFloat(targets.yield.val) || 0, weight: targets.yield.weight },
        uts: { val: parseFloat(targets.uts.val) || 0, weight: targets.uts.weight }, elong: { val: parseFloat(targets.elong.val) || 0, weight: targets.elong.weight }
      };
      if (parsedTargets.hv.val === 0 && parsedTargets.yield.val === 0 && parsedTargets.uts.val === 0 && parsedTargets.elong.val === 0) { setIsOptimizing(false); return; }
      const rawResults = OptimizationEngine.runInverseDesign(parsedTargets, alloy);
      setResults(rawResults); setIsOptimizing(false);
    }, 100); 
  };

  const applyResult = (res) => {
    changeMode('manual', false); setAlloy(res.alloy); setCarbon(res.alloy.c.toFixed(3)); setTemp("900"); 
    setTimeout(() => {
        if (res.process.includes('Annealed')) changeMode('anneal'); else if (res.process.includes('Normalized')) changeMode('normalize');
        else if (res.process.includes('Tempered')) changeMode('temper'); else if (res.process.includes('Quenched')) changeMode('quench');
        else { setTemp("20"); changeMode('manual', false); }
    }, 500);
  };

  const highlightClass = isTourActive && TOUR_STEPS[tourStep].target === 'optimizer' ? "ring-2 ring-emerald-500 z-50 transform scale-[1.01]" : "";

  return (
    <section className={cn("border rounded-sm p-4 md:p-6 shrink-0 transition-all duration-300 relative", theme.panelBg, highlightClass)}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-inherit">
        <div>
          <h2 className="font-display text-[16px] tracking-widest uppercase flex items-center gap-2 font-semibold">
            <Wand2 size={16} className="text-emerald-500" /> INVERSE DESIGN ENGINE
          </h2>
          <p className="font-data text-[10px] opacity-80 mt-1">Nelder-Mead Simplex / 6-Dimensional Mapping</p>
        </div>
        <button onClick={handleOptimize} disabled={isOptimizing} className={cn(isOptimizing ? 'bg-transparent text-slate-500 border-slate-500 cursor-not-allowed font-display text-xs tracking-widest uppercase px-4 py-2 border rounded-sm flex items-center gap-2 font-semibold' : theme.btnPrimary, "font-semibold")}>
          {isOptimizing ? <><Loader2 size={14} className="animate-spin" /> SOLVING</> : <><Search size={14} /> EXECUTE</>}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TargetInput label="Hardness (HV)" targetKey="hv" placeholder="e.g. 450" targets={targets} setTargets={setTargets} isDark={isDark} />
        <TargetInput label="Yield (MPa)" targetKey="yield" placeholder="e.g. 850" targets={targets} setTargets={setTargets} isDark={isDark} />
        <TargetInput label="UTS (MPa)" targetKey="uts" placeholder="e.g. 1000" targets={targets} setTargets={setTargets} isDark={isDark} />
        <TargetInput label="Elongation (%)" targetKey="elong" placeholder="e.g. 15" targets={targets} setTargets={setTargets} isDark={isDark} />
      </div>

      {results.length > 0 && (
        <div className="mt-6 pt-4 border-t border-inherit grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.map((res, i) => (
              <div key={i} className={cn("p-4 rounded-sm border flex flex-col justify-between", isDark?'bg-[#0b0c0f] border-[#2a2d35]':'bg-white border-[#caced4]')}>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn("font-data text-[10px] px-2 py-0.5 border rounded-sm font-bold", res.matchScore > 85 ? 'text-emerald-500 border-emerald-500/50' : res.matchScore > 60 ? 'text-amber-500 border-amber-500/50' : 'text-rose-500 border-rose-500/50')}>
                      {res.matchScore.toFixed(1)}% Match
                    </span>
                    <span className="font-display text-[10px] tracking-widest opacity-80 font-semibold">OPT {i+1}</span>
                  </div>
                  <div className="font-data text-xs font-bold leading-tight my-4">
                    {res.alloy.c.toFixed(2)}C {res.alloy.mn.toFixed(2)}Mn {res.alloy.si.toFixed(2)}Si <br/>
                    {res.alloy.cr>0.05 ? res.alloy.cr.toFixed(1)+'Cr ' : ''}{res.alloy.ni>0.05 ? res.alloy.ni.toFixed(1)+'Ni ' : ''}{res.alloy.mo>0.05 ? res.alloy.mo.toFixed(1)+'Mo' : ''}
                  </div>
                  <div className="font-display text-xs uppercase opacity-80 border-t border-inherit pt-2 font-semibold">{res.process}</div>
                  
                  <div className="grid grid-cols-4 gap-2 text-center mt-4 border-t border-inherit pt-3 font-data text-xs">
                    <div><div className="opacity-80 text-[10px] mb-1">HV</div><div>{res.state.hardness.hv}</div></div>
                    <div><div className="opacity-80 text-[10px] mb-1">YS</div><div>{res.state.yield}</div></div>
                    <div><div className="opacity-80 text-[10px] mb-1">UTS</div><div>{res.state.uts}</div></div>
                    <div><div className="opacity-80 text-[10px] mb-1">E%</div><div>{res.state.elong}</div></div>
                  </div>
                </div>
                <button onClick={() => applyResult(res)} className={cn("w-full mt-4 font-semibold", theme.btnSecondary)}>Simulate</button>
              </div>
            ))}
        </div>
      )}
    </section>
  );
};

const DiagramSection = () => {
  const { alloy, carbon, temp, historyTrail, simState, isTourActive, tourStep, phaseFlash } = useThermoState();
  const { svgRef, setCarbon, setTemp, changeMode, maxC, geometry, theme, isDark, showWeldability, setShowWeldability } = useThermoAction();
  const { isDragging, onPointerDown, onPointerMove, onPointerUp } = useDiagramInteractions(svgRef, alloy, carbon, temp, setCarbon, setTemp, changeMode, maxC, geometry);

  const historyPointsStr = useMemo(() => {
    if (historyTrail.length < 2) return '';
    return historyTrail.map(p => `${geometry.mapX(parseNum(p.c))},${geometry.mapY(parseNum(p.t))}`).join(' ');
  }, [historyTrail, geometry]);

  const handleSVGKeyDown = (e) => {
    const stepC = e.shiftKey ? 0.1 : 0.01; const stepT = e.shiftKey ? 50 : 5;
    let newC = parseNum(carbon, 0); let newT = parseNum(temp, 20);
    if (e.key === 'ArrowRight') newC = Math.min(maxC, newC + stepC); else if (e.key === 'ArrowLeft') newC = Math.max(0, newC - stepC);
    else if (e.key === 'ArrowUp') newT = Math.min(CONSTANTS.FE_C.T_MAX, newT + stepT); else if (e.key === 'ArrowDown') newT = Math.max(0, newT - stepT);
    else return;
    e.preventDefault(); changeMode('manual', true); setCarbon(newC.toFixed(3)); setTemp(Math.round(newT).toString());
  };

  const tooltipW = 140;
  const tx = geometry.mapX(parseNum(carbon, 0));
  const ty = geometry.mapY(parseNum(temp, 0));
  const tooltipFlip = tx > geometry.w - 180;
  
  const currentTempNum = parseNum(temp, 20);
  const tempColor = currentTempNum > 600 ? getBlackbodyGlow(currentTempNum, 1.0) : (isDark ? '#38bdf8' : '#0ea5e9');

  const highlightClass = isTourActive && TOUR_STEPS[tourStep].target === 'diagram' ? "ring-2 ring-emerald-500 z-50 transform scale-[1.01]" : "";

  return (
    <section className={cn("border rounded-sm p-2 relative overflow-hidden group shrink-0 transition-all duration-300", theme.panelBg, highlightClass)}>
       <style dangerouslySetInnerHTML={{__html: `
        .transition-spring { transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
       `}} />
       
       <div className="absolute top-6 right-6 z-20">
         <button onClick={() => setShowWeldability(!showWeldability)} className={showWeldability ? theme.btnPrimary : theme.btnSecondary}>
           {showWeldability ? 'Weld Map: ON' : 'Weld Map: OFF'}
         </button>
       </div>

       <svg ref={svgRef} width="100%" viewBox={`0 0 ${geometry.w} ${geometry.h}`} style={{ touchAction: 'none' }} className={cn("w-full h-full select-none overflow-hidden block rounded-sm outline-none", theme.diagramBgClass, isDragging ? 'cursor-grabbing' : 'cursor-crosshair')} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onKeyDown={handleSVGKeyDown} tabIndex="0" role="application">
          <WeldabilityOverlay />
          <DiagramSkeleton />
          
          <g className="pointer-events-none">
            {historyPointsStr && (
              <>
                <polyline points={historyPointsStr} fill="none" stroke="#ea580c" strokeWidth="4" strokeOpacity="0.2" style={{ filter: 'blur(3px)' }} />
                <polyline points={historyPointsStr} fill="none" stroke="#ea580c" strokeWidth="2" strokeOpacity="0.9" />
              </>
            )}
            {simState.phaseFractions.length > 1 && (
              <line x1={geometry.mapX(simState.phaseFractions[0].pos)} y1={ty} x2={geometry.mapX(simState.phaseFractions[1].pos)} y2={ty} stroke={theme.colors.bainite} strokeWidth="3" strokeOpacity="0.8" />
            )}
            
            <g transform={`translate(${tx}, ${ty})`}>
               {/* Precision Crosshair Target Lines */}
               <line x1={-tx + geometry.m.left} y1="0" x2={geometry.w - geometry.m.right - tx} y2="0" stroke={tempColor} strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
               <line x1="0" y1={-ty + geometry.m.top} x2="0" y2={geometry.h - geometry.m.bottom - ty} stroke={tempColor} strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
               
               {/* Animated Phase-Crossing Pulse Ring */}
               <circle r="16" fill="none" stroke={tempColor} strokeWidth="1.5" className={cn("transition-all duration-500", phaseFlash.active ? 'scale-[3] opacity-0' : 'scale-100 opacity-0')} />
               <circle r="8" fill="none" stroke={tempColor} strokeWidth="1.5" opacity="0.8" />
               
               {/* Fine Sniper Reticle */}
               <line x1="-12" y1="0" x2="-4" y2="0" stroke={tempColor} strokeWidth="1.5" />
               <line x1="4" y1="0" x2="12" y2="0" stroke={tempColor} strokeWidth="1.5" />
               <line x1="0" y1="-12" x2="0" y2="-4" stroke={tempColor} strokeWidth="1.5" />
               <line x1="0" y1="4" x2="0" y2="12" stroke={tempColor} strokeWidth="1.5" />
               <circle r="1" fill={tempColor} />
               
               {/* Coordinate Tooltip Tracker */}
               <g transform={`translate(${tooltipFlip ? -tooltipW - 15 : 15}, -20)`} className="transition-all duration-75 ease-out">
                 <rect width={tooltipW} height="36" rx="2" fill={isDark ? 'rgba(11,12,15,0.95)' : 'rgba(255,255,255,0.95)'} stroke={tempColor} strokeWidth="1" className="shadow-[0_4px_10px_rgba(0,0,0,0.5)] backdrop-blur-md" />
                 <text x={tooltipW/2} y="14" textAnchor="middle" className={cn("font-display text-[12px] tracking-widest uppercase font-semibold", isDark ? 'fill-slate-200' : 'fill-slate-800')}>{simState.regionLabel}</text>
                 <text x={tooltipW/2} y="26" textAnchor="middle" className={cn("font-data text-[10px]", isDark ? 'fill-slate-400' : 'fill-slate-500')}>{parseNum(carbon, 0).toFixed(2)}% C | {parseNum(temp, 0).toFixed(0)}°C</text>
               </g>
            </g>
          </g>
       </svg>
    </section>
  );
};

const KineticsDiagramSection = () => {
  const { carbon, temp, historyTrail, simState, alloy, isTourActive, tourStep } = useThermoState();
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);
  const { theme, isDark } = useThermoAction();
  const { colors } = theme;
  const c = parseNum(carbon, 0); const currentT = parseNum(temp, 20);

  const [hoverData, setHoverData] = useState(null);
  const [diagramMode, setDiagramMode] = useState('cct'); 
  const svgRef = useRef(null);

  const w = 850, h = 400; const m = { top: 40, right: 60, bottom: 60, left: 70 };
  const innerW = w - m.left - m.right; const innerH = h - m.top - m.bottom;
  const minLog = -1; const maxLog = 5; const maxTemp = 900;
  const a1Temp = consts.T_EUTECTOID;

  const mapX = useCallback((time) => m.left + Math.max(0, Math.min(1, (Math.log10(Math.max(0.1, time)) - minLog) / (maxLog - minLog))) * innerW, [minLog, maxLog, innerW, m.left]);
  const mapY = useCallback((t) => m.top + Math.max(0, Math.min(1, 1 - t / maxTemp)) * innerH, [maxTemp, innerH, m.top]);

  const curves = useMemo(() => {
    const alloyShift = (alloy?.mn || 0) * 1.5 + (alloy?.cr || 0) * 2.0 + (alloy?.ni || 0) * 0.5 + (alloy?.mo || 0) * 3.0;
    const cShift = Math.pow(Math.abs(c - 0.76), 1.2) * 1.5 + alloyShift;
    const msTemp = simState.msTemp || 200;
    const isCCT = diagramMode === 'cct';
    const timeLogShift = isCCT ? 0.6 : 0.0; const tempDrop = isCCT ? 35 : 0;

    const getKinetics = (T) => {
      let ps = Infinity, pf = Infinity, bs = Infinity, bf = Infinity;
      const pUpper = a1Temp - tempDrop; const pLower = 200 - tempDrop;
      if (T < pUpper && T > pLower) {
        const cShape = 8000 / (Math.max(0.5, pUpper - T) * Math.max(0.5, T - pLower));
        const logStart = -0.5 + cShift + cShape + Math.pow(Math.abs(T - (580 - tempDrop)) / 70, 2.5) + timeLogShift;
        ps = Math.pow(10, Math.min(12, logStart)); pf = Math.pow(10, Math.min(12, logStart + 1.2 + cShape * 0.05));
      }
      const bUpper = Math.min(consts.T_bs, a1Temp - 10) - tempDrop; const bLower = Math.max(20, msTemp - 50) - tempDrop;
      if (T < bUpper && T > bLower) {
        const cShape = 4000 / (Math.max(0.5, bUpper - T) * Math.max(0.5, T - bLower));
        const logStart = 0.5 + cShift + cShape + Math.pow(Math.abs(T - (400 - tempDrop)) / 60, 2) + timeLogShift;
        bs = Math.pow(10, Math.min(12, logStart)); bf = Math.pow(10, Math.min(12, logStart + 1.5 + cShape * 0.05));
      }
      return { ps, pf, bs, bf };
    };

    const pS = []; const pF = []; const bS = []; const bF = [];
    for (let t = a1Temp; t >= 10; t -= 2) {
       const { ps, pf, bs, bf } = getKinetics(t);
       if (ps < 1e7) { pS.push({x: mapX(ps), y: mapY(t)}); pF.push({x: mapX(pf), y: mapY(t)}); }
       if (bs < 1e7) { bS.push({x: mapX(bs), y: mapY(t)}); bF.push({x: mapX(bf), y: mapY(t)}); }
    }

    let noseTime = Infinity; let noseTemp = 0;
    for (let t = a1Temp; t >= msTemp; t -= 2) {
       const minStart = Math.min(getKinetics(t).ps, getKinetics(t).bs);
       if (minStart < noseTime) { noseTime = minStart; noseTemp = t; }
    }
    
    let criticalRate = noseTime < Infinity ? ((a1Temp - noseTemp) / noseTime) * 1.5 : 0;
    const fanLines = [];
    if (isCCT) {
       fanLines.push({ rate: criticalRate, isCritical: true, path: `M ${mapX(0.1)},${mapY(a1Temp)} L ${mapX(Math.max(0.1, (a1Temp - 20)/criticalRate))},${mapY(20)}`, xEnd: mapX(Math.max(0.1, (a1Temp - 20)/criticalRate)) });
       [0.1, 1, 10, 100].forEach(rate => {
          if (Math.abs(Math.log10(rate) - Math.log10(criticalRate)) > 0.3) fanLines.push({ rate, isCritical: false, path: `M ${mapX(0.1)},${mapY(a1Temp)} L ${mapX(Math.max(0.1, (a1Temp - 20)/rate))},${mapY(20)}`, xEnd: mapX(Math.max(0.1, (a1Temp - 20)/rate)) });
       });
    }

    const mkP = (pts) => pts.length ? `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
    const mkF = (s, f) => (!s.length || !f.length) ? '' : `M ${s[0].x},${s[0].y} ` + s.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') + ' ' + f.slice().reverse().map(p => `L ${p.x},${p.y}`).join(' ') + ' Z';

    return { ps: mkP(pS), pf: mkP(pF), pFill: mkF(pS, pF), bs: mkP(bS), bf: mkP(bF), bFill: mkF(bS, bF), msTemp, criticalRate, fanLines };
  }, [c, mapX, mapY, simState.msTemp, alloy, a1Temp, diagramMode, consts.T_bs]);

  const coolingPath = useMemo(() => {
    if (!historyTrail || historyTrail.length < 2) return '';
    let startTime = historyTrail[0].time;
    for(let i = 1; i < historyTrail.length; i++) { 
      if(historyTrail[i].t < historyTrail[i-1].t && historyTrail[i-1].t >= a1Temp && historyTrail[i].t <= a1Temp) { 
        startTime = historyTrail[i-1].time + ((historyTrail[i-1].t - a1Temp) / (historyTrail[i-1].t - historyTrail[i].t)) * (historyTrail[i].time - historyTrail[i-1].time); break; 
      } 
    }
    if (startTime === historyTrail[0].time) { for(let i = 1; i < historyTrail.length; i++) { if(historyTrail[i].t < historyTrail[i-1].t) { startTime = historyTrail[i-1].time; break; } } }
    let path = '';
    historyTrail.forEach((p) => {
      if (p.t > a1Temp) return; 
      path += path === '' ? `M ${mapX(Math.max(0.1, p.time - startTime + 0.1))},${mapY(p.t)}` : ` L ${mapX(Math.max(0.1, p.time - startTime + 0.1))},${mapY(p.t)}`;
    });
    return path;
  }, [historyTrail, mapX, mapY, a1Temp]);

  const handlePointerMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    let cx = e.clientX; let cy = e.clientY;
    if (e.touches && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    const x = ((cx - rect.left) / rect.width) * w; const y = ((cy - rect.top) / rect.height) * h;
    if (x >= m.left && x <= w - m.right && y >= m.top && y <= h - m.bottom) setHoverData({ x, y, time: Math.pow(10, minLog + ((x - m.left) / innerW) * (maxLog - minLog)), temp: maxTemp * (1 - (y - m.top) / innerH) });
    else setHoverData(null);
  };

  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const highlightClass = isTourActive && TOUR_STEPS[tourStep].target === 'kinetics' ? "ring-2 ring-emerald-500 z-50 transform scale-[1.01]" : "";

  return (
    <section className={cn("border rounded-sm p-4 md:p-6 shrink-0 transition-all duration-300 relative", theme.panelBg, highlightClass)}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-inherit">
        <div>
          <h2 className="font-display text-[16px] tracking-widest uppercase flex items-center gap-2 font-semibold">
            <LineChart size={16} className={theme.textMuted} /> KINETICS
          </h2>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setDiagramMode('ttt')} className={cn(diagramMode === 'ttt' ? theme.btnPrimary : theme.btnSecondary, "font-semibold")}>TTT</button>
           <button onClick={() => setDiagramMode('cct')} className={cn(diagramMode === 'cct' ? theme.btnPrimary : theme.btnSecondary, "font-semibold")}>CCT</button>
        </div>
      </div>

      <div className="w-full overflow-x-auto custom-scrollbar">
         <svg ref={svgRef} width="100%" viewBox={`0 0 ${w} ${h}`} onPointerMove={handlePointerMove} onPointerLeave={() => setHoverData(null)} className={cn("w-full min-w-[600px] h-auto rounded-sm touch-none border cursor-crosshair", theme.diagramBgClass, theme.border)}>
            
            <defs>
               <pattern id="ttt-pearlite" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
                  <rect width="12" height="12" fill={colors.pearlite} opacity={isDark ? "0.2" : "0.1"} />
                  <line x1="0" y1="6" x2="12" y2="6" stroke={isDark ? '#000' : '#fff'} strokeWidth="2" opacity="0.4" />
               </pattern>
               <pattern id="ttt-bainite" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                  <rect width="16" height="16" fill={colors.bainite} opacity={isDark ? "0.2" : "0.1"} />
                  <path d="M 0,8 L 16,8 M 8,0 L 8,16" stroke={isDark ? '#000' : '#fff'} strokeWidth="1" opacity="0.4" />
               </pattern>
               <linearGradient id="martensite-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.martensite} stopOpacity="0.1" />
                  <stop offset="100%" stopColor={colors.martensite} stopOpacity="0.4" />
               </linearGradient>
            </defs>

            <g stroke={gridColor} strokeWidth="1">
               {[0,1,2,3,4,5].map(log => <line key={`gx-${log}`} x1={mapX(Math.pow(10, log))} y1={m.top} x2={mapX(Math.pow(10, log))} y2={h-m.bottom} />)}
               {[200,400,600,800].map(t => <line key={`gy-${t}`} x1={m.left} y1={mapY(t)} x2={w-m.right} y2={mapY(t)} />)}
            </g>

            {diagramMode === 'cct' && curves.fanLines.map((fan, i) => (
               <g key={`fan-${i}`} opacity={fan.isCritical ? "1" : "0.4"}>
                  <path d={fan.path} stroke={fan.isCritical ? colors.martensite : axisColor} strokeWidth={fan.isCritical ? "1.5" : "1"} strokeDasharray={fan.isCritical ? "none" : "4,4"} />
                  <text x={fan.xEnd} y={h - m.bottom - 5} textAnchor="middle" className="font-data text-[10px]" fill={fan.isCritical ? colors.martensite : axisColor}>
                     {fan.rate >= 10 ? Math.round(fan.rate) : fan.rate.toFixed(1)}°C/s
                  </text>
               </g>
            ))}

            {curves.msTemp > 20 && (
                <g>
                    <rect x={m.left} y={mapY(curves.msTemp)} width={innerW} height={Math.max(0, mapY(20) - mapY(curves.msTemp))} fill="url(#martensite-grad)" />
                    <line x1={m.left} y1={mapY(curves.msTemp)} x2={w-m.right} y2={mapY(curves.msTemp)} stroke={colors.martensite} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.8" />
                    <text x={w-m.right + 5} y={mapY(curves.msTemp) + 3} className="font-data text-[10px] font-bold" fill={colors.martensite}>Ms</text>
                    <line x1={m.left} y1={mapY(Math.max(20, curves.msTemp - 215))} x2={w-m.right} y2={mapY(Math.max(20, curves.msTemp - 215))} stroke={colors.martensite} strokeWidth="1" strokeDasharray="2,4" opacity="0.5" />
                    <text x={w-m.right + 5} y={mapY(Math.max(20, curves.msTemp - 215)) + 3} className="font-data text-[10px]" fill={colors.martensite}>Mf</text>
                </g>
            )}

            <line x1={m.left} y1={mapY(a1Temp)} x2={w-m.right} y2={mapY(a1Temp)} stroke="#f43f5e" strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
            <text x={m.left + 5} y={mapY(a1Temp) - 3} className="font-data text-[10px]" fill="#f43f5e" opacity="0.8">A1</text>

            <path d={curves.pFill} fill="url(#ttt-pearlite)" />
            <path d={curves.bFill} fill="url(#ttt-bainite)" />

            <g fill="none" strokeWidth="1.5" strokeLinecap="square">
                <path d={curves.ps} stroke={colors.pearlite} />
                <path d={curves.pf} stroke={colors.pearlite} strokeDasharray="4,4" />
                <path d={curves.bs} stroke={colors.bainite} />
                <path d={curves.bf} stroke={colors.bainite} strokeDasharray="4,4" />
            </g>

            <text x={mapX(100)} y={mapY((a1Temp + Math.max(consts.T_bs, curves.msTemp)) / 2)} className="font-display text-[16px] tracking-widest pointer-events-none font-semibold" fill={colors.pearlite} opacity="0.9" style={{textShadow: isDark ? '0 0 10px #000' : '0 0 10px #fff'}} textAnchor="middle">PEARLITE</text>
            <text x={mapX(100)} y={mapY((Math.max(consts.T_bs, curves.msTemp) + curves.msTemp) / 2)} className="font-display text-[16px] tracking-widest pointer-events-none font-semibold" fill={colors.bainite} opacity="0.9" style={{textShadow: isDark ? '0 0 10px #000' : '0 0 10px #fff'}} textAnchor="middle">BAINITE</text>
            {curves.msTemp > 20 && (
                <text x={mapX(100)} y={mapY(Math.max(20, curves.msTemp - 60))} className="font-display text-[16px] tracking-widest pointer-events-none font-semibold" fill={colors.martensite} opacity="0.8" style={{textShadow: isDark ? '0 0 10px #000' : '0 0 10px #fff'}} textAnchor="middle">MARTENSITE</text>
            )}

            {coolingPath && <path d={coolingPath} fill="none" stroke="#ea580c" strokeWidth="2.5" className="pointer-events-none" />}
            <circle cx={coolingPath ? mapX(Math.max(0.1, historyTrail[historyTrail.length-1]?.time || 0.1)) : mapX(0.1)} cy={mapY(currentT)} r="4" fill="#ea580c" className="pointer-events-none" />

            <path d={`M ${m.left} ${m.top} L ${m.left} ${h - m.bottom} L ${w - m.right} ${h - m.bottom}`} fill="none" stroke={axisColor} strokeWidth="2.5" className="pointer-events-none" />
            
            {[ -1, 0, 1, 2, 3, 4, 5 ].map(log => (
                <g key={`tx-${log}`} transform={`translate(${mapX(Math.pow(10, log))}, ${h - m.bottom})`} className="pointer-events-none">
                    <line y2="4" stroke={axisColor} strokeWidth="1" />
                    <text y="14" textAnchor="middle" className="font-data text-[10px]" fill={axisColor}>{log === -1 ? '0.1' : Math.pow(10, log)}</text>
                </g>
            ))}
            <text x={m.left + innerW/2} y={h - 10} textAnchor="middle" className="font-display text-[10px] tracking-widest pointer-events-none font-semibold" fill={axisColor}>TIME (SECONDS - LOG)</text>

            {[0, 200, 400, 600, 800].map(t => (
                <g key={`ty-${t}`} transform={`translate(${m.left}, ${mapY(t)})`} className="pointer-events-none">
                    <line x2="-4" stroke={axisColor} strokeWidth="1" />
                    <text x="-6" y="3" textAnchor="end" className="font-data text-[10px]" fill={axisColor}>{t}</text>
                </g>
            ))}

            {hoverData && (
              <g className="pointer-events-none">
                <line x1={hoverData.x} y1={m.top} x2={hoverData.x} y2={h - m.bottom} stroke={axisColor} strokeWidth="1" strokeDasharray="2,2" />
                <line x1={m.left} y1={hoverData.y} x2={w - m.right} y2={hoverData.y} stroke={axisColor} strokeWidth="1" strokeDasharray="2,2" />
                <g transform={`translate(${Math.min(hoverData.x + 10, w - 80)}, ${Math.max(hoverData.y - 30, m.top + 10)})`}>
                  <rect width="70" height="28" fill={isDark ? '#0b0c0f' : '#fff'} stroke={axisColor} strokeWidth="1" />
                  <text x="35" y="12" textAnchor="middle" className="font-data text-[10px]" fill="#ea580c">{hoverData.temp.toFixed(0)} °C</text>
                  <text x="35" y="22" textAnchor="middle" className="font-data text-[10px]" fill={axisColor}>{hoverData.time < 60 ? hoverData.time.toFixed(1)+'s' : (hoverData.time/60).toFixed(1)+'m'}</text>
                </g>
              </g>
            )}
         </svg>
      </div>
    </section>
  );
};

const getPhaseColor = (micro, colors) => {
  if (!micro) return colors.ferrite;
  if (micro.includes('Martensite')) return colors.martensite;
  if (micro.includes('Bainite')) return colors.bainite;
  if (micro.includes('Austenite')) return colors.austenite;
  if (micro.includes('Cementite') || micro.includes('Ledeburite')) return colors.cementite;
  if (micro.includes('Pearlite')) return colors.pearlite;
  if (micro.includes('Liquid')) return colors.liquid;
  if (micro.includes('Delta')) return colors.delta;
  return colors.ferrite;
};

const SnapshotSection = () => {
  const { snapshots, setSnapshots, changeMode, setAlloy, setTemp, theme, isDark } = useThermoAction();
  const restoreSnapshot = useCallback((s) => { changeMode('manual', false); setAlloy(s.alloy || { c: s.c, mn: 0.5, si: 0.2, cr: 0, ni: 0, mo: 0, v: 0, cu: 0 }); setTemp(s.t.toString()); }, [changeMode, setAlloy, setTemp]);

  return (
    <section className={cn("border rounded-sm p-4 md:p-6 shrink-0", theme.panelBg)}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-[14px] uppercase tracking-widest flex items-center gap-2 font-semibold">
          <Activity size={14}/> SNAPSHOTS ({snapshots.length})
        </h3>
        <button onClick={() => setSnapshots([])} className="text-red-500 hover:text-red-400 flex items-center gap-2 font-display text-[10px] uppercase tracking-widest transition-colors font-semibold"><Trash2 size={12}/> CLEAR</button>
      </div>
      <div className="overflow-x-auto max-h-60 border border-inherit">
        <table className="w-full text-left border-collapse font-data text-[11px]">
          <thead className={cn("sticky top-0 z-10 font-display text-[12px] tracking-widest", isDark ? 'bg-[#0b0c0f] text-slate-400' : 'bg-slate-100 text-slate-600')}>
            <tr><th className="p-4 border-b border-inherit">STATE</th><th className="p-4 border-b border-inherit">MODE</th><th className="p-4 border-b border-inherit">HV</th><th className="p-4 border-b border-inherit">MICROSTRUCTURE</th></tr>
          </thead>
          <tbody>
            {snapshots.map((s) => (
              <tr 
                key={s.id} 
                onClick={() => restoreSnapshot(s)} 
                title={`Preview: ${s.state.micro}`}
                className={cn(
                  "border-b border-inherit cursor-pointer relative group transition-colors", 
                  isDark ? 'hover:bg-[#2a2d35] even:bg-white/[0.02]' : 'hover:bg-slate-200 even:bg-black/[0.02]'
                )}
              >
                <td className="p-4 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-md" style={{ backgroundColor: getPhaseColor(s.state.micro, theme.colors) }} />
                  <span className="ml-2 font-bold">{(s.alloy?.c || s.c).toFixed(2)}C</span> @ {s.t.toFixed(0)}°C
                </td>
                <td className="p-4 uppercase tracking-wider text-[10px] font-semibold opacity-80">{s.mode}</td>
                <td className="p-4 font-bold">{s.state.hardness.hv}</td>
                <td className="p-4 truncate max-w-[150px] opacity-90 group-hover:text-emerald-500 transition-colors">{s.state.micro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const TelemetrySection = () => {
  const { alloy, carbon, temp, simState, mode, weldStatus, isTourActive, tourStep } = useThermoState();
  const { snapshots, setSnapshots, etchant, setEtchant, theme, isDark, svgRef } = useThermoAction();
  const { colors } = theme;
  const [captureMsg, triggerCapture] = useEphemeralMessage(3000);

  const takeSnapshot = useCallback(() => { 
    setSnapshots(prev => [...prev.slice(-19), { id: Date.now(), alloy: { ...alloy }, c: parseNum(carbon, 0), t: parseNum(temp, 0), mode: mode, state: { ...simState } }]); 
    triggerCapture(); 
  }, [alloy, carbon, temp, mode, simState, setSnapshots, triggerCapture]);

  const downloadSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgClone = svgRef.current.cloneNode(true);
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `text { font-family: 'JetBrains Mono', monospace; }`;
    svgClone.prepend(style);
    const svgData = new XMLSerializer().serializeToString(svgClone);
    ExportEngine.downloadBlob(svgData, "image/svg+xml;charset=utf-8", `SteelLab_Diagram.svg`);
  }, [svgRef]);
  
  const downloadCSV = useCallback(() => ExportEngine.downloadBlob(ExportEngine.generateCSV(alloy, parseNum(temp), simState, snapshots), 'text/csv', `SteelLab_Data.csv`), [alloy, temp, simState, snapshots]);
  const downloadTXT = useCallback(() => ExportEngine.downloadBlob(ExportEngine.generateTXT(alloy, parseNum(temp), mode, simState, weldStatus), 'text/plain', `SteelLab_Report.txt`), [alloy, temp, mode, simState, weldStatus]);

  const highlightClass = isTourActive && TOUR_STEPS[tourStep].target === 'telemetry' ? "ring-2 ring-emerald-500 z-50 transform scale-[1.01]" : "";

  return (
    <section className={cn("border rounded-sm flex flex-col xl:h-full overflow-hidden relative transition-all duration-300", theme.panelBg, highlightClass)}>
      
      <div className={cn("px-6 py-4 border-b flex items-center justify-between shrink-0 z-10 border-inherit", isDark ? 'bg-[#0b0c0f]' : 'bg-[#e2e4e9]')}>
        <div className="flex items-center gap-2">
          <Activity size={16} className={theme.textMuted} />
          <h2 className="font-display text-[16px] tracking-widest uppercase font-semibold">TELEMETRY</h2>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn("flex border rounded-sm overflow-hidden", isDark ? 'border-[#2a2d35]' : 'border-[#caced4]')}>
            <button onClick={downloadTXT} className="p-2 hover:bg-slate-500/20 transition-colors" title="TXT"><Download size={14} /></button>
            <div className={cn("w-px", isDark ? 'bg-[#2a2d35]' : 'bg-[#caced4]')}></div>
            <button onClick={downloadSVG} className="p-2 hover:bg-slate-500/20 transition-colors" title="SVG"><ImageIcon size={14} /></button>
            <div className={cn("w-px", isDark ? 'bg-[#2a2d35]' : 'bg-[#caced4]')}></div>
            <button onClick={downloadCSV} className="p-2 hover:bg-slate-500/20 transition-colors" title="CSV"><FileSpreadsheet size={14} /></button>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
        
        {/* TIER 1: MICROSTRUCTURE DISPLAY */}
        <div className="p-6 flex flex-col items-center border-b border-inherit bg-black/5 dark:bg-black/20">
           <div className="flex justify-between items-center w-full mb-2">
             <h3 className="font-display text-[14px] uppercase tracking-widest flex items-center gap-2 font-semibold"><Layers size={14}/> MORPHOLOGY</h3>
             <select value={etchant} onChange={(e) => setEtchant(e.target.value)} className={cn("px-2 py-1 border rounded-sm font-display text-[10px] tracking-widest uppercase focus:outline-none cursor-pointer font-semibold", isDark ? 'bg-[#181a20] border-slate-700' : 'bg-white border-slate-300')}>
               <option value="nital">NITAL ETCH</option><option value="picral">PICRAL ETCH</option><option value="polished">POLISHED</option>
             </select>
           </div>
           
           <MicrostructureDisplay onCapture={takeSnapshot}/>
           <div className="font-data text-[12px] text-center font-bold px-2 mt-4 text-indigo-500">{simState.micro}</div>

           {/* Phase Constitution Integrated into Tier 1 */}
           <div className="w-full mt-6 space-y-2">
              <div className={cn("flex h-3 w-full rounded-sm overflow-hidden border", isDark ? 'border-[#2a2d35]' : 'border-[#caced4]')}>
                {simState.phaseFractions.map((f, i) => {
                  let color = colors.ferrite;
                  if (f.name.includes('Austenite')) color = colors.austenite;
                  if (f.name.includes('Cementite') || f.name.includes('Ledeburite')) color = colors.cementite;
                  if (f.name.includes('Martensite')) color = colors.martensite;
                  if (f.name.includes('Liquid')) color = colors.liquid;
                  return <div key={i} className="transition-all duration-500 ease-out" style={{width: `${f.frac}%`, backgroundColor: color}} />
                })}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {simState.phaseFractions.map((f, i) => {
                  let color = colors.ferrite;
                  if (f.name.includes('Austenite')) color = colors.austenite;
                  if (f.name.includes('Cementite') || f.name.includes('Ledeburite')) color = colors.cementite;
                  if (f.name.includes('Martensite')) color = colors.martensite;
                  if (f.name.includes('Liquid')) color = colors.liquid;
                  return (
                     <div key={i} className="flex items-center gap-1.5 font-display text-[11px] tracking-widest uppercase opacity-80 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-sm block" style={{backgroundColor: color}}></span> {f.name} ({f.frac.toFixed(1)}%)
                     </div>
                  )
                })}
              </div>
           </div>
        </div>
        
        {/* TIER 2: PRIMARY INSTRUMENT GAUGES */}
        <div className="p-6 grid grid-cols-2 gap-4 border-b border-inherit bg-white/50 dark:bg-[#181a20]">
           <InstrumentGauge label="YIELD STRENGTH" value={simState.yield} unit="MPa" max={2500} colorHex="#3b82f6" isDark={isDark} />
           <InstrumentGauge label="HARDNESS" value={simState.hardness.hv} unit="HV" max={1000} colorHex="#a855f7" isDark={isDark} />
        </div>

        {/* TIER 3: TERTIARY READOUTS */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-inherit bg-black/5 dark:bg-black/20">
           <CompactStat label="ULT. TENSILE" val={simState.uts} unit="MPa" isDark={isDark} />
           <CompactStat label="ELONGATION" val={simState.elong} unit="%" isDark={isDark} />
           <CompactStat label="FATIGUE" val={simState.fatigue} unit="MPa" isDark={isDark} />
           <CompactStat label="DBTT" val={simState.dbtt} unit="°C" isDark={isDark} />
        </div>

        {/* SECONDARY INFO: CRYSTAL & WELDABILITY & COOLING */}
        <div className="p-6 flex flex-col gap-6">
            <div className="flex w-full gap-4">
               <div className={cn("flex flex-col items-center justify-center p-4 border rounded-sm w-1/3 relative shadow-inner", isDark?'bg-[#0f1115] border-[#2a2d35]':'bg-[#e2e4e9] border-[#caced4]')}>
                  {simState.crystal === 'BCC' && parseNum(temp, 20) < CONSTANTS.FE_C.T_CURIE && <div className="absolute top-2 right-2 text-red-500 opacity-80"><Magnet size={12}/></div>}
                  <CrystalCell type={simState.crystal} a_param={simState.paramA} c_param={simState.paramC} isDark={isDark} />
                  <div className="font-display text-[10px] tracking-widest mt-2 opacity-80 font-semibold">{simState.crystal} LATTICE</div>
                  <div className="font-data text-[9px] opacity-80 text-center mt-1">a={simState.paramA.toFixed(3)}Å <br/> {simState.crystal==='BCT' && `c=${simState.paramC.toFixed(3)}Å`}</div>
               </div>
               <div className={cn("flex flex-col justify-center p-4 border rounded-sm w-2/3 shadow-inner", weldStatus.bg)}>
                  <div className="flex items-center gap-2 mb-2">
                     <Shield size={14} className={weldStatus.color} />
                     <div className={cn("font-display text-[12px] tracking-widest uppercase font-semibold", weldStatus.color)}>WELDABILITY</div>
                  </div>
                  <div className="flex justify-between items-end">
                     <div className={cn("font-display text-[18px] font-semibold", weldStatus.color)}>{weldStatus.rating}</div>
                     <div className={cn("font-data text-[10px] font-semibold", weldStatus.color)}>CE: {weldStatus.ce}</div>
                  </div>
                  <div className={cn("font-data text-[10px] opacity-90 mt-2", weldStatus.color)}>{weldStatus.desc}</div>
               </div>
            </div>

            <CoolingCurvePlot />
        </div>

      </div>

      {captureMsg && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-sm font-display tracking-widest text-[12px] uppercase shadow-lg animate-in slide-in-from-bottom-2 z-50 pointer-events-none">
          SNAPSHOT SAVED TO LOG
        </div>
      )}
    </section>
  );
};

const CreatorSection = () => {
  const { isDark } = useThermoAction();
  return (
    <div className={cn("p-6 border border-t-0 flex flex-col gap-4 shrink-0 z-10 rounded-b-sm", isDark ? 'bg-[#181a20] border-[#2a2d35]' : 'bg-white border-[#caced4]')}>
      <div className="flex items-center gap-4">
        <div className={cn("p-2 rounded-none border", isDark ? 'bg-[#0b0c0f] border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-300 text-slate-600')}>
          <GraduationCap size={20} strokeWidth={2} />
        </div>
        <div>
          <h4 className="font-display text-[16px] tracking-widest flex items-center gap-2">ABDULRAHMAN SAEED <span className="font-data text-[9px] px-1 border border-current opacity-80 font-bold">2026</span></h4>
          <p className="font-data text-[10px] opacity-80 mt-1">Creator & Lead Developer</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 mt-2 font-data text-[10px] opacity-80">
        <div className="flex items-center gap-2"><BookOpen size={12} /> Metallurgical & Materials Engineering</div>
        <div className="flex items-center gap-2"><MapPin size={12} /> AFIT, Kaduna</div>
      </div>
    </div>
  );
};

const GuidedDiscoveryOverlay = () => {
  const state = useThermoState();
  const { setGuidedScenarioId, setGuidedStep, isDark, theme } = useThermoAction();
  const scenario = SCENARIOS[state.guidedScenarioId];
  const [isStepMet, setIsStepMet] = useState(false);

  useEffect(() => {
    if (!scenario) return;
    setIsStepMet(scenario.steps[state.guidedStep]?.check(state) || false);
  }, [state, scenario, state.guidedStep]);

  useEffect(() => {
    if (isStepMet && scenario && state.guidedStep < scenario.steps.length - 1) {
       const timer = setTimeout(() => { setGuidedStep(g => g + 1); setIsStepMet(false); }, 1000);
       return () => clearTimeout(timer);
    }
  }, [isStepMet, state.guidedStep, scenario, setGuidedStep]);

  if (state.guidedScenarioId === null) return null;

  return (
    <div className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50 rounded-sm border p-2 animate-in slide-in-from-bottom-8 duration-500", isDark ? 'bg-[#181a20]/95 border-[#d97706] backdrop-blur-md' : 'bg-white/95 border-[#d97706] backdrop-blur-md')}>
      <div className="p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-[#d97706]">
            <Compass size={16} />
            <h3 className="font-display text-[14px] uppercase tracking-widest">{scenario.title}</h3>
          </div>
          <button onClick={() => { setGuidedScenarioId(null); setGuidedStep(0); }} className="opacity-80 hover:opacity-100 p-2"><X size={14} /></button>
        </div>
        <div className="flex gap-2 w-full">
          {scenario.steps.map((_, i) => <div key={i} className={cn("h-1 flex-1", i < state.guidedStep ? 'bg-emerald-500' : i === state.guidedStep ? 'bg-[#d97706] animate-pulse' : 'bg-slate-700')} />)}
        </div>
        <div className={cn("p-4 border rounded-sm flex items-start gap-4", isDark ? 'bg-[#0b0c0f] border-slate-800' : 'bg-slate-50 border-slate-200')}>
           {isStepMet ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" /> : <Target size={18} className="text-[#d97706] shrink-0 mt-0.5" />}
           <p className="font-data text-[12px] leading-relaxed">{scenario.steps[state.guidedStep].text}</p>
        </div>
        <div className="flex justify-between items-center mt-2 border-t border-inherit pt-4">
          <select value={state.guidedScenarioId} onChange={(e) => { setGuidedScenarioId(parseInt(e.target.value)); setGuidedStep(0); }} className="font-display text-[10px] uppercase tracking-widest bg-transparent cursor-pointer focus:outline-none opacity-60">
            {SCENARIOS.map((scen, i) => <option key={i} value={i}>GUIDE: {scen.title}</option>)}
          </select>
          {state.guidedStep === scenario.steps.length - 1 && isStepMet && <div className="font-display text-[10px] text-emerald-500 tracking-widest">COMPLETE</div>}
        </div>
      </div>
    </div>
  );
};

const AppTourOverlay = () => {
  const { isTourActive, tourStep } = useThermoState();
  const { setTourStep, setHasSeenTour, isDark, theme } = useThermoAction();
  if (!isTourActive) return null;
  const currentStep = TOUR_STEPS[tourStep];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40" />
      <div className={cn("fixed bottom-12 md:top-1/2 md:-translate-y-1/2 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[60] border rounded-sm p-6 animate-in zoom-in-95", isDark ? 'bg-[#181a20] border-emerald-600 text-slate-200' : 'bg-white border-emerald-600 text-slate-800')}>
        <div className="flex justify-between items-center mb-4">
           <span className="font-display text-[10px] tracking-widest text-emerald-500 border border-emerald-500 px-2 py-1">STEP {tourStep + 1} / {TOUR_STEPS.length}</span>
           <button onClick={() => setHasSeenTour(true)} className="font-display text-[10px] tracking-widest opacity-60 hover:opacity-100 p-2">SKIP</button>
        </div>
        <h3 className="font-display text-[20px] tracking-widest mb-4">{currentStep.title}</h3>
        <p className="font-data text-[12px] leading-relaxed opacity-80 mb-6">{currentStep.text}</p>
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {TOUR_STEPS.map((_, i) => <div key={i} className={cn("h-1 transition-all", i === tourStep ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-700')} />)}
          </div>
          <button onClick={() => { if (tourStep >= TOUR_STEPS.length - 1) setHasSeenTour(true); else setTourStep(tourStep + 1); }} className={theme.btnPrimary}>
             {tourStep >= TOUR_STEPS.length - 1 ? 'INITIALIZE' : 'NEXT'} <SkipForward size={14}/>
          </button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// MAIN APPLICATION COMPONENT (ENTRY POINT)
// ============================================================================
const MainLayout = () => {
  const { phaseFlash, isPending } = useThermoState();
  const { theme, snapshots } = useThermoAction();
  
  return (
    <div className={cn("min-h-screen transition-colors duration-500 flex flex-col selection:bg-emerald-500/30 overflow-hidden relative", theme.bg, theme.textMain)}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700;800&display=swap');
        .font-display { font-family: 'Barlow Condensed', sans-serif; }
        .font-data { font-family: 'JetBrains Mono', monospace; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}} />

      <div className={cn("fixed top-0 left-0 h-1 bg-emerald-500 z-[100] transition-all duration-300", isPending ? "w-full animate-pulse shadow-[0_0_10px_#10b981]" : "w-0")} />
      <div className={cn("absolute inset-0 z-40 pointer-events-none transition-all duration-300")} style={{ backgroundColor: phaseFlash.color }} />
      
      <TopNav />
      <AppTourOverlay />
      <GuidedDiscoveryOverlay />

      <main className="flex-1 p-4 md:p-6 max-w-[1900px] w-full mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 overflow-y-auto xl:overflow-hidden relative">
        <div className="xl:col-span-8 flex flex-col gap-6 xl:overflow-y-auto custom-scrollbar xl:pr-2 xl:h-[calc(100vh-80px)] xl:pb-24">
          <ControlsSection />
          <InverseDesignSection />
          <DiagramSection />
          <KineticsDiagramSection />
          {snapshots.length > 0 && <SnapshotSection />}
        </div>

        <div className="xl:col-span-4 flex flex-col gap-0 xl:h-[calc(100vh-100px)]">
          <TelemetrySection />
          <CreatorSection />
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThermoProvider>
        <MainLayout />
      </ThermoProvider>
    </ErrorBoundary>
  );
}