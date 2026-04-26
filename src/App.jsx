import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback, useTransition } from 'react';
import { 
  Target, Layers, Zap, Search, Sun, Moon, 
  GraduationCap, MapPin, BookOpen, MousePointerClick, 
  Beaker, Flame, Activity, Download, Camera, Plus, Minus, 
  Shield, LineChart, FileSpreadsheet, Trash2, Lightbulb, 
  AlertTriangle, Info, Database, Share2, Loader2,
  RefreshCw, Crosshair, Image as ImageIcon, Magnet, Github, Link as LinkIcon, Wand2, Settings, ChevronDown, ChevronUp
} from 'lucide-react';

// ============================================================================
// MODULE: CONFIGURATION & CONSTANTS
// ============================================================================
const APP_VERSION = "v16.0 PRO (JMAK CCT Kinetics)";

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

// ============================================================================
// MODULE: UTILITIES & MATERIAL SCIENCE HELPERS
// ============================================================================
const cn = (...classes) => classes.filter(Boolean).join(' ');
const parseNum = (val, fallback = 0) => { const n = parseFloat(val); return isNaN(n) ? fallback : n; };
const seededRandom = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };

const getCarbonEquivalent = (c, mn=0.5, cr=0, mo=0, v=0, ni=0, cu=0) => {
  return c + (mn/6) + ((cr + mo + v)/5) + ((ni + cu)/15);
};

const getWeldability = (alloy) => {
  let ce = getCarbonEquivalent(alloy.c, alloy.mn, alloy.cr, alloy.mo, alloy.v, alloy.ni, alloy.cu);

  if (ce <= 0.35) return { rating: 'Excellent', ce: ce.toFixed(2), desc: 'No pre-heat needed', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
  if (ce <= 0.50) return { rating: 'Fair', ce: ce.toFixed(2), desc: 'Pre-heat required (100-200°C)', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
  if (alloy.c <= CONSTANTS.FE_C.C_AUSTENITE_MAX) return { rating: 'Poor', ce: ce.toFixed(2), desc: 'High crack risk. Post-weld heat treat.', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' };
  return { rating: 'Unweldable', ce: ce.toFixed(2), desc: 'Cast Iron structure (brittle)', color: 'text-red-600', bg: 'bg-red-600/10 border-red-600/20' };
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

// ============================================================================
// MODULE: THERMODYNAMIC & KINETIC ENGINE
// ============================================================================

const KineticEngine = {
  // Avrami equation — fraction transformed X at time t:
  avrami: (t, k, n) => 1 - Math.exp(-k * Math.pow(Math.max(0, t), n)),
  
  // Isothermal start time for pearlite — Kirkaldy 1983 adaptation:
  pearliteStartTime: (T, alloy, consts) => {
    const { mn, cr, mo } = alloy;
    const dT = Math.max(1, consts.T_EUTECTOID - T); // undercooling
    const alloyFactor = Math.exp(1.0 * mn + 0.7 * cr + 1.2 * mo);
    return alloyFactor * Math.exp(23500 / (8.314 * (T + 273))) / Math.pow(dT, 3);
  }, 

  // Scheil's additivity — integrates over continuous cooling path:
  getCCTTransformation: (coolingPath, alloy, consts) => {
    let pearliteSum = 0;
    let bainiteSum = 0;
    let X_pearlite = 0;
    let X_bainite = 0;
    let pearliteStartT = null;
    let bainiteStartT = null;

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
    const X_martensite = T_final < consts.T_ms
      ? 1 - Math.exp(-0.011 * (consts.T_ms - T_final))
      : 0;
      
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
    
    // Eutectoid temperature shift — each element moves A1 (Andrews 1965):
    const dT_eutectoid = -(16.9 * ni) + (29.1 * si) + (16.9 * cr) - (10.7 * mn) + (290 * v) + (6.38 * mo);
    
    // Eutectoid carbon shift — carbide formers (Cr, Mo) lower it:
    const dC_eutectoid = -(0.018 * mn) - (0.022 * si) + (0.031 * mo) - (0.0075 * cr) + (0.018 * ni);
    
    // Approximate A3 shift to keep diagram topologically coherent
    const dT_A3 = -(14 * ni) + (44 * si) + (10 * cr) - (35 * mn) + (60 * mo);

    // Ms temperature — Krauss equation:
    const Ms = 539 - (423 * c) - (30.4 * mn) - (17.7 * ni) - (12.1 * cr) - (7.5 * mo);
    
    // Martensite finish temperature (Steven & Haynes):
    const Mf = Ms - 215; 
    
    // Bainite start:
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
  
  c_alpha: (T, consts) => {
    if (T > consts.T_A3_PURE) return 0;
    if (T >= consts.T_EUTECTOID) return CONSTANTS.FE_C.C_FERRITE_MAX * ((consts.T_A3_PURE - T) / (consts.T_A3_PURE - consts.T_EUTECTOID));
    return CONSTANTS.FE_C.C_FERRITE_MAX * Math.pow(Math.max(0, T) / consts.T_EUTECTOID, 3);
  },
  
  c_a3: (T, consts) => {
    if (T > consts.T_A3_PURE) return 0;
    if (T < consts.T_EUTECTOID) return consts.C_EUTECTOID;
    return consts.C_EUTECTOID * Math.pow((consts.T_A3_PURE - T) / (consts.T_A3_PURE - consts.T_EUTECTOID), 0.9);
  },
  
  c_acm: (T, consts) => {
    if (T < consts.T_EUTECTOID) return consts.C_EUTECTOID;
    if (T > CONSTANTS.FE_C.T_EUTECTIC) return CONSTANTS.FE_C.C_AUSTENITE_MAX;
    return consts.C_EUTECTOID + (CONSTANTS.FE_C.C_AUSTENITE_MAX - consts.C_EUTECTOID) * Math.pow((T - consts.T_EUTECTOID) / (CONSTANTS.FE_C.T_EUTECTIC - consts.T_EUTECTOID), 1.4);
  },
  
  c_solidus: (T) => {
    if (T < CONSTANTS.FE_C.T_EUTECTIC) return CONSTANTS.FE_C.C_AUSTENITE_MAX;
    if (T > CONSTANTS.FE_C.T_PERITECTIC) return CONSTANTS.FE_C.C_PERITECTIC_G;
    return CONSTANTS.FE_C.C_PERITECTIC_G + (CONSTANTS.FE_C.C_AUSTENITE_MAX - CONSTANTS.FE_C.C_PERITECTIC_G) * Math.pow((CONSTANTS.FE_C.T_PERITECTIC - T) / (CONSTANTS.FE_C.T_PERITECTIC - CONSTANTS.FE_C.T_EUTECTIC), 0.85);
  },
  
  c_liquidus: (T) => {
    if (T < CONSTANTS.FE_C.T_EUTECTIC) return CONSTANTS.FE_C.C_EUTECTIC;
    if (T > CONSTANTS.FE_C.T_PERITECTIC) return CONSTANTS.FE_C.C_PERITECTIC_L;
    return CONSTANTS.FE_C.C_PERITECTIC_L + (CONSTANTS.FE_C.C_EUTECTIC - CONSTANTS.FE_C.C_PERITECTIC_L) * Math.pow((CONSTANTS.FE_C.T_PERITECTIC - T) / (CONSTANTS.FE_C.T_PERITECTIC - CONSTANTS.FE_C.T_EUTECTIC), 0.85);
  },
  
  c_l_fe3c: (T) => {
    if (T < CONSTANTS.FE_C.T_EUTECTIC) return CONSTANTS.FE_C.C_EUTECTIC;
    return CONSTANTS.FE_C.C_EUTECTIC + (CONSTANTS.FE_C.C_CEMENTITE - CONSTANTS.FE_C.C_EUTECTIC) * ((T - CONSTANTS.FE_C.T_EUTECTIC) / 103);
  },

  leverRule: function(id, name1, name2, c_bulk, c1, c2) {
    const span = Math.abs(c2 - c1);
    if (span <= 1e-4) return { regionId: id, fractions: [{ name: name1, frac: 100, pos: c1 }] };
    
    const clampedC = Math.max(Math.min(c1, c2), Math.min(c_bulk, Math.max(c1, c2)));
    let w2 = (Math.abs(clampedC - c1) / span) * 100;
    
    return {
      regionId: id,
      fractions: [
        { name: name1, frac: Math.max(0, Math.min(100, 100 - w2)), pos: c1 },
        { name: name2, frac: Math.max(0, Math.min(100, w2)), pos: c2 }
      ]
    };
  },

  singlePhase: function(id, name, c_bulk) {
    return { regionId: id, fractions: [{ name, frac: 100, pos: c_bulk }] };
  },

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
      let c_sol = this.c_solidus(safeT);
      let c_liq = this.c_liquidus(safeT);
      let c_lf = this.c_l_fe3c(safeT);
      if (safeC <= c_sol) return this.singlePhase('gamma', 'Austenite (γ)', safeC);
      if (safeC < c_liq) return this.leverRule('gamma_L', 'Austenite (γ)', 'Liquid', safeC, c_sol, c_liq);
      if (safeC <= c_lf) return this.singlePhase('L', 'Liquid', safeC);
      return this.leverRule('L_Fe3C', 'Liquid', 'Cementite (Fe₃C)', safeC, c_lf, CONSTANTS.FE_C.C_CEMENTITE);
    }
    if (safeT > consts.T_EUTECTOID) {
      let c_a3_val = this.c_a3(safeT, consts);
      let c_acm_val = this.c_acm(safeT, consts);
      let c_al = this.c_alpha(safeT, consts);
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

    // Strict Thermodynamic Phase Fractions (lever rule)
    let { regionId, fractions: phaseFractions } = this.calculateEquilibrium(safeC, safeT, alloyObj);

    const msTemp = consts.T_ms;
    const mfTemp = consts.T_mf; 
    const bsTemp = consts.T_bs;

    let microState = { isQuenched: false, isMetastable: false, isBainitic: false, isTempered: false, martensiteFrac: 0 };
    let activeRate = Math.max(rate, maxRateExperienced);
    
    // Morphological Microconstituents (Defaults to phases)
    let microFractions = [...phaseFractions];

    let effHistory = historyTrail;
    // Generate robust synthetic path if history is missing but we're actively cooling (e.g. Inv. Design)
    if (effHistory.length < 2 && activeRate > 0) {
        effHistory = [];
        let time = 0;
        const startT = Math.max(safeT, 900);
        for (let t = startT; t >= safeT; t -= 5) {
            effHistory.push({ t, time, c: safeC });
            time += 5 / activeRate;
        }
    }

    // Non-equilibrium Transformations using JMAK / Scheil Kinetics
    if (safeC < CONSTANTS.FE_C.C_AUSTENITE_MAX && safeT <= consts.T_EUTECTOID) {
      if (processMode === 'temper' && maxRateExperienced >= CONSTANTS.RATES.CRITICAL_MARTENSITE) {
        microState.isTempered = true;
        regionId = 'tempered_martensite';
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
          phaseFractions = JSON.parse(JSON.stringify(dynFractions)); // Sync phaseFractions to properly route property models
          
          microState.isQuenched = martensite > 0.1;
          microState.martensiteFrac = martensite;
          microState.isBainitic = bainite > Math.max(pearlite, martensite);
          microState.isMetastable = retained_austenite > 0.5 && safeT > consts.T_ms;

          if (microState.isQuenched) regionId = 'martensite';
          else if (microState.isBainitic) regionId = 'bainite';
          else if (microState.isMetastable) regionId = 'gamma_metastable';
        }
      }
    }

    // Microconstituent logic for equilibrium structures at Room Temp (Fallback if CCT didn't run or completed purely to Pearlite)
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
    let fGamma = getF('Austenite'), fAlpha = getF('Ferrite'), fDelta = getF('Delta'), 
        fCem = getF('Cementite'), fMart = getF('Martensite');

    const consts = this.getAlloyAdjustedConstants(alloy);

    // ── 1. GRAIN SIZE (ASTM → diameter in mm) ──────────────────────────
    const effectiveT = T < consts.T_EUTECTOID ? consts.T_EUTECTOID : T;
    let grainSizeASTM = Math.max(1, 10 - Math.max(0, effectiveT - 700) / 150); 
    if (coolingRate > 5) grainSizeASTM += Math.min(4, coolingRate / 10); 
    if (microState.isQuenched) grainSizeASTM = Math.min(14, grainSizeASTM + 4);
    const d_mm = Math.pow(2, -(grainSizeASTM + 1)) * 25.4; // Valid ASTM conversion

    // ── 2. SOLID SOLUTION STRENGTHENING — Pickering & Gladman 1972 ─────
    const { mn, si, cr, ni, mo, cu, v } = alloy;
    const c_in_solution = microState.isQuenched ? c : Math.min(c, 0.022);
    const sigma_ss = (32 * mn) + (84 * si) + (38 * cu) + (11 * mo) + (15 * cr) + (600 * Math.sqrt(c_in_solution));

    // ── 3. HALL-PETCH GRAIN BOUNDARY STRENGTHENING ─────────────────────
    const sigma_0 = 53.9; // Friction stress of pure iron
    const k_y = 17.4;     // Standard Petch coefficient
    const sigma_hp = k_y / Math.sqrt(d_mm);

    // ── 4. MARTENSITE HARDENING — Speich & Warlimont 1968 ──────────────
    let hv_mart_safe = 0;
    if (microState.isQuenched || microState.isTempered) {
      hv_mart_safe = 127 + (949 * c) + (27 * si) + (11 * mn) + (8 * ni) + (16 * cr);
      if (v > 0.01) hv_mart_safe += 21 * Math.log10(v);
      hv_mart_safe = Math.max(100, hv_mart_safe);
    }

    // ── 5. PEARLITE SPACING CONTRIBUTION ──────────────────────────────
    let fPearlite = microFractions.find(f => f.name.includes('Pearlite'))?.frac / 100 || 0;
    
    if (fPearlite === 0 && !microState.isQuenched && !microState.isBainitic && !microState.isTempered && !microState.isMetastable && T < consts.T_EUTECTOID) {
       if (c < CONSTANTS.FE_C.C_FERRITE_MAX) fPearlite = 0;
       else if (c <= consts.C_EUTECTOID) fPearlite = (c - CONSTANTS.FE_C.C_FERRITE_MAX) / (consts.C_EUTECTOID - CONSTANTS.FE_C.C_FERRITE_MAX);
       else if (c <= CONSTANTS.FE_C.C_AUSTENITE_MAX) fPearlite = (CONSTANTS.FE_C.C_CEMENTITE - c) / (CONSTANTS.FE_C.C_CEMENTITE - consts.C_EUTECTOID);
       else fPearlite = Math.max(0, (6.67 - c) / (6.67 - 0.76) * (CONSTANTS.FE_C.C_AUSTENITE_MAX/c)); // Appx for Cast Iron matrix
    }
    fPearlite = Math.max(0, Math.min(1, fPearlite));

    // Under-cooling defines spacing S0. Faster cool = finer spacing. Ridley 1984 adaptation.
    const formUndercooling = Math.max(10, 10 * Math.sqrt(Math.max(0.1, coolingRate || 1)));
    const S0_mm = 8.02e-4 / formUndercooling; 
    const sigma_pearlite = fPearlite > 0.01 ? fPearlite * (286 + 2.18 / Math.sqrt(S0_mm)) : 0;

    // ── 6. BAINITE — Bhadeshia model ──────────────────────────────────
    let fBainite = microFractions.find(f => f.name.includes('Bainite'))?.frac / 100 || 0;
    const sigma_bainite = (microState.isBainitic || fBainite > 0.01) ? (395 * Math.sqrt(c)) + (68 * mn) + (75 * si) + (15 * ni) + (183 * mo) : 0;

    // ── 7. THERMAL SOFTENING ──────────────────────────────────────────
    const Tm_K = (CONSTANTS.FE_C.T_MELT + 273);
    const T_K = T + 273;
    const thermalFactor = T_K < 0.3 * Tm_K ? 1.0 : Math.exp(-3.5 * Math.pow((T_K - 0.3 * Tm_K) / (0.7 * Tm_K), 1.8));

    // ── 8. ASSEMBLE ─────────────────────────────────────────────────────
    let yieldStr = (sigma_0 + sigma_ss + sigma_hp + sigma_pearlite + sigma_bainite) * thermalFactor;
    
    if (microState.isQuenched) yieldStr = (hv_mart_safe * 3.3) * thermalFactor; // Empirical HV -> MPa Yield
    if (microState.isTempered) yieldStr = (hv_mart_safe * 3.3 * 0.75) * thermalFactor; // Tempering relief
    
    if (T >= consts.T_EUTECTOID && !microState.isQuenched && !microState.isBainitic && !microState.isMetastable) {
       // High temp austenite / delta baseline before thermal softening drops it further
       let baseHighT = (fGamma * 150) + (fDelta * 100);
       yieldStr = Math.max(yieldStr, baseHighT * thermalFactor);
    }

    // ── 9. UTS & STRAIN HARDENING (Hollomon + Considere Criterion) ──────
    const n_strain_harden = microState.isQuenched ? 0.05 : Math.max(0.05, 0.22 - (0.14 * c));
    // Scientifically robust translation of True Yield -> Eng UTS 
    // True Yield ~ K(0.002)^n. Eng UTS = K(n)^n * exp(-n). 
    const utsMultiplier = Math.pow(n_strain_harden / 0.002, n_strain_harden) * Math.exp(-n_strain_harden);
    let uts = yieldStr * utsMultiplier;
    uts = Math.max(yieldStr * 1.05, uts); // Safety bound

    // ── 10. ELONGATION & HARDNESS ─────────────────────────────────────
    let elong = microState.isQuenched ? Math.max(1, 18 - (30 * c)) : Math.min(45, 10 + (50 * n_strain_harden));
    elong = elong * (1 + (1 - thermalFactor)); // More ductile at high temp

    let hv = microState.isQuenched ? hv_mart_safe : (yieldStr / 3.3);
    if (microState.isTempered) hv = hv_mart_safe * 0.8;
    hv = hv * thermalFactor;

    // ── 11. SECONDARY PROPERTIES (Crystal, Fracture) ──────────────────
    let fatigueLimit = T > 600 ? 0 : Math.min(uts * 0.5, 700);
    let dbtt = -50 + (c * 200) - (grainSizeASTM * 5) + (mn * -30) + (ni * -25) + (si * 44) + (cr * 10); 
    if (microState.isQuenched) dbtt += 150; 
    if (microState.isBainitic) dbtt -= 20; 
    if (microState.isTempered) dbtt -= 50; 

    let crystal = 'Mixed';
    let a = 2.866, c_param = 2.866; 
    if (fGamma > 0.5 || microState.isMetastable) { crystal = 'FCC'; a = 3.56 + 0.03 * c; c_param = a; }
    else if (microState.isQuenched && (microState.martensiteFrac > 0.5 || fMart > 0.5)) { crystal = 'BCT'; a = 2.866 - 0.013 * c; c_param = 2.866 + 0.116 * c; }
    else if (fAlpha > 0.5 || fDelta > 0.5 || microState.isTempered || microState.isBainitic) { crystal = 'BCC'; a = 2.866; c_param = a; }

    let micro = 'Mixed Phase';
    if (microState.isTempered) micro = 'Tempered Martensite (Ferrite + Fine Fe₃C carbides)';
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

// ============================================================================
// MODULE: OPTIMIZATION ENGINE (NELDER-MEAD SIMPLEX)
// ============================================================================
const NelderMead = {
  // Minimize f(x) where x = [c, mn, si, cr, ni, mo]
  minimize: function(f, x0, options = {}) {
    const { maxIter = 200, tol = 1e-4, alpha = 1, beta = 0.5, gamma = 2 } = options;
    const n = x0.length;
    
    // Initialize simplex — n+1 vertices around starting point:
    let simplex = [x0];
    for (let i = 0; i < n; i++) {
      const vertex = [...x0];
      vertex[i] = x0[i] !== 0 ? x0[i] * 1.05 : 0.05;
      simplex.push(vertex);
    }
    
    const clampComposition = (x) => [
      Math.max(0.01, Math.min(2.0, x[0])),  // C: 0.01–2.0%
      Math.max(0.1,  Math.min(2.0, x[1])),  // Mn: 0.1–2.0%
      Math.max(0.1,  Math.min(1.5, x[2])),  // Si: 0.1–1.5%
      Math.max(0,    Math.min(5.0, x[3])),  // Cr: 0–5%
      Math.max(0,    Math.min(4.0, x[4])),  // Ni: 0–4%
      Math.max(0,    Math.min(1.0, x[5])),  // Mo: 0–1%
    ];

    for (let iter = 0; iter < maxIter; iter++) {
      // Sort by function value:
      simplex.sort((a, b) => f(a) - f(b));
      
      // Check convergence:
      const fBest = f(simplex[0]);
      const fWorst = f(simplex[n]);
      if (Math.abs(fWorst - fBest) < tol) break;

      // Centroid of best n points:
      const centroid = x0.map((_, j) =>
        simplex.slice(0, n).reduce((sum, v) => sum + v[j], 0) / n
      );

      // Reflection:
      const xr = clampComposition(centroid.map((c, j) => c + alpha * (c - simplex[n][j])));
      if (f(xr) < f(simplex[n-1]) && f(xr) >= f(simplex[0])) {
        simplex[n] = xr;
        continue;
      }

      // Expansion:
      if (f(xr) < f(simplex[0])) {
        const xe = clampComposition(centroid.map((c, j) => c + gamma * (xr[j] - c)));
        simplex[n] = f(xe) < f(xr) ? xe : xr;
        continue;
      }

      // Contraction:
      const xc = clampComposition(centroid.map((c, j) => c + beta * (simplex[n][j] - c)));
      if (f(xc) < f(simplex[n])) { simplex[n] = xc; continue; }

      // Shrink:
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
      { name: 'Annealed (Slow Cool)', rate: CONSTANTS.RATES.ANNEAL, mode: 'anneal' },
      { name: 'Normalized (Air Cool)', rate: CONSTANTS.RATES.NORMALIZE, mode: 'normalize' },
      { name: 'Quenched (Untempered)', rate: CONSTANTS.RATES.QUENCH, mode: 'quench' },
      { name: 'Quenched & Tempered', rate: CONSTANTS.RATES.QUENCH, mode: 'temper' },
      { name: 'Austempered (Bainitic)', rate: CONSTANTS.RATES.CRITICAL_BAINITE + 5, mode: 'manual' }
    ];

    const startingPoints = [
      [0.20, 0.75, 0.25, 0.0, 0.0, 0.0],  // low carbon plain
      [0.40, 0.85, 0.25, 1.0, 0.0, 0.2],  // Cr-Mo alloy steel
      [0.95, 0.40, 0.25, 0.0, 0.0, 0.0],  // high carbon
      [0.30, 1.50, 0.25, 0.0, 2.0, 0.0],  // Mn-Ni
      [0.15, 0.75, 0.25, 0.5, 0.0, 0.5],  // low-C Mo alloy
    ];

    processes.forEach(proc => {
      const maxRate = proc.mode === 'temper' ? CONSTANTS.RATES.QUENCH : proc.rate;
      
      const objectiveFunction = (x) => {
        const testAlloy = { c: x[0], mn: x[1], si: x[2], cr: x[3], ni: x[4], mo: x[5], v: baseAlloy.v || 0, cu: baseAlloy.cu || 0 };
        const state = ThermoEngine.getState(testAlloy, 20, 0, proc.mode, maxRate, 20);
        
        let loss = 0; let weightSum = 0;
        
        if (targets.hv.val > 0) {
          loss += targets.hv.weight * Math.pow((state.hardness.hv - targets.hv.val) / targets.hv.val, 2);
          weightSum += targets.hv.weight;
        }
        if (targets.yield.val > 0) {
          loss += targets.yield.weight * Math.pow((state.yield - targets.yield.val) / targets.yield.val, 2);
          weightSum += targets.yield.weight;
        }
        if (targets.uts.val > 0) {
          loss += targets.uts.weight * Math.pow((state.uts - targets.uts.val) / targets.uts.val, 2);
          weightSum += targets.uts.weight;
        }
        if (targets.elong.val > 0 && state.elong < targets.elong.val) {
          loss += (targets.elong.weight * 3) * Math.pow((targets.elong.val - state.elong) / targets.elong.val, 2); // Heavy penalty for missing elongation
          weightSum += targets.elong.weight;
        }
        
        if (weightSum === 0) return 9999;
        return loss / weightSum;
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
    
    let distinctResults = [];
    let seenConfigGroups = new Set();
    
    for (let res of bestResults) {
        let configKey = `${Math.round(res.alloy.c * 5) / 5}_${res.process}`;
        if (!seenConfigGroups.has(configKey)) {
            seenConfigGroups.add(configKey);
            distinctResults.push(res);
        }
        if (distinctResults.length >= 3) break;
    }

    return distinctResults;
  }
};

// ============================================================================
// MODULE: EXPORT ENGINE
// ============================================================================
const ExportEngine = {
  downloadBlob: (content, type, filename) => {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  generateTXT: (alloy, temp, mode, state, weldStatus) => {
    const timestamp = new Date().toISOString();
    let fracStr = state.phaseFractions.map(f => `- ${f.name}: ${f.frac.toFixed(1)}%`).join('\n');
    let microStr = state.microFractions.map(f => `- ${f.name}: ${f.frac.toFixed(1)}%`).join('\n');
    
    return `ABAJIS-SteelLab Analytical Report
Generated: ${timestamp}
Version: ${APP_VERSION}

====================================================
COMPOSITION & THERMAL STATE
====================================================
Carbon Content   : ${alloy.c.toFixed(3)} wt%
Alloying Elements: Mn:${alloy.mn.toFixed(2)}% Si:${alloy.si.toFixed(2)}% Cr:${alloy.cr.toFixed(2)}% Ni:${alloy.ni.toFixed(2)}% Mo:${alloy.mo.toFixed(2)}% V:${alloy.v.toFixed(2)}% Cu:${alloy.cu.toFixed(2)}%
Temperature      : ${temp.toFixed(1)} °C
Processing Mode  : ${mode.toUpperCase()}
Phase Region     : ${state.regionLabel}
State            : ${state.isQuenched ? 'Martensitic Transformation' : state.isBainitic ? 'Bainitic Transformation' : 'Equilibrium / Near-Equilibrium'}

====================================================
PHASE CONSTITUTION (Thermodynamic)
====================================================
${fracStr}

====================================================
MICROCONSTITUENTS (Morphological)
====================================================
${microStr}
Crystal Structure: ${state.crystal}
Lattice Param a  : ${state.paramA.toFixed(4)} Å
Lattice Param c  : ${state.paramC.toFixed(4)} Å
ASTM Grain Size  : G${state.grainSize.toFixed(1)}

====================================================
MECHANICAL PREDICTIONS (at T=${temp.toFixed(0)}°C)
====================================================
Yield Strength   : ${state.yield} MPa
Ult. Tensile Str : ${state.uts} MPa
Fatigue Limit    : ${state.fatigue} MPa
Hardness         : ${state.hardness.hv} HV / ${state.hardness.hrc > 0 ? state.hardness.hrc + ' HRC' : state.hardness.hb + ' HB'}
Elongation       : ${state.elong}%
DBTT             : ${state.dbtt} °C

====================================================
WELDABILITY (IIW Carbon Equivalent Model)
====================================================
Rating           : ${weldStatus.rating}
C.E. Value       : ${weldStatus.ce}
Notes            : ${weldStatus.desc}
`.trim();
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
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) { return initialValue; }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) { console.warn(error); }
  };
  return [storedValue, setValue];
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
      simRef.current.t = parseNum(temp, 20);
      simRef.current.c = parseNum(carbon, 0);
      
      // Physically, manually dragging the temp slider deep into the Austenite 
      // region (past A1) wipes the previous heat treatment thermal history.
      if (simRef.current.t >= CONSTANTS.FE_C.T_EUTECTOID) {
         setMaxRate(0);
      }
    }
  }, [temp, carbon, mode]);

  const changeMode = useCallback((newMode, keepHistory = false) => {
    if (newMode === 'manual' && !keepHistory) {
      setHistoryTrail([]);
      setMaxRate(0);
    }
    // Hard reset max rate if initializing a slow, non-quench thermal procedure
    if (['anneal', 'normalize'].includes(newMode)) {
      setMaxRate(0);
    }
    setMode(newMode);
  }, []);

  useEffect(() => {
    if (['anneal', 'normalize', 'quench', 'temper'].includes(mode)) {
      let reqId;
      let lastTime = performance.now();
      let lastRenderTime = performance.now();
      let simTime = 0; 
      
      const TARGET_COOL = 20;
      const TARGET_TEMPER = 500;
      const AUSTENITE_TEMP = 900;

      if (mode === 'temper') {
        simRef.current.phase = 'heating';
      } else {
        if (simRef.current.t < 800) simRef.current.phase = 'heating_to_austenitize';
        else simRef.current.phase = 'cooling';
      }

      const rateMagnitude = mode === 'anneal' ? CONSTANTS.RATES.ANNEAL : mode === 'normalize' ? CONSTANTS.RATES.NORMALIZE : mode === 'quench' ? CONSTANTS.RATES.QUENCH : 100;
      setHistoryTrail(prev => prev.length === 0 ? [{ c: simRef.current.c, t: simRef.current.t, time: 0 }] : prev);

      const animateStep = (time) => {
        const dt = Math.min((time - lastTime) / 1000, 0.1); 
        lastTime = time;

        let { t: currentT, phase } = simRef.current;
        let displayRate = 0;
        let isDone = false;

        if (phase === 'heating_to_austenitize') {
          displayRate = -250;
          currentT += Math.abs(displayRate) * dt * 3;
          simTime += dt * 3;
          if (currentT >= AUSTENITE_TEMP) { currentT = AUSTENITE_TEMP; simRef.current.phase = 'cooling'; }
        } else if (phase === 'heating') {
          displayRate = -150;
          currentT += Math.abs(displayRate) * dt * 2;
          simTime += dt * 2;
          if (currentT >= TARGET_TEMPER) { currentT = TARGET_TEMPER; simRef.current.phase = 'holding'; simRef.current.timer = 1.0; }
        } else if (phase === 'holding') {
          displayRate = 0;
          simRef.current.timer -= dt;
          simTime += dt;
          if (simRef.current.timer <= 0) simRef.current.phase = 'cooling';
        } else if (phase === 'cooling') {
          let actualRate = rateMagnitude;
          if ((mode === 'anneal' || mode === 'normalize') && ((currentT > 700 && currentT < 740) || (currentT > 1130 && currentT < 1160))) {
            actualRate = Math.max(1, rateMagnitude / 3);
          }
          displayRate = actualRate;
          let timeMultiplier = mode === 'anneal' ? 40 : mode === 'normalize' ? 20 : mode === 'quench' ? 4 : 20;
          currentT -= actualRate * dt * timeMultiplier;
          simTime += dt * timeMultiplier;
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

      reqId = requestAnimationFrame(animateStep);
      return () => cancelAnimationFrame(reqId);
    } else {
      setCoolingRate(0);
    }
  }, [mode, setTemp, changeMode]); 

  return { mode, changeMode, coolingRate, maxRate, historyTrail };
};

const useDiagramInteractions = (svgRef, alloy, carbon, temp, setCarbon, setTemp, changeMode, maxC, geometry) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);

  const getCoords = useCallback((e) => {
    if (!svgRef.current) return { c: 0, t: 20 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = geometry.w / rect.width;
    const scaleY = geometry.h / rect.height;
    
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY;
    }

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
  
  const onPointerMove = useCallback((e) => { 
    if (!isDragging) return; updatePosition(e, e.shiftKey); 
  }, [isDragging, updatePosition]);
  
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
  const setCarbon = useCallback((val) => {
      setAlloy(prev => ({...prev, c: parseNum(typeof val === 'function' ? val(prev.c) : val, 0)}));
  }, []);

  const [temp, setTemp] = useState(initialT.toString());
  const [phaseFlash, setPhaseFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const svgRef = useRef(null);
  
  const [isDark, setIsDark] = useLocalStorage('abajis_isDark', false);
  const [snapshots, setSnapshots] = useLocalStorage('abajis_snapshots', []); 
  const [etchant, setEtchant] = useLocalStorage('abajis_etchant', 'nital');
  const [zoomSteel, setZoomSteel] = useState(false);
  const [showWeldability, setShowWeldability] = useLocalStorage('abajis_weld_overlay', false);
  
  const prevTempRef = useRef(initialT);
  const lowestTempRef = useRef(initialT);
  
  const { mode, changeMode, coolingRate, maxRate, historyTrail } = useHeatTreatment(temp, carbon, setTemp);

  const currentT = parseNum(temp, 20);
  let effectiveLowestTemp = lowestTempRef.current;
  
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);

  if (currentT > consts.T_EUTECTOID) {
      effectiveLowestTemp = currentT;
  } else {
      effectiveLowestTemp = Math.min(lowestTempRef.current, currentT);
  }

  useEffect(() => {
    lowestTempRef.current = effectiveLowestTemp;
    const numTemp = currentT;
    const prevTemp = prevTempRef.current;
    prevTempRef.current = numTemp;
    
    if ((prevTemp > consts.T_EUTECTOID && numTemp <= consts.T_EUTECTOID) || 
        (prevTemp < consts.T_EUTECTOID && numTemp >= consts.T_EUTECTOID) ||
        (prevTemp > consts.T_A3_PURE && numTemp <= consts.T_A3_PURE) ||
        (prevTemp < consts.T_A3_PURE && numTemp >= consts.T_A3_PURE)) {
        setPhaseFlash(true); setTimeout(() => setPhaseFlash(false), 300);
    }
  }, [currentT, effectiveLowestTemp, consts]);

  const activeGrade = useMemo(() => STEEL_GRADES.find(g => Math.abs(g.c - alloy.c) < 0.01 && Math.abs(g.mn - alloy.mn) < 0.1 && Math.abs(g.cr - alloy.cr) < 0.1), [alloy]);
  const weldStatus = useMemo(() => getWeldability(alloy), [alloy, activeGrade]);
  
  const simState = useMemo(() => ThermoEngine.getState(alloy, currentT, coolingRate, mode, maxRate, effectiveLowestTemp, historyTrail), [alloy, currentT, coolingRate, mode, maxRate, effectiveLowestTemp, historyTrail]);
  
  const maxC = zoomSteel ? 2.5 : CONSTANTS.FE_C.C_CEMENTITE;
  const geometry = useMemo(() => {
    const w = 850, h = 650;
    const m = { top: 40, right: 60, bottom: 80, left: 70 };
    return {
      w, h, m, innerW: w - m.left - m.right, innerH: h - m.top - m.bottom,
      mapX: (c) => m.left + (Math.min(c, maxC) / maxC) * (w - m.left - m.right),
      mapY: (t) => m.top + (h - m.top - m.bottom) - (t / CONSTANTS.FE_C.T_MAX) * (h - m.top - m.bottom)
    };
  }, [maxC]);

  const theme = useMemo(() => ({
    bg: isDark ? 'bg-slate-950' : 'bg-slate-50', 
    panelBg: isDark ? 'bg-slate-900/80 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-xl', 
    textMain: isDark ? 'text-slate-100' : 'text-slate-900', 
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500', 
    border: isDark ? 'border-slate-800/80' : 'border-slate-200/80', 
    diagramBgClass: isDark ? 'bg-[#020617]' : 'bg-white' 
  }), [isDark]);

  const handleAlloyChange = useCallback((elem, val) => {
    changeMode('manual', true);
    setAlloy(prev => ({...prev, [elem]: parseNum(val, 0)}));
  }, [changeMode, setAlloy]);

  const stateValue = useMemo(() => ({
    alloy, carbon, temp, simState, coolingRate, maxRate, historyTrail, activeGrade, weldStatus, phaseFlash, isPending
  }), [alloy, carbon, temp, simState, coolingRate, maxRate, historyTrail, activeGrade, weldStatus, phaseFlash, isPending]);

  const actionValue = useMemo(() => ({
    alloy, setAlloy, handleAlloyChange, setCarbon, setTemp, isDark, setIsDark, zoomSteel, setZoomSteel, showWeldability, setShowWeldability, snapshots, setSnapshots, etchant, setEtchant, mode, changeMode, maxC, geometry, theme, svgRef, startTransition
  }), [alloy, setAlloy, handleAlloyChange, setCarbon, setTemp, isDark, setIsDark, zoomSteel, setZoomSteel, showWeldability, setShowWeldability, snapshots, setSnapshots, etchant, setEtchant, mode, changeMode, maxC, geometry, theme, svgRef]);

  return (
    <ThermoStateContext.Provider value={stateValue}>
      <ThermoActionContext.Provider value={actionValue}>
        {children}
      </ThermoActionContext.Provider>
    </ThermoStateContext.Provider>
  );
};


// ============================================================================
// MODULE: REACT COMPONENTS
// ============================================================================

const SmartAssistant = React.memo(() => {
  const { carbon, temp, simState: state } = useThermoState();
  const { isDark } = useThermoAction();
  const cNum = parseNum(carbon, 0);
  const tNum = parseNum(temp, 20);

  const getAdvice = () => {
    if (tNum > CONSTANTS.FE_C.T_MELT) return { type: 'warn', msg: `Temperature exceeds pure iron melting point (${CONSTANTS.FE_C.T_MELT}°C). Material is completely molten.` };
    if (tNum > 1400 && cNum > 2.0) return { type: 'warn', msg: "Approaching liquidus region. Material will melt." };
    if (tNum < 0) return { type: 'warn', msg: "Cryogenic Range: Impact toughness decreases rapidly. Risk of brittle fracture." };
    
    if (state.isQuenched && !state.isTempered) return { type: 'warn', msg: `Untempered Martensite: Highly stressed and brittle. Tempering recommended immediately. M_s: ${Math.round(state.msTemp)}°C.` };
    if (state.isTempered) return { type: 'tip', msg: "Tempered Martensite: Excellent balance of toughness and hardness achieved via precipitating fine carbides." };
    if (state.isBainitic) return { type: 'tip', msg: "Bainitic Structure formed via moderate continuous cooling. Offers high strength without extreme brittleness." };
    if (state.isMetastable) return { type: 'tip', msg: `Supercooled Austenite: Cooling rapidly. M_s is at ${Math.round(state.msTemp)}°C.` };
    if (state.regionId === 'gamma') return { type: 'tip', msg: "Austenite Field: Ready for heat treatment. Quench for martensite, moderate cool for bainite, slow cool to anneal." };
    
    if (Math.abs(cNum - CONSTANTS.FE_C.C_EUTECTOID) < 0.05 && tNum < CONSTANTS.FE_C.T_EUTECTOID) return { type: 'tip', msg: "Eutectoid Composition: Forms 100% Pearlite for excellent strength-to-wear ratio." };
    if (cNum > CONSTANTS.FE_C.C_AUSTENITE_MAX) return { type: 'info', msg: "Cast Iron Range: Excellent castability, but brittle. Contains Ledeburite." };
    if (cNum < 0.2) return { type: 'info', msg: "Low Carbon Steel: Excellent weldability, but cannot be effectively quench-hardened." };
    
    return { type: 'info', msg: "Equilibrium thermodynamic state. Adjust parameters to explore phase transformations." };
  };

  const advice = getAdvice();
  const styles = {
    warn: "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300",
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-300",
    tip: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300"
  };
  const Icon = advice.type === 'warn' ? AlertTriangle : advice.type === 'tip' ? Lightbulb : Info;

  return (
    <div className={cn("mt-6 p-3.5 rounded-xl border flex items-start gap-3 transition-all duration-300", styles[advice.type])}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Smart Planner</h4>
        <p className="text-sm font-medium leading-snug">{advice.msg}</p>
      </div>
    </div>
  );
});

const TooltipHelp = ({ text }) => (
  <span className="group relative inline-flex cursor-help">
    <Info size={12} className="inline ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max max-w-xs rounded bg-slate-900 px-2 py-1 text-[10px] font-medium text-slate-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900 z-50">
      {text}
    </span>
  </span>
);

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("Simulation error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-500 bg-red-50 text-red-700 rounded-xl flex flex-col items-center justify-center text-center h-screen">
          <AlertTriangle size={48} className="mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">Simulation Rendering Error</h2>
          <p className="text-sm opacity-80 mb-4">The thermodynamic state encountered an unexpected parameter.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">Reload Application</button>
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

  // Calculate generic base shift factor due to non-carbon alloying elements
  const K = (alloy.mn / 6) + ((alloy.cr + alloy.mo + alloy.v) / 5) + ((alloy.ni + alloy.cu) / 15);
  
  // Back-calculate the Carbon thresholds that correspond to standard CE breakpoints
  const cExc = 0.35 - K;
  const cFair = 0.50 - K;

  const { mapX, m, innerH } = geometry;

  // Clamp mapping bounds safely within chart boundaries
  const x0 = mapX(0);
  const xMax = mapX(maxC);
  const xExcClamped = mapX(Math.max(0, Math.min(maxC, cExc)));
  const xFairClamped = mapX(Math.max(0, Math.min(maxC, cFair)));

  return (
    <g className="weldability-overlay">
      {/* Background Iso-Regions */}
      <g opacity={isDark ? "0.15" : "0.1"}>
        {cExc > 0 && (
          <rect x={x0} y={m.top} width={xExcClamped - x0} height={innerH} fill="#10b981" style={{ transition: 'all 0.3s ease-out' }} />
        )}
        {cFair > 0 && cExc < maxC && (
          <rect x={xExcClamped} y={m.top} width={Math.max(0, xFairClamped - xExcClamped)} height={innerH} fill="#f59e0b" style={{ transition: 'all 0.3s ease-out' }} />
        )}
        {cFair < maxC && (
          <rect x={xFairClamped} y={m.top} width={xMax - xFairClamped} height={innerH} fill="#ef4444" style={{ transition: 'all 0.3s ease-out' }} />
        )}
      </g>

      {/* Threshold Contour Lines & Labels */}
      {cExc > 0 && cExc <= maxC && (
        <g opacity="0.8" style={{ transition: 'all 0.3s ease-out' }} transform={`translate(${mapX(cExc)}, 0)`}>
          <line x1={0} y1={m.top} x2={0} y2={geometry.h - m.bottom} stroke="#10b981" strokeWidth="2.5" strokeDasharray="4,4" />
          <text x={0} y={m.top + 15} fill="#10b981" fontSize="10" fontWeight="bold" transform={`rotate(-90 0 ${m.top + 15})`} dy="-6">CE = 0.35 (Exc.)</text>
        </g>
      )}
      {cFair > 0 && cFair <= maxC && (
        <g opacity="0.8" style={{ transition: 'all 0.3s ease-out' }} transform={`translate(${mapX(cFair)}, 0)`}>
          <line x1={0} y1={m.top} x2={0} y2={geometry.h - m.bottom} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4,4" />
          <text x={0} y={m.top + 15} fill="#f59e0b" fontSize="10" fontWeight="bold" transform={`rotate(-90 0 ${m.top + 15})`} dy="-6">CE = 0.50 (Fair)</text>
        </g>
      )}
    </g>
  );
});

const DiagramSkeleton = React.memo(() => {
  const { alloy } = useThermoState();
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);
  const { geometry, maxC, isDark, zoomSteel } = useThermoAction();
  const { mapX, mapY, m, w, h } = geometry;
  const strokeMain = isDark ? '#64748b' : '#cbd5e1';
  const strokeGrid = isDark ? '#0f172a' : '#f8fafc';
  const axisColor = isDark ? '#475569' : '#94a3b8';
  const highlightStroke = isDark ? '#38bdf8' : '#3b82f6';
  const textMain = isDark ? 'text-slate-100' : 'text-slate-900';

  const dynamicA1 = consts.T_EUTECTOID;
  const dynamicA3 = consts.T_A3_PURE;
  const dynamicC1 = consts.C_EUTECTOID;

  const paths = useMemo(() => {
    const generateCurvePath = (fn, tStart, tEnd) => {
      let path = '';
      const step = (tEnd - tStart) / 40;
      for (let i = 0; i <= 40; i++) {
        const t = tStart + i * step;
        path += i === 0 ? `M ${mapX(fn(t))},${mapY(t)} ` : `L ${mapX(fn(t))},${mapY(t)} `;
      }
      return path;
    };

    return {
      periL: `M ${mapX(PTS.MELT.c)},${mapY(PTS.MELT.t)} L ${mapX(PTS.PERI_L.c)},${mapY(PTS.PERI_L.t)}`,
      periS: `M ${mapX(PTS.MELT.c)},${mapY(PTS.MELT.t)} L ${mapX(PTS.PERI_S.c)},${mapY(PTS.PERI_S.t)}`,
      periN1: `M ${mapX(PTS.N.c)},${mapY(PTS.N.t)} L ${mapX(PTS.PERI_S.c)},${mapY(PTS.PERI_S.t)}`,
      periN2: `M ${mapX(PTS.N.c)},${mapY(PTS.N.t)} L ${mapX(PTS.PERI_G.c)},${mapY(PTS.PERI_G.t)}`,
      solidus: generateCurvePath(ThermoEngine.c_solidus, PTS.PERI_G.t, PTS.EUTEC_G.t),
      liquidus: generateCurvePath(ThermoEngine.c_liquidus, PTS.PERI_L.t, PTS.EUTEC_L.t),
      lFe3C: generateCurvePath(ThermoEngine.c_l_fe3c, PTS.EUTEC_L.t, 1250),
      a3: generateCurvePath((t) => ThermoEngine.c_a3(t, consts), dynamicA3, dynamicA1),
      acm: generateCurvePath((t) => ThermoEngine.c_acm(t, consts), PTS.EUTEC_G.t, dynamicA1),
      alpha1: generateCurvePath((t) => ThermoEngine.c_alpha(t, consts), dynamicA3, dynamicA1),
      alpha2: generateCurvePath((t) => ThermoEngine.c_alpha(t, consts), dynamicA1, PTS.ROOM_A.t)
    };
  }, [mapX, mapY, consts, dynamicA1, dynamicA3]);

  return (
    <>
      <g stroke={strokeGrid} strokeWidth="1.5">
        {(zoomSteel ? [0.5, 1.0, 1.5, 2.0] : [1,2,3,4,5,6]).map(c => <line key={`vg-${c}`} x1={mapX(c)} y1={m.top} x2={mapX(c)} y2={h - m.bottom} />)}
        {[400,800,1200,1600].map(t => <line key={`hg-${t}`} x1={m.left} y1={mapY(t)} x2={w - m.right} y2={mapY(t)} />)}
      </g>

      <g clipPath="url(#graphClip)">
        <clipPath id="graphClip"><rect x={m.left} y={m.top} width={geometry.innerW} height={geometry.innerH} /></clipPath>
        
        <g className="phase-skeleton pointer-events-none" stroke={strokeMain} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s ease-out' }}>
          <path d={paths.periL} />
          <path d={paths.periS} />
          <path d={paths.periN1} />
          <path d={paths.periN2} />
          <path d={paths.solidus} />
          <path d={paths.liquidus} />
          <path d={paths.lFe3C} />
          <path d={paths.a3} />
          <path d={paths.acm} />
          <path d={paths.alpha1} />
          <path d={paths.alpha2} />

          <line x1={mapX(PTS.PERI_S.c)} y1={mapY(PTS.PERI_S.t)} x2={mapX(PTS.PERI_L.c)} y2={mapY(PTS.PERI_L.t)} /> 
          <line x1={mapX(PTS.EUTEC_G.c)} y1={mapY(PTS.EUTEC_G.t)} x2={mapX(PTS.EUTEC_C.c)} y2={mapY(PTS.EUTEC_C.t)} /> 
          <line x1={mapX(0)} y1={mapY(dynamicA1)} x2={mapX(PTS.EUTECTOID_C.c)} y2={mapY(dynamicA1)} /> 
          <line x1={mapX(0)} y1={mapY(0)} x2={mapX(0)} y2={mapY(PTS.MELT.t)} />
          {!zoomSteel && <line x1={mapX(PTS.EUTEC_C.c)} y1={mapY(0)} x2={mapX(PTS.EUTEC_C.c)} y2={mapY(1250)} />}
        </g>

        <g className="pointer-events-none" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" opacity="0.6">
          <line x1={mapX(0)} y1={mapY(CONSTANTS.FE_C.T_CURIE)} x2={mapX(dynamicC1)} y2={mapY(CONSTANTS.FE_C.T_CURIE)} style={{ transition: 'all 0.3s ease-out' }} />
        </g>
        <g className="pointer-events-none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4" opacity="0.6">
          <line x1={mapX(CONSTANTS.FE_C.C_FERRITE_MAX)} y1={mapY(CONSTANTS.FE_C.T_A0)} x2={mapX(CONSTANTS.FE_C.C_CEMENTITE)} y2={mapY(CONSTANTS.FE_C.T_A0)} />
        </g>
        
        <text x={mapX(0.38)} y={mapY(CONSTANTS.FE_C.T_CURIE) - 6} className={cn("text-[10px] font-bold pointer-events-none hidden md:block", isDark ? 'fill-red-400/80' : 'fill-red-500/80')} textAnchor="middle">768°C (A₂)</text>
        <text x={mapX(3.5)} y={mapY(CONSTANTS.FE_C.T_A0) - 6} className={cn("text-[10px] font-bold pointer-events-none hidden md:block", isDark ? 'fill-blue-400/80' : 'fill-blue-500/80')} textAnchor="middle">210°C (A₀)</text>

        <g className="pointer-events-none" stroke={axisColor} strokeWidth="1" strokeDasharray="4,4" opacity="0.4" style={{ transition: 'all 0.3s ease-out' }}>
          <line x1={mapX(dynamicC1)} y1={mapY(dynamicA1)} x2={mapX(dynamicC1)} y2={h - m.bottom} />
          <line x1={mapX(CONSTANTS.FE_C.C_AUSTENITE_MAX)} y1={mapY(CONSTANTS.FE_C.T_EUTECTIC)} x2={mapX(CONSTANTS.FE_C.C_AUSTENITE_MAX)} y2={h - m.bottom} />
          <line x1={mapX(CONSTANTS.FE_C.C_FERRITE_MAX)} y1={mapY(dynamicA1)} x2={mapX(CONSTANTS.FE_C.C_FERRITE_MAX)} y2={h - m.bottom} />
          {!zoomSteel && <line x1={mapX(CONSTANTS.FE_C.C_EUTECTIC)} y1={mapY(CONSTANTS.FE_C.T_EUTECTIC)} x2={mapX(CONSTANTS.FE_C.C_EUTECTIC)} y2={h - m.bottom} />}
        </g>

        <g className={cn("text-[12px] font-bold pointer-events-none hidden md:block transition-all duration-300", isDark ? 'fill-slate-400' : 'fill-slate-500')} textAnchor="middle">
          <text x={mapX(1.0)} y={mapY(1000)}>austenite (γ)</text>
          <text x={mapX(0.01)} y={mapY(500)} textAnchor="start" fontSize="11">α</text>
          <text x={mapX(Math.max(0.05, dynamicC1 / 3))} y={mapY(dynamicA1 + 50)}>α + γ</text>
          <text x={mapX(0.04)} y={mapY(1460)} fontSize="10">δ</text>
          <text x={mapX(0.25)} y={mapY(1515)} fontSize="10">L + δ</text>
          <text x={mapX(0.08)} y={mapY(1440)} fontSize="10">γ + δ</text>
          <text x={mapX(dynamicC1 / 2)} y={mapY(400)}>α + pearlite</text>
          <text x={mapX(dynamicC1 + (CONSTANTS.FE_C.C_AUSTENITE_MAX - dynamicC1)/2)} y={mapY(400)}>pearlite + Fe₃C</text>
          <text x={mapX(1.55)} y={mapY(850)}>γ + Fe₃C</text>
          <text x={mapX(1.4)} y={mapY(1350)}>L + γ</text>
          {!zoomSteel && (
            <>
              <text x={mapX(3.5)} y={mapY(1450)}>liquid (L)</text>
              <text x={mapX(5.5)} y={mapY(1220)}>L + Fe₃C</text>
              <text x={mapX(3.2)} y={mapY(950)}>γ + ledeburite I + Fe₃C</text>
              <text x={mapX(5.5)} y={mapY(950)}>ledeburite I + Fe₃C</text>
              <text x={mapX(3.2)} y={mapY(400)}>pearlite + ledeburite II + Fe₃C</text>
              <text x={mapX(5.5)} y={mapY(400)}>ledeburite II + Fe₃C</text>
            </>
          )}
        </g>

        <g className={cn("text-[11px] font-black pointer-events-none transition-all duration-300", isDark ? 'fill-slate-500' : 'fill-slate-400')} textAnchor="middle">
          <text x={mapX(dynamicC1 / 1.5)} y={mapY(dynamicA3 - 100) + 12} transform={`rotate(-40 ${mapX(dynamicC1 / 1.5)} ${mapY(dynamicA3 - 100) + 12})`} fill="#f97316">A₃</text>
          <text x={mapX(1.6)} y={mapY(980) - 8} transform={`rotate(38 ${mapX(1.6)} ${mapY(980) - 8})`} fill="#8b5cf6">Acm</text>
          <text x={mapX(1.0)} y={mapY(dynamicA1) + 14}>A₁ ({Math.round(dynamicA1)}°C)</text>
          {!zoomSteel && <text x={mapX(CONSTANTS.FE_C.C_EUTECTIC)} y={mapY(CONSTANTS.FE_C.T_EUTECTIC) - 8}>Eutectic (1147°C)</text>}
        </g>
      </g>

      <path className="pointer-events-none" d={`M ${m.left} ${m.top} L ${m.left} ${h - m.bottom} L ${w - m.right} ${h - m.bottom}`} fill="none" stroke={axisColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

      <g className={cn("text-[12px] font-mono font-bold pointer-events-none transition-all duration-300", textMain)} textAnchor="middle">
        {(zoomSteel ? [0.5, 1.0, 1.5, 2.0, 2.5] : [1, 2, 3, 4, 5, 6]).map(c => (
          <g key={`tx-${c}`} transform={`translate(${mapX(c)}, ${h - m.bottom})`}>
            <line y2="6" stroke={axisColor} strokeWidth="2" />
            <text y="20" fontSize="10" className="opacity-80">{c}</text>
          </g>
        ))}
        
        {(zoomSteel ? [CONSTANTS.FE_C.C_FERRITE_MAX, dynamicC1, CONSTANTS.FE_C.C_AUSTENITE_MAX] : [CONSTANTS.FE_C.C_FERRITE_MAX, dynamicC1, CONSTANTS.FE_C.C_AUSTENITE_MAX, CONSTANTS.FE_C.C_EUTECTIC, CONSTANTS.FE_C.C_CEMENTITE]).map(c => (
          <g key={`ctx-${c}`} transform={`translate(${mapX(c)}, ${h - m.bottom})`}>
            <line y2="8" stroke={highlightStroke} strokeWidth="2" />
            <text y="24" textAnchor={c === CONSTANTS.FE_C.C_FERRITE_MAX ? "start" : "middle"} dx={c === CONSTANTS.FE_C.C_FERRITE_MAX ? 3 : 0} className="fill-indigo-600 dark:fill-indigo-400 font-black text-[10px]">{c.toFixed(2)}</text>
          </g>
        ))}

        <g stroke={axisColor} strokeWidth="2" opacity="0.6">
          <line x1={mapX(0)} y1={h - m.bottom + 38} x2={mapX(CONSTANTS.FE_C.C_AUSTENITE_MAX)} y2={h - m.bottom + 38} />
          <line x1={mapX(0)} y1={h - m.bottom + 32} x2={mapX(0)} y2={h - m.bottom + 44} />
          <line x1={mapX(CONSTANTS.FE_C.C_AUSTENITE_MAX)} y1={h - m.bottom + 32} x2={mapX(CONSTANTS.FE_C.C_AUSTENITE_MAX)} y2={h - m.bottom + 44} />
          <text x={mapX(CONSTANTS.FE_C.C_AUSTENITE_MAX / 2)} y={h - m.bottom + 52} className="text-[11px] font-sans font-black tracking-widest fill-slate-500 dark:fill-slate-400" stroke="none">STEEL</text>
          
          {!zoomSteel && (
            <>
              <line x1={mapX(CONSTANTS.FE_C.C_AUSTENITE_MAX)} y1={h - m.bottom + 38} x2={mapX(CONSTANTS.FE_C.C_CEMENTITE)} y2={h - m.bottom + 38} />
              <line x1={mapX(CONSTANTS.FE_C.C_CEMENTITE)} y1={h - m.bottom + 32} x2={mapX(CONSTANTS.FE_C.C_CEMENTITE)} y2={h - m.bottom + 44} />
              <text x={mapX(CONSTANTS.FE_C.C_AUSTENITE_MAX + (CONSTANTS.FE_C.C_CEMENTITE - CONSTANTS.FE_C.C_AUSTENITE_MAX) / 2)} y={h - m.bottom + 52} className="text-[11px] font-sans font-black tracking-widest fill-slate-500 dark:fill-slate-400" stroke="none">CAST IRON</text>
            </>
          )}
        </g>

        <text x={m.left + geometry.innerW/2} y={h - 5} className="font-sans font-black text-xs uppercase tracking-widest text-indigo-500">Weight Percent Carbon</text>
        
        {[0, 200, 400, 600, 800, 1000, 1200, 1400, 1600].map(t => (
          <g key={`ty-${t}`} transform={`translate(${m.left}, ${mapY(t)})`}>
            <line x2="-5" stroke={axisColor} strokeWidth="2" />
            <text x="-10" y="4" textAnchor="end" fontSize="10" className="opacity-80">{t}</text>
          </g>
        ))}

        {[dynamicA1, dynamicA3, CONSTANTS.FE_C.T_EUTECTIC, CONSTANTS.FE_C.T_GAMMA_MAX, CONSTANTS.FE_C.T_PERITECTIC, CONSTANTS.FE_C.T_MELT].map(t => (
          <g key={`cty-${t}`} transform={`translate(${m.left}, ${mapY(t)})`}>
            <line x2="-8" stroke={highlightStroke} strokeWidth="2" />
            <text x="-14" y="4" textAnchor="end" className="fill-indigo-600 dark:fill-indigo-400 font-black text-[10px]">{Math.round(t)}</text>
          </g>
        ))}

        <text transform={`rotate(-90) translate(${-m.top - geometry.innerH/2}, ${m.left - 50})`} className="font-sans font-black text-xs uppercase tracking-widest text-rose-500">Temperature (°C)</text>
      </g>
    </>
  );
});

const CustomLogo = ({ isDark }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 drop-shadow-md">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" 
          stroke={isDark ? "#818cf8" : "#4f46e5"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
          fill={isDark ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.8)"} />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke={isDark ? "#818cf8" : "#4f46e5"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
    <line x1="12" y1="22.08" x2="12" y2="12" stroke={isDark ? "#818cf8" : "#4f46e5"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
    <circle cx="12" cy="12" r="3.5" fill="#ef4444" className="animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
    <circle cx="12" cy="12" r="2" fill="#fbbf24" />
  </svg>
);

const CrystalCell = React.memo(({ type, c_param, a_param, isDark }) => {
  const stroke = isDark ? '#e2e8f0' : '#1e293b';
  if (type === 'Amorphous' || !a_param || a_param === 0) {
    return (
      <svg viewBox="0 0 100 120" className="w-16 h-16 drop-shadow-lg transition-all duration-500 hover:scale-110" role="img" aria-label="Amorphous Structure">
         <g fill={isDark ? '#60a5fa' : '#3b82f6'} opacity="0.6">
           <circle cx="30" cy="40" r="6" /> <circle cx="70" cy="30" r="8" /> <circle cx="50" cy="70" r="7" />
           <circle cx="20" cy="80" r="5" /> <circle cx="80" cy="80" r="6" /> <circle cx="50" cy="20" r="5" />
           <circle cx="40" cy="90" r="8" /> <circle cx="75" cy="60" r="5" />
         </g>
      </svg>
    );
  }
  const atom = type.includes('FCC') ? (isDark ? '#60a5fa' : '#3b82f6') : type.includes('BCT') ? (isDark ? '#c084fc' : '#9333ea') : (isDark ? '#f87171' : '#ef4444');
  const cRatio = c_param / a_param;
  const proj = (x, y, z) => ({ cx: 50 + (x - y) * 35, cy: 100 - (x + y) * 20 - (z * cRatio) * 45 });

  const pts = [
    proj(0,0,0), proj(1,0,0), proj(0,1,0), proj(1,1,0),
    proj(0,0,1), proj(1,0,1), proj(0,1,1), proj(1,1,1)
  ];
  const edges = [[0,1], [0,2], [1,3], [2,3], [4,5], [4,6], [5,7], [6,7], [0,4], [1,5], [2,6], [3,7]];

  return (
    <svg viewBox="0 0 100 120" className="w-16 h-16 drop-shadow-lg transition-all duration-500 hover:scale-110" role="img" aria-label={`Crystal Structure: ${type}`}>
      <g stroke={stroke} strokeWidth="1.5" strokeOpacity="0.4" fill="none" strokeLinejoin="round">
        {edges.map((e, i) => <line key={i} x1={pts[e[0]].cx} y1={pts[e[0]].cy} x2={pts[e[1]].cx} y2={pts[e[1]].cy} />)}
      </g>
      <g fill={atom}>
        {pts.map((p, i) => <circle key={`c-${i}`} cx={p.cx} cy={p.cy} r={i===7 ? 4.5 : 4} opacity={i===0 ? 0.3 : 1} stroke={stroke} strokeWidth="1"/>)}
        {(type.includes('BCC') || type.includes('BCT')) && (<circle cx={proj(0.5,0.5,0.5).cx} cy={proj(0.5,0.5,0.5).cy} r="6" fill="#fbbf24" stroke={stroke} strokeWidth="1.5"/>)}
        {type.includes('FCC') && [
          proj(0.5,0.5,0), proj(0.5,0.5,1), proj(0.5,0,0.5), proj(0.5,1,0.5), proj(0,0.5,0.5), proj(1,0.5,0.5)
        ].map((p, i) => <circle key={`f-${i}`} cx={p.cx} cy={p.cy} r="4" fill="#60a5fa" stroke={stroke} strokeWidth="1"/>)}
      </g>
    </svg>
  );
});

const MicrostructureDisplay = React.memo(({ onCapture }) => {
  const { simState: state, carbon, temp } = useThermoState();
  const { isDark, etchant } = useThermoAction();
  const c = parseNum(carbon, 0);
  const t = parseNum(temp, 20);

  const [flash, triggerFlash] = useEphemeralMessage(300);
  const pid = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const filterId = `warp-${pid}`;
  
  const colors = {
    nital: { ferrite: isDark?'#1e293b':'#f8fafc', austenite: isDark?'#0f172a':'#e2e8f0', cementite: isDark?'#cbd5e1':'#334155', liquid: isDark?'#fef3c7':'#fffbeb', bainiteDark: isDark?'#cbd5e1':'#1e293b' },
    picral: { ferrite: isDark?'#020617':'#ffffff', austenite: isDark?'#0f172a':'#f1f5f9', cementite: isDark?'#f8fafc':'#000000', liquid: isDark?'#fef3c7':'#fffbeb', bainiteDark: isDark?'#f8fafc':'#000000' },
    polished: { ferrite: isDark?'#334155':'#e2e8f0', austenite: isDark?'#1e293b':'#cbd5e1', cementite: isDark?'#475569':'#94a3b8', liquid: isDark?'#fef3c7':'#fffbeb', bainiteDark: isDark?'#475569':'#94a3b8' }
  };
  const theme = colors[etchant];
  
  let pSpace = 10;
  if (t < CONSTANTS.FE_C.T_EUTECTOID) {
    const dT = Math.max(1, CONSTANTS.FE_C.T_EUTECTOID - t);
    pSpace = Math.max(2, Math.min(15, 150 / Math.sqrt(dT)));
  }

  const handleCapture = useCallback(() => { triggerFlash(); onCapture(); }, [triggerFlash, onCapture]);

  const patterns = (
    <defs>
      <pattern id={`pearlite-${pid}`} width={pSpace} height={pSpace} patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
        <rect width={pSpace} height={pSpace} fill={theme.ferrite} />
        {etchant !== 'polished' && <line x1="0" y1={pSpace/2} x2={pSpace} y2={pSpace/2} stroke={theme.cementite} strokeWidth={pSpace * 0.4} />}
      </pattern>
      <pattern id={`ledeburite-${pid}`} width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill={theme.cementite} />
        <circle cx="4" cy="4" r="2.5" fill={t < CONSTANTS.FE_C.T_EUTECTOID ? `url(#pearlite-${pid})` : theme.austenite} />
        <circle cx="10" cy="10" r="2" fill={t < CONSTANTS.FE_C.T_EUTECTOID ? `url(#pearlite-${pid})` : theme.austenite} />
      </pattern>
      <pattern id={`martensite-${pid}`} width="30" height="30" patternUnits="userSpaceOnUse">
        <rect width="30" height="30" fill={theme.ferrite} />
        {etchant !== 'polished' && (
          <>
            <path d="M-5,15 L35,15 M15,-5 L15,35 M0,0 L30,30 M30,0 L0,30" stroke={theme.cementite} strokeWidth="1" opacity="0.6" />
            <path d="M5,10 L25,20 M10,5 L20,25" stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth="2" />
          </>
        )}
      </pattern>
      <pattern id={`tempered-${pid}`} width="15" height="15" patternUnits="userSpaceOnUse">
        <rect width="15" height="15" fill={theme.ferrite} />
        {etchant !== 'polished' && (
          <>
            <circle cx="3" cy="3" r="1" fill={theme.cementite} /> <circle cx="10" cy="7" r="1.5" fill={theme.cementite} /> <circle cx="5" cy="12" r="1" fill={theme.cementite} />
            <path d="M0,0 L15,15 M15,0 L0,15" stroke={theme.cementite} strokeWidth="0.5" opacity="0.3" />
          </>
        )}
      </pattern>
      <pattern id={`bainite-${pid}`} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill={theme.ferrite} />
        {etchant !== 'polished' && (
          <>
             <path d="M2,10 Q10,2 18,10 Q10,18 2,10" fill="none" stroke={theme.bainiteDark} strokeWidth="1" /> <circle cx="10" cy="10" r="1.5" fill={theme.cementite} />
             <path d="M-5,-5 L25,25" stroke={theme.bainiteDark} strokeWidth="0.5" opacity="0.4" />
          </>
        )}
      </pattern>
      <filter id={filterId}><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed={Math.floor(c * 1337) % 100} result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" /></filter>
      <clipPath id={`microscopeClip-${pid}`}><circle cx="150" cy="150" r="145" /></clipPath>
      <radialGradient id={`vignetteGrad-${pid}`} cx="50%" cy="50%" r="50%"><stop offset="70%" stopColor="transparent" /><stop offset="100%" stopColor="rgba(0,0,0,0.7)" /></radialGradient>
    </defs>
  );

  const baseGrains = [
    "M0,0 L100,0 L120,80 L0,100 Z", "M100,0 L220,0 L180,90 L120,80 Z", "M220,0 L300,0 L300,110 L260,100 L180,90 Z",
    "M0,100 L120,80 L140,180 L0,190 Z", "M120,80 L180,90 L210,160 L140,180 Z", "M180,90 L260,100 L280,180 L210,160 Z",
    "M260,100 L300,110 L300,200 L280,180 Z", "M0,190 L140,180 L110,300 L0,300 Z", "M140,180 L210,160 L230,300 L110,300 Z",
    "M210,160 L280,180 L300,300 L230,300 Z", "M280,180 L300,200 L300,300 Z"
  ];

  const getPhaseFill = (name) => {
    if (name.includes('Liquid')) return theme.liquid;
    if (name.includes('Austenite')) return theme.austenite;
    if (name.includes('Ferrite') || name.includes('Delta')) return theme.ferrite;
    if (name.includes('Cementite')) return theme.cementite;
    if (name.includes('Martensite')) return `url(#martensite-${pid})`;
    if (name.includes('Tempered')) return `url(#tempered-${pid})`;
    if (name.includes('Bainite')) return `url(#bainite-${pid})`;
    if (name === 'Pearlite') return `url(#pearlite-${pid})`;
    if (name === 'Ledeburite') return `url(#ledeburite-${pid})`;
    return theme.ferrite;
  };

  const regionId = state.regionId;

  const renderContent = useMemo(() => {
    let indices = baseGrains.map((_, i) => i);
    const stableSeed = Math.floor(c * 10) * 100 + (regionId ? regionId.length : 0);
    indices.sort((a, b) => seededRandom(stableSeed + a) - seededRandom(stableSeed + b));

    let assignments = []; let currentIdx = 0;
    
    state.microFractions.forEach(f => {
       const count = Math.round((f.frac / 100) * baseGrains.length);
       for(let i=0; i<count && currentIdx < indices.length; i++) assignments[indices[currentIdx++]] = getPhaseFill(f.name);
    });
    while(currentIdx < indices.length) assignments[indices[currentIdx++]] = getPhaseFill(state.microFractions[0]?.name || 'Ferrite');

    const boundaryColor = isDark ? '#334155' : '#cbd5e1';
    return baseGrains.map((d, i) => <path key={i} d={d} fill={assignments[i]} stroke={boundaryColor} strokeWidth={etchant === 'polished' ? 0.5 : 2} strokeLinejoin="round" filter={`url(#${filterId})`}/>);
  }, [c, regionId, state.microFractions, theme, pid, filterId, etchant, isDark]);

  const glowStyle = {
    boxShadow: t > 600 ? `0 0 40px 10px ${getBlackbodyGlow(t, 0.6)}, inset 0 0 30px 5px ${getBlackbodyGlow(t, 0.6)}` : 'none',
    borderColor: t > 600 ? getBlackbodyGlow(t, 1.0) : (isDark ? '#334155' : '#cbd5e1')
  };

  return (
    <div className="flex flex-col items-center relative w-full">
      <div className={cn("relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-[8px] transition-all duration-500 group", isDark ? 'bg-slate-900' : 'bg-slate-100')} style={glowStyle}>
        <svg viewBox="0 0 300 300" className="w-full h-full block" role="img" aria-label={`Microstructure: ${state.micro}`}>
          {patterns}
          <g clipPath={`url(#microscopeClip-${pid})`}>
            {renderContent}
            <circle cx="150" cy="150" r="145" fill={`url(#vignetteGrad-${pid})`} className="pointer-events-none"/>
            <line x1="150" y1="5" x2="150" y2="295" stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} strokeWidth="1" strokeDasharray="4,4" />
            <line x1="5" y1="150" x2="295" y2="150" stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} strokeWidth="1" strokeDasharray="4,4" />
            <circle cx="150" cy="150" r="75" fill="none" stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"} strokeWidth="1" />
          </g>
          <circle cx="150" cy="150" r="145" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="10" />
          <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        </svg>

        <div className="absolute inset-0 pointer-events-none transition-colors duration-500 mix-blend-hard-light" style={{ backgroundColor: getBlackbodyGlow(t, isDark ? 0.7 : 0.55) }} />
        <div className={cn("absolute inset-0 bg-white pointer-events-none transition-opacity duration-300", flash ? 'opacity-100' : 'opacity-0')} />

        <button onClick={handleCapture} className="absolute bottom-4 right-4 p-2.5 bg-indigo-600/90 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-50 hover:scale-110 active:scale-95 focus:opacity-100" title="Capture Micrograph"><Camera size={16} /></button>

        {state.isQuenched && !state.isTempered && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-purple-600/90 backdrop-blur-md text-white text-[10px] px-2.5 py-0.5 rounded font-bold tracking-widest uppercase shadow-md pointer-events-none whitespace-nowrap">Martensitic</div>
        )}
      </div>
      <div className={cn("text-[10px] font-mono tracking-widest mt-4 px-3 py-1 rounded-full shadow-sm border", isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-600 border-slate-300')}>
        500x Mag • {etchant.toUpperCase()} {etchant !== 'polished' ? 'Etch' : ''}
      </div>
    </div>
  );
});

const PropertyGauge = React.memo(({ label, value, unit, max, colorClass }) => {
  const { isDark } = useThermoAction();
  return (
    <div className={cn("p-3 rounded-xl border transition-all hover:shadow-md", isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200')}>
      <div className="flex justify-between items-end mb-1.5">
        <span className={cn("text-[10px] uppercase tracking-widest font-bold", isDark ? 'text-slate-400' : 'text-slate-500')}>{label}</span>
        <span className={cn("font-mono text-sm font-black", isDark ? 'text-slate-100' : 'text-slate-800')}>
          {value} <span className="font-sans font-medium text-[9px] opacity-60">{unit}</span>
        </span>
      </div>
      <div className={cn("h-2 w-full rounded-full overflow-hidden shadow-inner", isDark ? 'bg-slate-900' : 'bg-slate-100')}>
        <div className={cn("h-full transition-all duration-500 ease-out", colorClass)} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
});

const CoolingCurvePlot = React.memo(() => {
  const { historyTrail, temp, alloy } = useThermoState();
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);
  const { isDark, theme } = useThermoAction();

  const w = 320, h = 140;
  const m = { top: 16, right: 16, bottom: 36, left: 48 };
  const innerW = w - m.left - m.right;
  const innerH = h - m.top - m.bottom;

  const currentT = parseNum(temp, 20);

  const trail = useMemo(() => {
    if (!historyTrail || historyTrail.length < 2) return [];
    let startIdx = 0;
    for (let i = 1; i < historyTrail.length; i++) {
      if (historyTrail[i].t < historyTrail[i - 1].t) { startIdx = i - 1; break; }
    }
    return historyTrail.slice(startIdx);
  }, [historyTrail]);

  const { minT, maxT, minTime, maxTime } = useMemo(() => {
    if (trail.length < 2) return { minT: 0, maxT: CONSTANTS.FE_C.T_MAX, minTime: 0, maxTime: 1 };
    const temps = trail.map(p => p.t);
    const times = trail.map(p => p.time);
    return {
      minT: Math.max(0, Math.min(...temps) - 20),
      maxT: Math.min(CONSTANTS.FE_C.T_MAX, Math.max(...temps) + 20),
      minTime: Math.min(...times),
      maxTime: Math.max(...times) + 0.01
    };
  }, [trail]);

  const mapX = (time) => m.left + ((time - minTime) / (maxTime - minTime)) * innerW;
  const mapY = (t) => m.top + (1 - (t - minT) / (maxT - minT)) * innerH;

  const pathStr = useMemo(() => {
    if (trail.length < 2) return '';
    return trail.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.time)},${mapY(p.t)}`).join(' ');
  }, [trail, minT, maxT, minTime, maxTime]);

  const axisColor = isDark ? '#475569' : '#94a3b8';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';

  const criticalLines = [
    { t: consts.T_EUTECTOID, label: 'A₁', color: '#f43f5e' },
    { t: consts.T_A3_PURE, label: 'A₃', color: '#f97316' },
  ].filter(l => l.t >= minT && l.t <= maxT);

  if (trail.length < 2) {
    return (
      <div className={cn("rounded-xl border p-4 flex flex-col items-center justify-center gap-2", isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200')} style={{ height: h }}>
        <LineChart size={20} className={cn("opacity-30", theme.textMuted)} />
        <p className={cn("text-[10px] uppercase tracking-widest font-bold opacity-40", theme.textMuted)}>
          Run a heat treatment to see the cooling curve
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border overflow-hidden", isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200')}>
      <div className={cn("px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-2", theme.textMuted)}>
        <LineChart size={12} /> Cooling Curve (T vs Time)
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block">
        <g stroke={gridColor} strokeWidth="1">
          {[0.25, 0.5, 0.75].map(f => <line key={`gx-${f}`} x1={m.left + f * innerW} y1={m.top} x2={m.left + f * innerW} y2={h - m.bottom} />)}
          {[0.33, 0.67].map(f => <line key={`gy-${f}`} x1={m.left} y1={m.top + f * innerH} x2={w - m.right} y2={m.top + f * innerH} />)}
        </g>
        {criticalLines.map(l => (
          <g key={`cl-${l.t}`}>
            <line x1={m.left} y1={mapY(l.t)} x2={w - m.right} y2={mapY(l.t)} stroke={l.color} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
            <text x={w - m.right + 2} y={mapY(l.t) + 3} fontSize="8" fontWeight="bold" fill={l.color} opacity="0.8">{l.label}</text>
          </g>
        ))}
        {pathStr && (
          <>
            <path d={pathStr} fill="none" stroke="#ef4444" strokeWidth="5" strokeOpacity="0.15" style={{ filter: 'blur(3px)' }} strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathStr} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {trail.length > 0 && (
          <circle cx={mapX(trail[trail.length - 1].time)} cy={mapY(currentT)} r="4" fill="#ef4444" stroke={isDark ? '#0f172a' : '#fff'} strokeWidth="2" />
        )}
        <path d={`M ${m.left} ${m.top} L ${m.left} ${h - m.bottom} L ${w - m.right} ${h - m.bottom}`} fill="none" stroke={axisColor} strokeWidth="1.5" />
        {[minT, (minT + maxT) / 2, maxT].map((t, i) => (
          <g key={`ty-${i}`} transform={`translate(${m.left}, ${mapY(t)})`}>
            <line x2="-4" stroke={axisColor} strokeWidth="1" />
            <text x="-6" y="3" textAnchor="end" fontSize="8" fill={isDark ? '#94a3b8' : '#64748b'}>{Math.round(t)}</text>
          </g>
        ))}
        <text x={m.left + innerW / 2} y={h - 4} textAnchor="middle" fontSize="8" fontWeight="bold" fill={isDark ? '#64748b' : '#94a3b8'} letterSpacing="1">TIME (s)</text>
        <text transform={`rotate(-90) translate(${-(m.top + innerH / 2)}, 12)`} textAnchor="middle" fontSize="8" fontWeight="bold" fill={isDark ? '#64748b' : '#94a3b8'} letterSpacing="1">°C</text>
      </svg>
    </div>
  );
});

const TopNav = () => {
  const { carbon, temp, isPending } = useThermoState();
  const { isDark, setIsDark, zoomSteel, setZoomSteel, theme } = useThermoAction();
  const [copiedLink, triggerCopiedLink] = useEphemeralMessage(2000);

  const shareState = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?c=${parseNum(carbon, 0).toFixed(3)}&t=${parseNum(temp, 0).toFixed(0)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(triggerCopiedLink).catch(e => console.error(e)); }
  }, [carbon, temp, triggerCopiedLink]);

  return (
    <nav className={cn("sticky top-0 z-50 px-4 md:px-8 py-3.5 border-b shadow-[0_4px_30px_rgba(0,0,0,0.05)] flex flex-wrap justify-between items-center gap-4", theme.border, theme.panelBg)}>
      <div className="flex items-center gap-4">
        <div className={cn("p-2 rounded-xl transition-all duration-300", isDark ? 'bg-indigo-900/40 shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'bg-gradient-to-br from-indigo-50 to-white shadow-sm border border-indigo-100')}>
          <CustomLogo isDark={isDark} />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-rose-500 dark:from-indigo-400 dark:to-rose-400 flex items-center gap-2">
            ABAJIS-SteelLab
            {isPending && <Loader2 className="animate-spin text-indigo-500 w-4 h-4" />}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn("text-[10px] font-mono font-medium tracking-widest", theme.textMuted)}>{APP_VERSION}</span>
            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')}>Active</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button onClick={shareState} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all shadow-sm focus-visible:outline-none", copiedLink ? 'bg-emerald-500 border-emerald-500 text-white' : (isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'))}>
          <Share2 size={16}/> <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
        </button>
        <button onClick={() => setZoomSteel(!zoomSteel)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all shadow-sm focus-visible:outline-none", zoomSteel ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700' : (isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'))}>
          <Search size={16}/> <span className="hidden sm:inline">{zoomSteel ? 'Full Map' : 'Steel View'}</span>
        </button>
        <button onClick={() => setIsDark(!isDark)} className={cn("p-2.5 rounded-xl border transition-all shadow-sm focus-visible:outline-none", isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-amber-400' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600')}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </nav>
  );
};

const ControlsSection = () => {
  const { carbon, temp, mode, maxRate } = useThermoState();
  const { alloy, setAlloy, handleAlloyChange, setCarbon, setTemp, changeMode, zoomSteel, setZoomSteel, theme, isDark, maxC } = useThermoAction();

  const [showAlloys, setShowAlloys] = useState(false);

  const stepCarbon = (dir) => { changeMode('manual', true); setCarbon(prev => Number(Math.max(0, Math.min(zoomSteel ? 2.5 : CONSTANTS.FE_C.C_CEMENTITE, parseNum(prev, 0) + dir * 0.01)).toFixed(3)).toString()); };
  const stepTemp = (dir) => { changeMode('manual', true); setTemp(prev => Math.max(0, Math.min(CONSTANTS.FE_C.T_MAX, parseNum(prev, 0) + dir * 5)).toString()); };
  const handleCarbonChange = (e) => { changeMode('manual', true); const val = e.target.value; setCarbon(val); if (!isNaN(parseFloat(val)) && parseFloat(val) > 2.5 && zoomSteel) setZoomSteel(false); };
  const handleTempChange = (e) => { changeMode('manual', true); setTemp(e.target.value); };

  return (
    <section className={cn("backdrop-blur-xl border rounded-2xl p-6 shadow-xl shrink-0", theme.border, isDark ? 'bg-slate-900/50' : 'bg-white/80')}>
      <div className="flex flex-col gap-4 mb-6 pb-5 border-b border-slate-200 dark:border-slate-800/80">
        <span className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-1.5", theme.textMuted)}>
          <Database size={14} /> Materials Library
          <TooltipHelp text="Grades contain specific CE equivalents. Shift+Click on diagram to snap to critical eutectic/eutectoid compositions." />
        </span>
        <div className="flex flex-wrap gap-2">
          {STEEL_GRADES.map((grade) => (
            <button 
              key={grade.name}
              onClick={() => { setAlloy({ c: grade.c, mn: grade.mn, si: grade.si || 0.2, cr: grade.cr, mo: grade.mo, v: grade.v, ni: grade.ni, cu: grade.cu }); changeMode('manual', false); if (grade.c > 2.5 && zoomSteel) setZoomSteel(false); }}
              title={grade.desc}
              className={cn("px-3 py-2 rounded-lg text-xs font-bold transition-all border flex flex-col items-start gap-1 focus-visible:outline-none", Math.abs(parseNum(carbon, 0) - grade.c) < 0.01 && Math.abs(alloy.cr - grade.cr) < 0.1 ? 'bg-indigo-100 border-indigo-300 dark:bg-indigo-500/20 dark:border-indigo-500/50 shadow-inner' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/80 dark:border-slate-700 dark:hover:bg-slate-700')}
            >
              <span className={Math.abs(parseNum(carbon, 0) - grade.c) < 0.01 && Math.abs(alloy.cr - grade.cr) < 0.1 ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}>{grade.name}</span>
              <span className="text-[9px] uppercase tracking-wider opacity-60 font-medium">{grade.group}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-center">
        <div className="flex-1 w-full space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-xs font-bold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">Carbon (wt%)</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm ml-2">
                <button onClick={() => stepCarbon(-1)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><Minus size={14} /></button>
                <input type="number" step="0.01" min="0" max="6.67" value={carbon} onChange={handleCarbonChange} className={cn("w-16 text-center py-1 bg-transparent font-mono text-sm font-black focus:outline-none", theme.textMain)} />
                <button onClick={() => stepCarbon(1)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><Plus size={14} /></button>
              </div>
            </div>
          </div>
          <input type="range" min="0" max={zoomSteel ? 2.5 : CONSTANTS.FE_C.C_CEMENTITE} step="0.001" value={parseNum(carbon, 0)} onChange={handleCarbonChange} className="w-full accent-indigo-500 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer" />
          
          <button onClick={() => setShowAlloys(!showAlloys)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 mt-1 transition-colors focus-visible:outline-none">
            <Settings size={12} /> {showAlloys ? 'Hide Alloying Elements' : 'Advanced Alloying (Mn, Si, Cr, Ni...)'}
            {showAlloys ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-xs font-bold tracking-widest uppercase text-rose-500 dark:text-rose-400">Temperature (°C)</label>
            <div className="flex items-center gap-2">
              <button onClick={() => { changeMode('manual', true); setTemp("20"); }} className="text-[9px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">Room T</button>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <button onClick={() => stepTemp(-1)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><Minus size={14} /></button>
                <input type="number" step="1" min="0" max="1600" value={temp} onChange={handleTempChange} className={cn("w-16 text-center py-1 bg-transparent font-mono text-sm font-black focus:outline-none", theme.textMain)} />
                <button onClick={() => stepTemp(1)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><Plus size={14} /></button>
              </div>
            </div>
          </div>
          <input type="range" min="0" max={CONSTANTS.FE_C.T_MAX} step="1" value={parseNum(temp, 0)} onChange={handleTempChange} className="w-full accent-rose-500 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer" />
        </div>
      </div>

      {showAlloys && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mt-6 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 fade-in">
           {['mn', 'si', 'cr', 'ni', 'mo', 'v', 'cu'].map(elem => (
               <div key={elem} className="flex flex-col gap-1.5">
                   <div className="flex justify-between items-center">
                     <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{elem} (wt%)</label>
                     <input type="number" step="0.01" min="0" max="15" value={alloy[elem]} onChange={(e) => handleAlloyChange(elem, e.target.value)} className={cn("w-12 px-1 py-0.5 rounded text-[10px] font-mono font-bold border focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600", theme.textMain)} />
                   </div>
                   <input type="range" step="0.01" min="0" max={elem==='cr'||elem==='ni'?15:elem==='mn'?5:2} value={alloy[elem]} onChange={(e) => handleAlloyChange(elem, e.target.value)} className="w-full accent-indigo-400 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer" />
               </div>
           ))}
           <div className="col-span-full mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl flex items-start gap-3">
              <Shield size={16} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
              <div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-800 dark:text-indigo-300 mb-0.5">Alloy Space Navigator</h4>
                 <p className="text-[10px] text-indigo-700 dark:text-indigo-400/80 font-medium leading-relaxed">Adjusting elements dynamically shifts the iso-weldability contours (Carbon Equivalent boundaries) across the phase diagram and alters the transformation kinetics ($M_s$, $B_s$).</p>
              </div>
           </div>
        </div>
      )}

      <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row gap-4 items-center">
          <div className={cn("text-[9px] font-bold uppercase tracking-widest flex items-center gap-1", theme.textMuted)}>
            <Flame size={12}/> Thermal Mod:
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => changeMode(mode === 'anneal' ? 'manual' : 'anneal')} className={cn("flex flex-1 md:flex-none items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-sm", mode === 'anneal' ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-slate-700')}>Anneal</button>
            <button onClick={() => changeMode(mode === 'normalize' ? 'manual' : 'normalize')} className={cn("flex flex-1 md:flex-none items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-sm", mode === 'normalize' ? 'bg-sky-500 text-white shadow-sky-500/30' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-slate-700')}>Norm.</button>
            <button onClick={() => changeMode(mode === 'quench' ? 'manual' : 'quench')} className={cn("flex flex-1 md:flex-none items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-sm", mode === 'quench' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)] border-purple-500' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30')}>
              <Zap size={14} className={mode === 'quench' ? 'animate-pulse' : ''} /> Quench
            </button>
            {maxRate >= CONSTANTS.RATES.CRITICAL_MARTENSITE && parseNum(temp, 20) <= consts.T_EUTECTOID && (
              <button onClick={() => changeMode(mode === 'temper' ? 'manual' : 'temper')} className={cn("flex flex-1 md:flex-none items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-sm", mode === 'temper' ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] border-rose-500' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30')}>
                <RefreshCw size={14} className={mode === 'temper' ? 'animate-spin' : ''} /> Temper
              </button>
            )}
          </div>
      </div>
      <SmartAssistant />
    </section>
  );
};

const TargetInput = React.memo(({ label, targetKey, placeholder, targets, setTargets, isDark }) => (
  <div className={cn("flex flex-col gap-1.5 p-3 rounded-xl border transition-colors", isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50/50 border-slate-200')}>
     <div className="flex justify-between items-center mb-1">
       <label className={cn("text-[9px] font-bold uppercase tracking-widest", isDark ? 'text-slate-400' : 'text-slate-500')}>{label}</label>
       <select 
         value={targets[targetKey].weight} 
         onChange={(e) => setTargets(prev => ({...prev, [targetKey]: {...prev[targetKey], weight: parseFloat(e.target.value)}}))}
         className="text-[9px] font-bold uppercase bg-transparent text-indigo-500 dark:text-indigo-400 focus:outline-none cursor-pointer"
       >
         <option value="0.5">Low Priority</option>
         <option value="1">Normal Priority</option>
         <option value="2">High Priority</option>
       </select>
     </div>
     <input 
       type="number" placeholder={placeholder} 
       value={targets[targetKey].val} 
       onChange={(e) => setTargets(prev => ({...prev, [targetKey]: {...prev[targetKey], val: e.target.value}}))} 
       className={cn("w-full px-3 py-2 rounded-lg text-sm font-mono font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all", isDark ? 'bg-slate-900/80 border-slate-700 text-slate-100 placeholder-slate-600' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-300')} 
     />
  </div>
));

const InverseDesignSection = () => {
  const { alloy } = useThermoState();
  const { setAlloy, setCarbon, setTemp, changeMode, theme, isDark } = useThermoAction();
  
  const [targets, setTargets] = useState({ 
    hv: { val: '', weight: 1 }, yield: { val: '', weight: 1 }, 
    uts: { val: '', weight: 1 }, elong: { val: '', weight: 1 } 
  });
  const [results, setResults] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = () => {
    setIsOptimizing(true);
    setResults([]);
    setTimeout(() => {
      const parsedTargets = {
        hv: { val: parseFloat(targets.hv.val) || 0, weight: targets.hv.weight },
        yield: { val: parseFloat(targets.yield.val) || 0, weight: targets.yield.weight },
        uts: { val: parseFloat(targets.uts.val) || 0, weight: targets.uts.weight },
        elong: { val: parseFloat(targets.elong.val) || 0, weight: targets.elong.weight }
      };
      if (parsedTargets.hv.val === 0 && parsedTargets.yield.val === 0 && parsedTargets.uts.val === 0 && parsedTargets.elong.val === 0) { setIsOptimizing(false); return; }
      
      const rawResults = OptimizationEngine.runInverseDesign(parsedTargets, alloy);
      setResults(rawResults); 
      setIsOptimizing(false);
    }, 100); // Shorter timeout, UI is updated before the heavy compute
  };

  const applyResult = (res) => {
    changeMode('manual', false); 
    setAlloy(res.alloy); // Set the full multi-dimensional composition
    setCarbon(res.alloy.c.toFixed(3)); 
    setTemp("900"); 
    setTimeout(() => {
        if (res.process.includes('Annealed')) changeMode('anneal');
        else if (res.process.includes('Normalized')) changeMode('normalize');
        else if (res.process.includes('Tempered')) changeMode('temper');
        else if (res.process.includes('Quenched')) changeMode('quench');
        else { setTemp("20"); changeMode('manual', false); }
    }, 500);
  };

  return (
    <section className={cn("backdrop-blur-xl border rounded-2xl p-6 shadow-xl shrink-0 transition-all duration-500", theme.border, isDark ? 'bg-slate-900/50' : 'bg-white/80')}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <h2 className="text-sm font-black tracking-widest uppercase flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-indigo-500">
            <Wand2 size={16} className="text-emerald-500" /> Multi-Objective Inverse Design Engine
          </h2>
          <p className={cn("text-[10px] mt-1 font-medium", theme.textMuted)}>Utilizing Nelder-Mead Simplex across 6-dimensional composition space.</p>
        </div>
        <button onClick={handleOptimize} disabled={isOptimizing} className={cn("px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-2", isOptimizing ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-95')}>
          {isOptimizing ? <><Loader2 size={14} className="animate-spin" /> Solving...</> : <><Search size={14} /> Run Solver</>}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TargetInput label="Target Hardness (HV)" targetKey="hv" placeholder="e.g. 450" targets={targets} setTargets={setTargets} isDark={isDark} />
        <TargetInput label="Target Yield Str. (MPa)" targetKey="yield" placeholder="e.g. 850" targets={targets} setTargets={setTargets} isDark={isDark} />
        <TargetInput label="Target Ult. Str. (MPa)" targetKey="uts" placeholder="e.g. 1000" targets={targets} setTargets={setTargets} isDark={isDark} />
        <TargetInput label="Min. Elongation (%)" targetKey="elong" placeholder="e.g. 15" targets={targets} setTargets={setTargets} isDark={isDark} />
      </div>

      {results.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.map((res, i) => (
              <div key={i} className={cn("p-4 rounded-xl border flex flex-col justify-between transition-all hover:shadow-lg", isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200')}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider", res.matchScore > 85 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : res.matchScore > 60 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20')}>
                      {res.matchScore.toFixed(1)}% Match
                    </span>
                    <span className={cn("text-[9px] uppercase tracking-widest font-bold opacity-60")}>Option {i+1}</span>
                  </div>
                  <div className="my-4 space-y-2">
                    <div className="flex flex-col gap-1">
                       <span className={cn("font-medium text-[10px] uppercase tracking-widest", theme.textMuted)}>Alloy Requirement:</span>
                       <span className="font-mono font-black text-xs leading-tight">
                         {res.alloy.c.toFixed(2)}C {res.alloy.mn.toFixed(2)}Mn {res.alloy.si.toFixed(2)}Si 
                         <br/>
                         {res.alloy.cr>0.05 ? res.alloy.cr.toFixed(1)+'Cr ' : ''}{res.alloy.ni>0.05 ? res.alloy.ni.toFixed(1)+'Ni ' : ''}{res.alloy.mo>0.05 ? res.alloy.mo.toFixed(1)+'Mo' : ''}
                       </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t dark:border-slate-800 border-slate-100">
                       <span className={cn("font-medium text-[10px] uppercase tracking-widest", theme.textMuted)}>Process:</span>
                       <span className="font-black text-[10px] uppercase tracking-wider text-indigo-500 dark:text-indigo-400">{res.process}</span>
                    </div>
                  </div>
                  <div className={cn("p-2 rounded-lg border text-[10px] font-mono grid grid-cols-4 gap-1.5 text-center mt-4", isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200')}>
                    <div><div className="opacity-50 font-sans mb-0.5 text-[8px]">HV</div><div className="font-bold text-[10px]">{res.state.hardness.hv}</div></div>
                    <div className="border-x dark:border-slate-800 border-slate-200"><div className="opacity-50 font-sans mb-0.5 text-[8px]">Yield</div><div className="font-bold text-[10px]">{res.state.yield}</div></div>
                    <div className="border-r dark:border-slate-800 border-slate-200"><div className="opacity-50 font-sans mb-0.5 text-[8px]">UTS</div><div className="font-bold text-[10px]">{res.state.uts}</div></div>
                    <div><div className="opacity-50 font-sans mb-0.5 text-[8px]">Elong</div><div className="font-bold text-[10px]">{res.state.elong}%</div></div>
                  </div>
                </div>
                <button onClick={() => applyResult(res)} className={cn("w-full mt-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700')}>Simulate Configuration</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const DiagramSection = () => {
  const { alloy, carbon, temp, historyTrail, simState } = useThermoState();
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

  const tooltipW = 160;
  const rawTx = geometry.mapX(parseNum(carbon, 0));
  const tx = Math.max(geometry.m.left + tooltipW/2, Math.min(rawTx, geometry.w - geometry.m.right - tooltipW/2));
  const rawTy = geometry.mapY(parseNum(temp, 0));
  const ty = Math.max(geometry.m.top + 40, rawTy - 20);

  return (
    <section className={cn("backdrop-blur-xl border rounded-2xl p-2 shadow-xl relative overflow-hidden group shrink-0", theme.border, isDark ? 'bg-slate-900/50' : 'bg-white/80')}>
       <div className="absolute top-5 left-5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 px-3 py-1.5 rounded-lg shadow-lg text-[10px] font-bold z-10 backdrop-blur-md">
         <MousePointerClick size={12} /> Drag to adjust. <span className="opacity-50 mx-1">|</span> Shift + Drag to snap. <span className="opacity-50 mx-1">|</span> Arrow keys to nudge.
       </div>

       <button
         onClick={() => setShowWeldability(!showWeldability)}
         className={cn("absolute top-5 right-5 z-20 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-1.5 border backdrop-blur-md focus-visible:outline-none", showWeldability ? 'bg-indigo-600/90 text-white border-indigo-500' : isDark ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-slate-50')}
       >
         <Shield size={14} className={showWeldability ? 'text-emerald-400' : ''} /> {showWeldability ? 'Hide Weldability Map' : 'Show Weldability Map'}
       </button>

       <svg ref={svgRef} width="100%" viewBox={`0 0 ${geometry.w} ${geometry.h}`} style={{ touchAction: 'none' }} className={cn("w-full h-full font-sans select-none overflow-hidden block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500", theme.diagramBgClass, isDragging ? 'cursor-grabbing' : 'cursor-crosshair')} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onKeyDown={handleSVGKeyDown} tabIndex="0" role="application" aria-label="Interactive Iron-Carbon Phase Diagram">
          <WeldabilityOverlay />
          <DiagramSkeleton />
          
          <g className="pointer-events-none">
            {historyPointsStr && (
              <>
                <polyline points={historyPointsStr} fill="none" stroke="#ef4444" strokeWidth="6" strokeOpacity="0.2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'blur(4px)' }} />
                <polyline points={historyPointsStr} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeOpacity="0.9" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
            {simState.phaseFractions.length > 1 && (
              <line x1={geometry.mapX(simState.phaseFractions[0].pos)} y1={geometry.mapY(parseNum(temp, 0))} x2={geometry.mapX(simState.phaseFractions[1].pos)} y2={geometry.mapY(parseNum(temp, 0))} stroke="#10b981" strokeWidth="4" strokeOpacity="0.8" strokeLinecap="round" />
            )}
            <line x1={geometry.mapX(parseNum(carbon, 0))} y1={geometry.m.top} x2={geometry.mapX(parseNum(carbon, 0))} y2={geometry.h - geometry.m.bottom} stroke={isDark?'#fff':'#000'} strokeWidth="1.5" strokeDasharray="4,6" opacity={isDragging ? 0.3 : 0.1} />
            <line x1={geometry.m.left} y1={geometry.mapY(parseNum(temp, 0))} x2={geometry.w - geometry.m.right} y2={geometry.mapY(parseNum(temp, 0))} stroke={isDark?'#fff':'#000'} strokeWidth="1.5" strokeDasharray="4,6" opacity={isDragging ? 0.3 : 0.1} />
            
            <g transform={`translate(${geometry.mapX(parseNum(carbon, 0))}, ${geometry.mapY(parseNum(temp, 0))})`}>
               <circle r={isDragging ? "10" : "8"} fill="#ef4444" stroke={isDark?'#0f172a':'#fff'} strokeWidth="3" className={`shadow-2xl transition-all duration-200 ${isDragging ? 'scale-125' : ''}`} />
               <circle r="3" fill="white" />
               <Crosshair className="text-white opacity-50 w-8 h-8 -translate-x-4 -translate-y-4 pointer-events-none" />
            </g>
            
            <g transform={`translate(${tx - tooltipW/2}, ${ty})`}>
                <rect x="0" y="-36" width={tooltipW} height="46" rx="8" fill={isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.95)'} stroke={isDark ? 'rgba(51,65,85,0.8)' : 'rgba(203,213,225,0.8)'} strokeWidth="1" className="backdrop-blur-md drop-shadow-xl" />
                <text x={tooltipW/2} y="-18" textAnchor="middle" className={cn("text-[10px] font-black uppercase tracking-wider", isDark ? 'fill-slate-200' : 'fill-slate-700')}>{simState.regionLabel}</text>
                <text x={tooltipW/2} y="-4" textAnchor="middle" className={cn("text-[11px] font-mono font-black", isDark ? 'fill-indigo-400' : 'fill-indigo-600')}>{parseNum(carbon, 0).toFixed(2)}% C | {parseNum(temp, 0).toFixed(0)}°C</text>
            </g>
          </g>
       </svg>
    </section>
  );
};

const KineticsDiagramSection = () => {
  const { carbon, temp, historyTrail, simState, alloy } = useThermoState();
  const consts = useMemo(() => ThermoEngine.getAlloyAdjustedConstants(alloy), [alloy]);
  const { theme, isDark } = useThermoAction();
  const c = parseNum(carbon, 0);
  const currentT = parseNum(temp, 20);

  const [hoverData, setHoverData] = useState(null);
  const svgRef = useRef(null);

  const w = 850, h = 400;
  const m = { top: 40, right: 60, bottom: 60, left: 70 };
  const innerW = w - m.left - m.right;
  const innerH = h - m.top - m.bottom;
  const minLog = -1; const maxLog = 5; const maxTemp = 900;
  
  const a1Temp = consts.T_EUTECTOID;

  const mapX = useCallback((time) => {
    const logT = Math.log10(Math.max(0.1, time));
    return m.left + Math.max(0, Math.min(1, (logT - minLog) / (maxLog - minLog))) * innerW;
  }, [minLog, maxLog, innerW, m.left]);

  const mapY = useCallback((t) => m.top + Math.max(0, Math.min(1, 1 - t / maxTemp)) * innerH, [maxTemp, innerH, m.top]);

  const curves = useMemo(() => {
    // Dynamic TTT shift representing physical Hardenability from Alloying elements
    const alloyShift = (alloy?.mn || 0) * 1.5 + (alloy?.cr || 0) * 2.0 + (alloy?.ni || 0) * 0.5 + (alloy?.mo || 0) * 3.0;
    const cShift = Math.pow(Math.abs(c - 0.76), 1.2) * 1.5 + alloyShift;
    const msTemp = simState.msTemp || 200;
    
    const pStartPts = []; const pFinishPts = [];
    const bStartPts = []; const bFinishPts = [];

    for (let t = a1Temp - 5; t >= Math.max(20, msTemp); t -= 2) {
      if (t >= 480) {
        const pLogStart = 0.3 + cShift + Math.pow(Math.abs(t - 600) / 50, 2.2) * 0.6;
        const pLogFinish = pLogStart + 1.3 + Math.pow(Math.abs(t - 600) / 90, 2) * 0.4;
        pStartPts.push({ x: mapX(Math.pow(10, pLogStart)), y: mapY(t) });
        pFinishPts.push({ x: mapX(Math.pow(10, pLogFinish)), y: mapY(t) });
      }
      if (t <= 520 && t >= msTemp) {
        const bLogStart = 0.9 + cShift + Math.pow(Math.abs(t - 400) / 60, 2) * 0.8;
        const bLogFinish = bLogStart + 1.6 + Math.pow(Math.abs(t - 400) / 80, 2) * 0.5;
        bStartPts.push({ x: mapX(Math.pow(10, bLogStart)), y: mapY(t) });
        bFinishPts.push({ x: mapX(Math.pow(10, bLogFinish)), y: mapY(t) });
      }
    }

    const makePath = (pts) => pts.length ? `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
    const makeFill = (starts, finishes) => {
      if (!starts.length || !finishes.length) return '';
      return `M ${starts[0].x},${starts[0].y} ` + starts.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') + ' ' + finishes.slice().reverse().map(p => `L ${p.x},${p.y}`).join(' ') + ' Z';
    };

    return { 
      ps: makePath(pStartPts), pf: makePath(pFinishPts), pFill: makeFill(pStartPts, pFinishPts),
      bs: makePath(bStartPts), bf: makePath(bFinishPts), bFill: makeFill(bStartPts, bFinishPts), msTemp 
    };
  }, [c, mapX, mapY, simState.msTemp, alloy, a1Temp]);

  const coolingPath = useMemo(() => {
    if (!historyTrail || historyTrail.length < 2) return '';
    let startTime = historyTrail[0].time;
    for(let i = 1; i < historyTrail.length; i++) { if(historyTrail[i].t < historyTrail[i-1].t && historyTrail[i-1].t > 700) { startTime = historyTrail[i-1].time; break; } }
    let path = '';
    historyTrail.forEach((p) => {
      const relTime = Math.max(0.1, p.time - startTime);
      if (p.t > maxTemp) return; 
      const x = mapX(relTime); const y = mapY(p.t);
      path += path === '' ? `M ${x},${y}` : ` L ${x},${y}`;
    });
    return path;
  }, [historyTrail, mapX, mapY, maxTemp]);

  const handlePointerMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    let clientX = e.clientX; let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
    
    const x = ((clientX - rect.left) / rect.width) * w; const y = ((clientY - rect.top) / rect.height) * h;
    
    if (x >= m.left && x <= w - m.right && y >= m.top && y <= h - m.bottom) {
      const logT = minLog + ((x - m.left) / innerW) * (maxLog - minLog);
      const hoverTemp = maxTemp * (1 - (y - m.top) / innerH);
      setHoverData({ x, y, time: Math.pow(10, logT), temp: hoverTemp });
    } else { setHoverData(null); }
  };

  const formatTime = (sec) => {
    if (sec < 1) return sec.toFixed(2) + 's';
    if (sec < 60) return sec.toFixed(1) + 's';
    if (sec < 3600) return `${Math.floor(sec/60)}m ${(sec%60).toFixed(0)}s`;
    return `${Math.floor(sec/3600)}h ${Math.floor((sec%3600)/60)}m`;
  };

  const axisColor = isDark ? '#475569' : '#94a3b8';
  const gridColor = isDark ? '#0f172a' : '#f8fafc';

  return (
    <section className={cn("backdrop-blur-xl border rounded-2xl p-6 shadow-xl shrink-0 transition-all duration-500", theme.border, isDark ? 'bg-slate-900/50' : 'bg-white/80')}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <h2 className="text-sm font-black tracking-widest uppercase flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-500">
            <LineChart size={16} className="text-orange-500" /> Isothermal Transformation (TTT) Kinetics
          </h2>
        </div>
      </div>

      <div className="w-full overflow-x-auto relative custom-scrollbar group">
         <svg ref={svgRef} width="100%" viewBox={`0 0 ${w} ${h}`} 
              onPointerMove={handlePointerMove} onPointerLeave={() => setHoverData(null)}
              className={cn("w-full min-w-[600px] h-auto rounded-xl touch-none cursor-crosshair", theme.diagramBgClass)}>
            
            <g stroke={gridColor} strokeWidth="1.5">
               {[0,1,2,3,4,5].map(log => <line key={`gx-${log}`} x1={mapX(Math.pow(10, log))} y1={m.top} x2={mapX(Math.pow(10, log))} y2={h-m.bottom} />)}
               {[200,400,600,800].map(t => <line key={`gy-${t}`} x1={m.left} y1={mapY(t)} x2={w-m.right} y2={mapY(t)} />)}
            </g>

            {curves.msTemp > 20 && (
                <g opacity="0.8">
                    <line x1={m.left} y1={mapY(curves.msTemp)} x2={w-m.right} y2={mapY(curves.msTemp)} stroke="#a855f7" strokeWidth="2" strokeDasharray="4,4" />
                    <text x={w-m.right + 5} y={mapY(curves.msTemp) + 3} className="text-[10px] font-bold fill-purple-500">Ms</text>
                    <line x1={m.left} y1={mapY(Math.max(20, curves.msTemp - 215))} x2={w-m.right} y2={mapY(Math.max(20, curves.msTemp - 215))} stroke="#a855f7" strokeWidth="1.5" strokeDasharray="2,4" />
                    <text x={w-m.right + 5} y={mapY(Math.max(20, curves.msTemp - 215)) + 3} className="text-[9px] font-bold fill-purple-400">Mf</text>
                </g>
            )}

            <line x1={m.left} y1={mapY(a1Temp)} x2={w-m.right} y2={mapY(a1Temp)} stroke="#f43f5e" strokeWidth="2" strokeDasharray="4,4" opacity="0.5"/>
            <text x={m.left + 10} y={mapY(a1Temp) - 5} className="text-[10px] font-bold fill-rose-500 opacity-70">A1 ({Math.round(a1Temp)}°C)</text>

            <path d={curves.pFill} fill="#3b82f6" opacity={isDark ? "0.15" : "0.1"} />
            <path d={curves.bFill} fill="#10b981" opacity={isDark ? "0.15" : "0.1"} />

            <g fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={curves.ps} stroke="#3b82f6" />
                <path d={curves.pf} stroke="#3b82f6" strokeDasharray="6,4" opacity="0.8" />
                <path d={curves.bs} stroke="#10b981" />
                <path d={curves.bf} stroke="#10b981" strokeDasharray="6,4" opacity="0.8" />
            </g>

            <text x={mapX(100)} y={mapY(630)} className="text-[16px] font-black fill-blue-500 opacity-30 pointer-events-none" textAnchor="middle">PEARLITE</text>
            <text x={mapX(100)} y={mapY(330)} className="text-[16px] font-black fill-emerald-500 opacity-30 pointer-events-none" textAnchor="middle">BAINITE</text>
            <text x={mapX(1)} y={mapY(800)} className="text-[12px] font-black fill-slate-500 opacity-50 pointer-events-none">AUSTENITE (Unstable)</text>
            
            {curves.msTemp > 20 && (
               <text x={mapX(1)} y={mapY(Math.max(20, curves.msTemp - 100))} className="text-[14px] font-black fill-purple-500 opacity-30 pointer-events-none">MARTENSITE</text>
            )}

            {coolingPath && (
                <>
                    <path d={coolingPath} fill="none" stroke="#ef4444" strokeWidth="6" strokeOpacity="0.2" style={{ filter: 'blur(3px)' }} className="pointer-events-none" />
                    <path d={coolingPath} fill="none" stroke="#ef4444" strokeWidth="2.5" className="pointer-events-none" />
                </>
            )}
            <circle cx={coolingPath ? mapX(Math.max(0.1, historyTrail[historyTrail.length-1]?.time || 0.1)) : mapX(0.1)} cy={mapY(currentT)} r="5" fill="#ef4444" stroke={isDark ? '#0f172a' : '#fff'} strokeWidth="2" className="shadow-lg pointer-events-none" />

            <path d={`M ${m.left} ${m.top} L ${m.left} ${h - m.bottom} L ${w - m.right} ${h - m.bottom}`} fill="none" stroke={axisColor} strokeWidth="2.5" className="pointer-events-none" />
            
            {[ -1, 0, 1, 2, 3, 4, 5 ].map(log => (
                <g key={`tx-${log}`} transform={`translate(${mapX(Math.pow(10, log))}, ${h - m.bottom})`} className="pointer-events-none">
                    <line y2="6" stroke={axisColor} strokeWidth="2" />
                    <text y="20" textAnchor="middle" className={cn("text-[10px] font-mono font-bold", isDark ? 'fill-slate-400' : 'fill-slate-500')}>
                        {log === -1 ? '0.1' : Math.pow(10, log)}
                    </text>
                </g>
            ))}
            <text x={m.left + innerW/2} y={h - 15} textAnchor="middle" className="text-[10px] font-black uppercase tracking-widest fill-indigo-500 pointer-events-none">Time (Seconds - Log Scale)</text>

            {[0, 200, 400, 600, 800].map(t => (
                <g key={`ty-${t}`} transform={`translate(${m.left}, ${mapY(t)})`} className="pointer-events-none">
                    <line x2="-6" stroke={axisColor} strokeWidth="2" />
                    <text x="-12" y="4" textAnchor="end" className={cn("text-[10px] font-mono font-bold", isDark ? 'fill-slate-400' : 'fill-slate-500')}>{t}</text>
                </g>
            ))}
            <text transform={`rotate(-90) translate(${-m.top - innerH/2}, ${m.left - 45})`} textAnchor="middle" className="text-[10px] font-black uppercase tracking-widest fill-rose-500 pointer-events-none">Temperature (°C)</text>

            {hoverData && (
              <g className="pointer-events-none">
                <line x1={hoverData.x} y1={m.top} x2={hoverData.x} y2={h - m.bottom} stroke={isDark ? '#cbd5e1' : '#334155'} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
                <line x1={m.left} y1={hoverData.y} x2={w - m.right} y2={hoverData.y} stroke={isDark ? '#cbd5e1' : '#334155'} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
                <circle cx={hoverData.x} cy={hoverData.y} r="4" fill="none" stroke={isDark ? '#fff' : '#000'} strokeWidth="1.5" />
                
                <g transform={`translate(${Math.min(hoverData.x + 10, w - 120)}, ${Math.max(hoverData.y - 45, m.top + 10)})`}>
                  <rect width="100" height="38" rx="6" fill={isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)'} stroke={isDark ? '#334155' : '#cbd5e1'} className="shadow-lg backdrop-blur-md" />
                  <text x="50" y="16" textAnchor="middle" className={cn("text-[11px] font-black font-mono", isDark ? 'fill-rose-400' : 'fill-rose-600')}>{hoverData.temp.toFixed(0)} °C</text>
                  <text x="50" y="30" textAnchor="middle" className={cn("text-[10px] font-bold font-mono", isDark ? 'fill-slate-300' : 'fill-slate-600')}>{formatTime(hoverData.time)}</text>
                </g>
              </g>
            )}
         </svg>
      </div>
    </section>
  );
};

const SnapshotSection = () => {
  const { snapshots, setSnapshots, changeMode, setAlloy, setTemp, theme, isDark } = useThermoAction();
  
  const restoreSnapshot = useCallback((s) => {
    changeMode('manual', false);
    setAlloy(s.alloy || { c: s.c, mn: 0.5, si: 0.2, cr: 0, ni: 0, mo: 0, v: 0, cu: 0 });
    setTemp(s.t.toString());
  }, [changeMode, setAlloy, setTemp]);

  return (
    <section className={cn("backdrop-blur-xl border rounded-2xl p-6 shadow-xl shrink-0", theme.border, isDark ? 'bg-slate-900/50' : 'bg-white/80')}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-2", theme.textMuted)}>
          <Activity size={14}/> Batch Snapshots ({snapshots.length})
        </h3>
        <button onClick={() => setSnapshots([])} className="text-red-500 hover:text-red-600 flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest transition-colors"><Trash2 size={12}/> Clear All</button>
      </div>
      <div className="overflow-x-auto max-h-60 rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
            <tr className={cn("border-b text-[9px] uppercase tracking-widest", isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500')}>
              <th className="p-3 whitespace-nowrap">State</th>
              <th className="p-3">Mode</th>
              <th className="p-3">Hardness</th>
              <th className="p-3">Phase / Micro</th>
              <th className="p-3">DBTT</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.id} onClick={() => restoreSnapshot(s)} className={cn("border-b last:border-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer group", isDark ? 'border-slate-800' : 'border-slate-100')}>
                <td className="p-3 font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{(s.alloy?.c || s.c).toFixed(2)}%C @ {s.t.toFixed(0)}°C</td>
                <td className="p-3 text-[10px] font-bold uppercase tracking-wider">{s.mode}</td>
                <td className="p-3 font-mono text-xs font-bold opacity-80">{s.state.hardness.hv} HV</td>
                <td className="p-3 text-[10px] font-semibold opacity-80 truncate max-w-[150px]" title={s.state.micro}>{s.state.crystal} • {s.state.micro}</td>
                <td className="p-3 font-mono text-xs font-bold text-rose-500">{s.state.dbtt}°C</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const TelemetrySection = () => {
  const { alloy, carbon, temp, simState, mode, weldStatus } = useThermoState();
  const { snapshots, setSnapshots, etchant, setEtchant, theme, isDark, svgRef } = useThermoAction();
  const [captureMsg, triggerCapture] = useEphemeralMessage(3000);

  const takeSnapshot = useCallback(() => { 
    setSnapshots(prev => [...prev.slice(-19), { id: Date.now(), alloy: { ...alloy }, c: parseNum(carbon, 0), t: parseNum(temp, 0), mode: mode, state: { ...simState } }]); 
    triggerCapture(); 
  }, [alloy, carbon, temp, mode, simState, setSnapshots, triggerCapture]);

  const downloadSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgClone = svgRef.current.cloneNode(true);
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `text { font-family: sans-serif; } .phase-skeleton { stroke: ${isDark ? '#64748b' : '#cbd5e1'}; }`;
    svgClone.prepend(style);
    const svgData = new XMLSerializer().serializeToString(svgClone);
    ExportEngine.downloadBlob(svgData, "image/svg+xml;charset=utf-8", `ABAJIS_PhaseDiagram_${parseNum(carbon, 0).toFixed(2)}C.svg`);
  }, [svgRef, isDark, carbon]);

  const downloadCSV = useCallback(() => {
    ExportEngine.downloadBlob(ExportEngine.generateCSV(alloy, parseNum(temp), simState, snapshots), 'text/csv', `ABAJIS_Data_${parseNum(carbon).toFixed(2)}C.csv`);
  }, [alloy, carbon, temp, simState, snapshots]);

  const downloadTXT = useCallback(() => {
    ExportEngine.downloadBlob(ExportEngine.generateTXT(alloy, parseNum(temp), mode, simState, weldStatus), 'text/plain', `ABAJIS_Report_${parseNum(carbon).toFixed(2)}C_${mode}.txt`);
  }, [alloy, carbon, temp, mode, simState, weldStatus]);

  return (
    <section className={cn("backdrop-blur-xl border rounded-2xl shadow-xl flex flex-col xl:h-full overflow-hidden relative", theme.border, isDark ? 'bg-slate-900/50' : 'bg-white/80')}>
      
      <div className={cn("px-5 py-4 border-b flex items-center justify-between shrink-0 z-10", theme.border, isDark ? 'bg-slate-900/90' : 'bg-white/90')}>
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500"><Activity size={18} /></div>
          <h2 className="font-black text-sm tracking-widest uppercase">Telemetry</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("flex rounded-lg border overflow-hidden shadow-sm", isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white')}>
            <button onClick={downloadTXT} className={cn("p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500")} title="Export Academic TXT Report"><Download size={16} /></button>
            <div className={cn("w-px", isDark ? 'bg-slate-700' : 'bg-slate-200')}></div>
            <button onClick={downloadSVG} className={cn("p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500")} title="Export Diagram SVG"><ImageIcon size={16} /></button>
            <div className={cn("w-px", isDark ? 'bg-slate-700' : 'bg-slate-200')}></div>
            <button onClick={downloadCSV} className={cn("p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500")} title="Export CSV Sheet"><FileSpreadsheet size={16} /></button>
          </div>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6 flex-1 overflow-y-auto custom-scrollbar">
        <CoolingCurvePlot />
        
        <div className={cn("p-4 rounded-xl border flex items-center justify-between shadow-sm transition-colors duration-300", weldStatus.bg)}>
           <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-white/20 dark:bg-black/20", weldStatus.color)}><Shield size={18} /></div>
              <div>
                <div className={cn("text-[11px] uppercase tracking-widest font-black", weldStatus.color)}>Weldability</div>
                <div className={cn("text-[9px] font-mono font-bold opacity-70", weldStatus.color)}>CE: {weldStatus.ce}</div>
              </div>
           </div>
           <div className="text-right">
              <div className={cn("text-base font-black", weldStatus.color)}>{weldStatus.rating}</div>
              <div className={cn("text-[10px] font-medium opacity-80", weldStatus.color)}>{weldStatus.desc}</div>
           </div>
        </div>

        <div>
          <h3 className={cn("text-[11px] uppercase font-black tracking-widest mb-4 flex items-center gap-2", theme.textMuted)}><Beaker size={14}/> Phase Constitution</h3>
          {simState.phaseFractions.length > 0 && (
            <div className="space-y-4">
              <div className="flex h-8 w-full rounded-xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="bg-emerald-500 transition-all duration-500 ease-out flex items-center justify-center text-[10px] font-black text-white overflow-hidden whitespace-nowrap" style={{width: `${simState.phaseFractions[0].frac}%`}}>
                  {simState.phaseFractions[0].frac > 8 ? `${simState.phaseFractions[0].frac.toFixed(1)}%` : ''}
                </div>
                {simState.phaseFractions.length > 1 && (
                  <div className="bg-slate-400 dark:bg-slate-600 transition-all duration-500 ease-out flex items-center justify-center text-[10px] font-black text-white overflow-hidden whitespace-nowrap" style={{width: `${simState.phaseFractions[1].frac}%`}}>
                     {simState.phaseFractions[1].frac > 8 ? `${simState.phaseFractions[1].frac.toFixed(1)}%` : ''}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className={cn("flex justify-between items-center text-sm p-3 rounded-xl border", isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200')}>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
                    <span className="w-4 h-4 rounded-md bg-emerald-500 block shadow-sm"></span> {simState.phaseFractions[0].name}
                  </span>
                  <div className="text-right font-mono font-black">{simState.phaseFractions[0].frac.toFixed(2)}%</div>
                </div>
                {simState.phaseFractions.length > 1 && (
                  <div className={cn("flex justify-between items-center text-sm p-3 rounded-xl border", isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200')}>
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3">
                      <span className="w-4 h-4 rounded-md bg-slate-400 dark:bg-slate-600 block shadow-sm"></span> {simState.phaseFractions[1].name}
                    </span>
                  <div className="text-right font-mono font-black">{simState.phaseFractions[1].frac.toFixed(2)}%</div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        <div className="flex flex-col items-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
           <div className="flex justify-between items-center w-full mb-4">
             <h3 className={cn("text-[11px] uppercase font-black tracking-widest flex items-center gap-2", theme.textMuted)}>
               <Layers size={14}/> Morphology
             </h3>
             <select value={etchant} onChange={(e) => setEtchant(e.target.value)} className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-[9px] uppercase font-bold tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
               <option value="nital">Nital Etch</option>
               <option value="picral">Picral Etch</option>
               <option value="polished">Polished (No Etch)</option>
             </select>
           </div>

           <div className="relative flex justify-center w-full my-4">
              <MicrostructureDisplay onCapture={takeSnapshot}/>
           </div>
           
           <div className="mt-2 text-sm font-black text-center text-indigo-600 dark:text-indigo-400 leading-snug px-2">{simState.micro}</div>
           
           <div className="flex w-full justify-around mt-6 gap-2">
             <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-900/50 shadow-inner flex-1 border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                {simState.crystal === 'BCC' && parseNum(temp, 20) < CONSTANTS.FE_C.T_CURIE && (
                  <div className="absolute top-2 right-2 text-red-500 opacity-60 group-hover:opacity-100 transition-opacity" title="Ferromagnetic State"><Magnet size={14}/></div>
                )}
                <CrystalCell type={simState.crystal} a_param={simState.paramA} c_param={simState.paramC} isDark={isDark} />
                <div className="text-[9px] font-black uppercase tracking-widest mt-2 text-center text-slate-500">{simState.crystal} Lattice</div>
                <div className="text-[8px] font-mono text-slate-400 mt-0.5">a={simState.paramA.toFixed(3)}Å {simState.crystal==='BCT' && `c=${simState.paramC.toFixed(3)}Å`}</div>
             </div>
             <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-900/50 shadow-inner flex-1 border border-slate-100 dark:border-slate-800">
                <div className="text-2xl font-mono font-black text-slate-700 dark:text-slate-300">G{simState.grainSize.toFixed(1)}</div>
                <div className="text-[9px] font-black uppercase tracking-widest mt-1 text-center text-slate-500">ASTM Grain Size</div>
             </div>
           </div>
        </div>
        
        <div className="flex flex-col">
           <h3 className={cn("text-[11px] uppercase font-black tracking-widest mb-4 flex items-center gap-2", theme.textMuted)}>
             <Target size={14}/> Mechanics at Temp
           </h3>
           <div className="grid grid-cols-2 gap-3 mb-3">
              <PropertyGauge label="Yield" value={simState.yield} unit="MPa" max={2500} colorClass="bg-blue-500" />
              <PropertyGauge label="UTS" value={simState.uts} unit="MPa" max={3000} colorClass="bg-indigo-500" />
              <PropertyGauge label="Fatigue" value={simState.fatigue} unit="MPa" max={1500} colorClass="bg-rose-500" />
              <div className={cn("p-3 rounded-xl border transition-all hover:shadow-md", isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200')}>
                <div className="flex justify-between items-end mb-1.5">
                  <span className={cn("text-[10px] uppercase tracking-widest font-bold", isDark ? 'text-slate-400' : 'text-slate-500')}>Hardness</span>
                  <span className={cn("font-mono text-sm font-black text-right leading-tight", isDark ? 'text-slate-100' : 'text-slate-800')}>
                    {simState.hardness.hv} <span className="font-sans font-medium text-[9px] opacity-60">HV</span><br/>
                    {simState.hardness.hrc > 0 ? <>{simState.hardness.hrc} <span className="font-sans font-medium text-[9px] opacity-60">HRC</span></> : <>{simState.hardness.hb} <span className="font-sans font-medium text-[9px] opacity-60">HB</span></>}
                  </span>
                </div>
                <div className={cn("h-2 w-full rounded-full overflow-hidden shadow-inner mt-1", isDark ? 'bg-slate-900' : 'bg-slate-100')}>
                  <div className="h-full bg-purple-500 transition-all duration-500 ease-out" style={{ width: `${Math.min(100, (simState.hardness.hv / 1000) * 100)}%` }} />
                </div>
              </div>
           </div>
           <div className={cn("p-3 rounded-xl border flex justify-between items-center shadow-inner", isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200')}>
              <span className={cn("text-[10px] uppercase tracking-widest font-bold", theme.textMuted)}>Ductile-Brittle Trans. (DBTT)</span>
              <span className="font-mono text-sm font-black">{simState.dbtt}°C</span>
           </div>
        </div>

      </div>
    </section>
  );
};

const CreatorSection = () => {
  const { isDark, theme } = useThermoAction();
  return (
    <div className={cn("p-5 border-t flex flex-col gap-4 shrink-0 z-10", isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200')}>
      <div className="flex items-center gap-4">
        <div className={cn("p-3 rounded-full shadow-inner", isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600')}>
          <GraduationCap size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h4 className="text-base font-black tracking-tight flex items-center gap-2">Abdulrahman Saeed <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 font-bold uppercase">2026</span></h4>
          <p className={cn("text-[10px] uppercase font-bold tracking-widest mt-0.5", theme.textMuted)}>Creator & Lead Developer</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 mt-1">
        <div className={cn("flex items-center gap-3 text-[11px] font-semibold", isDark ? 'text-slate-300' : 'text-slate-600')}>
          <BookOpen size={14} className="text-indigo-500" /> <span>Metallurgical & Materials Engineering</span>
        </div>
        <div className={cn("flex items-center gap-3 text-[11px] font-semibold", isDark ? 'text-slate-300' : 'text-slate-600')}>
          <MapPin size={14} className="text-indigo-500" /> <span>AFIT, Kaduna</span>
        </div>
        <div className="flex gap-4 mt-2 border-t pt-3 dark:border-slate-800 border-slate-200">
          <a href="#" className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"><Github size={12}/> Repository</a>
          <a href="#" className="text-xs font-bold text-slate-500 hover:text-slate-600 flex items-center gap-1"><LinkIcon size={12}/> Citation / DOI</a>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APPLICATION COMPONENT (ENTRY POINT)
// ============================================================================

const MainLayout = () => {
  const { phaseFlash } = useThermoState();
  const { theme, snapshots } = useThermoAction();
  
  return (
    <div className={cn("min-h-screen font-sans transition-colors duration-500 flex flex-col selection:bg-indigo-500/30 overflow-hidden relative", theme.bg, theme.textMain)}>
      <div className={cn("absolute inset-0 z-40 pointer-events-none transition-all duration-300", phaseFlash ? 'bg-white/10 backdrop-blur-[2px] opacity-100' : 'opacity-0')} />
      
      <TopNav />

      <main className="flex-1 p-4 md:p-6 max-w-[1800px] w-full mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 overflow-y-auto xl:overflow-hidden relative">
        <div className="xl:col-span-8 flex flex-col gap-6 xl:overflow-y-auto custom-scrollbar xl:pr-2 xl:h-[calc(100vh-100px)] xl:pb-20">
          <ControlsSection />
          <InverseDesignSection />
          <DiagramSection />
          <KineticsDiagramSection />
          {snapshots.length > 0 && <SnapshotSection />}
        </div>

        <div className="xl:col-span-4 flex flex-col gap-6 xl:h-[calc(100vh-100px)]">
          <TelemetrySection />
          <CreatorSection />
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}} />
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