import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Target, Layers, Zap, Search, Sun, Moon, 
  BarChart2, GraduationCap, MapPin, BookOpen, Phone, MousePointerClick, 
  ClipboardCheck, Bookmark, Beaker, Wind, Flame, Activity, Download,
  Camera, Plus, Minus, Shield
} from 'lucide-react';

// ============================================================================
// THERMO-ENGINE: Research-Grade Analytical Physics Model
// ============================================================================

const ThermoEngine = {
  EPS: 1e-5,

  // --- ANALYTICAL PHASE BOUNDARY EQUATIONS c = f(T) ---
  c_alpha: (T) => {
    if (T > 912) return 0;
    if (T >= 727) return 0.022 * ((912 - T) / 185);
    return 0.022 * Math.pow(Math.max(0, T) / 727, 3);
  },
  c_a3: (T) => {
    if (T > 912 || T < 727) return 0.76;
    return 0.76 * Math.pow((912 - T) / 185, 1.2); 
  },
  c_acm: (T) => {
    if (T < 727) return 0.76;
    if (T > 1147) return 2.11;
    return 0.76 + (2.11 - 0.76) * Math.pow((T - 727) / 420, 1.4);
  },
  c_solidus: (T) => {
    if (T < 1147) return 2.11;
    if (T > 1495) return 0.17;
    return 0.17 + (2.11 - 0.17) * Math.pow((1495 - T) / 348, 0.85);
  },
  c_liquidus: (T) => {
    if (T < 1147) return 4.3;
    if (T > 1495) return 0.53;
    return 0.53 + (4.3 - 0.53) * Math.pow((1495 - T) / 348, 0.85);
  },
  c_l_fe3c: (T) => {
    if (T < 1147) return 4.3;
    return 4.3 + (6.67 - 4.3) * ((T - 1147) / 103);
  },
  c_delta_solidus: (T) => {
    if (T < 1394 || T > 1538) return 0;
    if (T >= 1495) return 0.09 * ((1538 - T) / 43);
    return 0.09 * ((T - 1394) / 101);
  },
  c_delta_liquidus: (T) => {
    if (T < 1495 || T > 1538) return 0;
    return 0.53 * ((1538 - T) / 43);
  },

  // --- TRUE THERMODYNAMIC STATE SOLVER ---
  getState: function(c, T, rate) {
    const safeC = Math.max(0, Math.min(6.67, c));
    const safeT = Math.max(0, T);
    
    let regionId = '';
    let phases = [];
    let fractions = [];

    const lever = (id, name1, name2, c1, c2) => {
      regionId = id;
      phases = [name1, name2];
      const span = c2 - c1;
      if (span < this.EPS) return [{ name: name1, frac: 100, pos: c1 }];
      let w2 = ((safeC - c1) / span) * 100;
      let w1 = 100 - w2;
      return [
        { name: name1, frac: Math.max(0, Math.min(100, w1)), pos: c1 },
        { name: name2, frac: Math.max(0, Math.min(100, w2)), pos: c2 }
      ];
    };

    const single = (id, name) => {
      regionId = id;
      phases = [name];
      return [{ name, frac: 100, pos: safeC }];
    };

    if (safeT >= 1394) {
      if (safeT >= 1538) { fractions = single('L', 'Liquid'); }
      else if (safeT >= 1495) {
        let cd_s = this.c_delta_solidus(safeT);
        let cd_l = this.c_delta_liquidus(safeT);
        if (safeC <= cd_s) fractions = single('delta', 'Delta Ferrite (δ)');
        else if (safeC > cd_s && safeC < cd_l) fractions = lever('delta_L', 'Delta Ferrite (δ)', 'Liquid', cd_s, cd_l);
        else fractions = single('L', 'Liquid');
      } 
      else {
        let cd_s = this.c_delta_solidus(safeT);
        let c_perit_gamma = 0.17 * ((safeT - 1394)/101);
        let c_sol = this.c_solidus(safeT);
        let c_liq = this.c_liquidus(safeT);
        
        if (safeC <= cd_s) fractions = single('delta', 'Delta Ferrite (δ)');
        else if (safeC > cd_s && safeC < c_perit_gamma) fractions = lever('delta_gamma', 'Delta Ferrite (δ)', 'Austenite (γ)', cd_s, c_perit_gamma);
        else if (safeC >= c_perit_gamma && safeC <= c_sol) fractions = single('gamma', 'Austenite (γ)');
        else if (safeC > c_sol && safeC < c_liq) fractions = lever('gamma_L', 'Austenite (γ)', 'Liquid', c_sol, c_liq);
        else if (safeC >= c_liq && safeC <= this.c_l_fe3c(safeT)) fractions = single('L', 'Liquid');
        else fractions = lever('L_Fe3C', 'Liquid', 'Cementite (Fe₃C)', this.c_l_fe3c(safeT), 6.67);
      }
    }
    else if (safeT > 1147) {
      let c_sol = this.c_solidus(safeT);
      let c_liq = this.c_liquidus(safeT);
      let c_lf = this.c_l_fe3c(safeT);
      
      if (safeC <= c_sol) fractions = single('gamma', 'Austenite (γ)');
      else if (safeC > c_sol && safeC < c_liq) fractions = lever('gamma_L', 'Austenite (γ)', 'Liquid', c_sol, c_liq);
      else if (safeC >= c_liq && safeC <= c_lf) fractions = single('L', 'Liquid');
      else fractions = lever('L_Fe3C', 'Liquid', 'Cementite (Fe₃C)', c_lf, 6.67);
    }
    else if (safeT > 727) {
      let c_a3_val = this.c_a3(safeT);
      let c_acm_val = this.c_acm(safeT);
      let c_al = this.c_alpha(safeT);
      
      if (safeC <= c_al) fractions = single('alpha', 'Ferrite (α)');
      else if (safeC > c_al && safeC <= c_a3_val) fractions = lever('alpha_gamma', 'Ferrite (α)', 'Austenite (γ)', c_al, c_a3_val);
      else if (safeC > c_a3_val && safeC <= c_acm_val) fractions = single('gamma', 'Austenite (γ)');
      else fractions = lever('gamma_Fe3C', 'Austenite (γ)', 'Cementite (Fe₃C)', c_acm_val, 6.67);
    }
    else {
      let c_al = this.c_alpha(safeT);
      if (safeC <= c_al) fractions = single('alpha', 'Ferrite (α)');
      else fractions = lever('alpha_Fe3C', 'Ferrite (α)', 'Cementite (Fe₃C)', c_al, 6.67);
    }

    const total = fractions.reduce((sum, f) => sum + f.frac, 0);
    if (Math.abs(total - 100) > this.EPS) {
      fractions.forEach(f => f.frac = (f.frac / total) * 100);
    }

    let isQuenched = false;
    let msTemp = 539 - 423 * safeC;
    // Quench logic
    if (rate >= 50 && safeC < 2.0 && safeT < msTemp) {
      isQuenched = true;
      let fm = 1 - Math.exp(-0.011 * (msTemp - safeT));
      fm = Math.max(0, Math.min(1, fm));
      
      regionId = 'martensite';
      fractions = [
        { name: 'Martensite (BCT)', frac: fm * 100, pos: safeC },
        { name: 'Retained Austenite', frac: (1 - fm) * 100, pos: safeC }
      ];
    }

    let regionLabel = 'Unknown Region';
    if (isQuenched) regionLabel = 'Martensitic (Quenched)';
    else if (regionId === 'L') regionLabel = 'Liquid Melt';
    else if (regionId === 'gamma') regionLabel = 'Austenite Field (γ)';
    else if (regionId === 'alpha') regionLabel = 'Ferrite Field (α)';
    else if (regionId === 'delta') regionLabel = 'Delta Ferrite (δ)';
    else if (regionId === 'gamma_L') regionLabel = 'Mushy Zone (L + γ)';
    else if (regionId === 'delta_L') regionLabel = 'Mushy Zone (L + δ)';
    else if (regionId === 'delta_gamma') regionLabel = 'Two-Phase (δ + γ)';
    else if (regionId === 'alpha_gamma') regionLabel = 'Intercritical (α + γ)';
    else if (regionId === 'gamma_Fe3C') regionLabel = safeC < 2.11 ? 'Austenite + Cementite' : 'Austenite + Ledeburite';
    else if (regionId === 'alpha_Fe3C') regionLabel = safeC < 0.76 ? 'Hypoeutectoid (α + P)' : Math.abs(safeC-0.76)<0.02 ? 'Eutectoid (Pearlite)' : safeC <= 2.11 ? 'Hypereutectoid (P + Fe₃C)' : 'Cast Iron (White)';
    else if (regionId === 'L_Fe3C') regionLabel = 'Liquid + Cementite';

    return { 
      regionId, regionLabel, fractions, isQuenched, 
      msTemp: safeC < 2.0 ? msTemp : null,
      ...this.predictProperties(safeC, safeT, fractions, isQuenched)
    };
  },

  predictProperties: function(c, T, fractions, isQuenched) {
    if (T > 1495) return { micro: 'Uniform Liquid', crystal: 'Amorphous', yield: 0, uts: 0, hardness: 0, elong: 100 };
    
    let crystal = 'Mixed';
    let yieldStr = 0; 
    let uts = 0;
    let hardness = 0; 
    let elong = 0;
    let micro = 'Mixed Phase';

    if (isQuenched) {
      micro = c < 0.6 ? 'Lath Martensite' : 'Plate Martensite';
      crystal = 'Body-Centered Tetragonal (BCT)';
      yieldStr = 1000 + 2000 * c;
      hardness = 300 + 500 * c;
      uts = yieldStr * 1.1 + hardness * 0.4;
      elong = Math.max(1, 15 - (c * 15));
    } 
    else if (T > 727) {
      crystal = 'FCC Dominant';
      micro = 'Austenitic / High Temp phases';
      yieldStr = 50; 
      hardness = 40;
      uts = 120;
      elong = 45;
    }
    else {
      let fAlpha = fractions.find(f => f.name.includes('Ferrite'))?.frac / 100 || 0;
      let fFe3C = fractions.find(f => f.name.includes('Cementite'))?.frac / 100 || 0;
      
      crystal = 'BCC + Orthorhombic';
      yieldStr = fAlpha * 150 + fFe3C * 1200;
      hardness = fAlpha * 80 + fFe3C * 800;
      uts = yieldStr * 1.35 + hardness * 0.5; // Empirical approx
      elong = Math.max(1, fAlpha * 40 + fFe3C * 2);

      if (c < 0.02) micro = 'Equiaxed Ferrite';
      else if (Math.abs(c - 0.76) < 0.02) micro = '100% Pearlite (Lamellar)';
      else if (c < 0.76) micro = 'Proeutectoid Ferrite + Pearlite';
      else if (c <= 2.11) micro = 'Proeutectoid Cementite Network + Pearlite';
      else if (Math.abs(c - 4.3) < 0.05) micro = 'Ledeburite (Eutectic)';
      else micro = 'Primary Cementite + Transformed Ledeburite';
    }

    return { 
      micro, crystal, 
      yield: Math.round(yieldStr), 
      uts: Math.round(uts),
      hardness: Math.round(hardness),
      elong: Math.round(elong)
    };
  }
};

// ============================================================================
// COMPONENTS
// ============================================================================

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

const generateCurvePath = (fn, tStart, tEnd, mapX, mapY, steps = 20) => {
  let path = '';
  const step = (tEnd - tStart) / steps;
  for (let i = 0; i <= steps; i++) {
    const t = tStart + i * step;
    const c = fn(t);
    const x = mapX(c);
    const y = mapY(t);
    path += i === 0 ? `${x},${y} ` : `L ${x},${y} `;
  }
  return path;
};

const CrystalCell = React.memo(({ type, isDark }) => {
  const stroke = isDark ? '#e2e8f0' : '#1e293b';
  const atom = type.includes('FCC') ? (isDark ? '#60a5fa' : '#2563eb') : 
               type.includes('BCT') ? (isDark ? '#c084fc' : '#9333ea') :
               (isDark ? '#f87171' : '#dc2626');
  
  return (
    <svg viewBox="-20 -20 140 140" className="w-14 h-14 drop-shadow-md">
      <g stroke={stroke} strokeWidth="2" fill="none">
        <polygon points="50,0 100,25 100,85 50,110 0,85 0,25" />
        <line x1="50" y1="0" x2="50" y2="55" />
        <line x1="0" y1="25" x2="50" y2="55" />
        <line x1="100" y1="25" x2="50" y2="55" />
      </g>
      <g fill={atom}>
        <circle cx="50" cy="0" r="5" /> <circle cx="100" cy="25" r="5" />
        <circle cx="100" cy="85" r="5" /> <circle cx="50" cy="110" r="5" />
        <circle cx="0" cy="85" r="5" /> <circle cx="0" cy="25" r="5" />
        <circle cx="50" cy="55" r="5" opacity="0.4" />
        {type.includes('BCC') && <circle cx="50" cy="55" r="7" fill="#fbbf24" stroke={stroke} strokeWidth="1"/>}
        {type.includes('BCT') && <ellipse cx="50" cy="55" rx="5" ry="9" fill="#fbbf24" stroke={stroke} strokeWidth="1"/>}
        {type.includes('FCC') && (
          <>
            <circle cx="25" cy="12.5" r="5" fill="#60a5fa" stroke={stroke} />
            <circle cx="75" cy="12.5" r="5" fill="#60a5fa" stroke={stroke} />
            <circle cx="25" cy="70" r="5" fill="#60a5fa" stroke={stroke} />
            <circle cx="75" cy="70" r="5" fill="#60a5fa" stroke={stroke} />
            <circle cx="50" cy="40" r="5" fill="#60a5fa" stroke={stroke} />
          </>
        )}
      </g>
    </svg>
  );
});

const MicrostructureDisplay = React.memo(({ state, c, t, isDark, rate, onCapture }) => {
  const [flash, setFlash] = useState(false);
  const ferrite = isDark ? '#cbd5e1' : '#ffffff';
  const austenite = isDark ? '#475569' : '#e2e8f0';
  const cementite = isDark ? '#020617' : '#1e293b';
  
  const pSpace = Math.max(1.5, 8 - (rate / 15));
  const oSeed = Math.floor(c * 1337) % 100;

  const triggerFlash = () => {
    setFlash(true);
    onCapture();
    setTimeout(() => setFlash(false), 300);
  };

  const patterns = (
    <defs>
      <pattern id="pearlite" width={pSpace} height={pSpace} patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
        <rect width={pSpace} height={pSpace} fill={ferrite} />
        <line x1="0" y1={pSpace/2} x2={pSpace} y2={pSpace/2} stroke={cementite} strokeWidth={pSpace * 0.4} />
      </pattern>
      <pattern id="ledeburite" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill={cementite} />
        <circle cx="4" cy="4" r="2.5" fill={t < 727 ? "url(#pearlite)" : austenite} />
        <circle cx="10" cy="10" r="2" fill={t < 727 ? "url(#pearlite)" : austenite} />
      </pattern>
      <pattern id="martensite" width="30" height="30" patternUnits="userSpaceOnUse">
        <rect width="30" height="30" fill={ferrite} />
        <path d="M-5,15 L35,15 M15,-5 L15,35 M0,0 L30,30 M30,0 L0,30" stroke={cementite} strokeWidth="1" opacity="0.6" />
        <path d="M5,10 L25,20 M10,5 L20,25" stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth="2" />
      </pattern>
      <filter id="warp">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed={oSeed} result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <clipPath id="microscopeClip">
        <circle cx="150" cy="150" r="145" />
      </clipPath>
    </defs>
  );

  const baseGrains = [
    "M-20,-20 L150,-20 L120,130 L-20,160 Z",
    "M150,-20 L320,-20 L320,120 L240,160 L120,130 Z",
    "M320,120 L320,320 L240,270 L240,160 Z",
    "M240,270 L320,320 L-20,320 L90,210 L180,240 Z",
    "M-20,160 L120,130 L240,160 L180,240 L90,210 L-20,180 Z"
  ];

  let renderContent = <rect width="300" height="300" fill={isDark ? '#0f172a' : '#f8fafc'} />;
  
  if (state.isQuenched) {
    renderContent = <rect width="300" height="300" fill="url(#martensite)" />;
  } else if (state.regionId === 'L' || t > 1495) {
    renderContent = <rect width="300" height="300" fill={isDark ? '#0284c7' : '#bae6fd'} />;
  } else if (state.regionId === 'gamma') {
    renderContent = baseGrains.map((d, i) => <path key={i} d={d} fill={austenite} stroke={isDark?'#334155':'#94a3b8'} strokeWidth="2" filter="url(#warp)"/>);
  } else if (state.regionId === 'alpha') {
    renderContent = baseGrains.map((d, i) => <path key={i} d={d} fill={ferrite} stroke={isDark?'#64748b':'#94a3b8'} strokeWidth="1" filter="url(#warp)"/>);
  } else if (t <= 727) {
    if (c < 0.76) {
      let fAlpha = (0.76 - c) / (0.76 - 0.022);
      let boundaryW = Math.max(1, fAlpha * 30);
      renderContent = baseGrains.map((d, i) => <path key={i} d={d} fill="url(#pearlite)" stroke={ferrite} strokeWidth={boundaryW} strokeLinejoin="round" filter="url(#warp)"/>);
    } else if (Math.abs(c - 0.76) < 0.02) {
      renderContent = baseGrains.map((d, i) => <path key={i} d={d} fill="url(#pearlite)" stroke={cementite} strokeWidth="1" filter="url(#warp)"/>);
    } else if (c <= 2.11) {
      let fFe3C = (c - 0.76) / (6.67 - 0.76);
      let boundaryW = Math.max(1, fFe3C * 20);
      renderContent = baseGrains.map((d, i) => <path key={i} d={d} fill="url(#pearlite)" stroke={cementite} strokeWidth={boundaryW} strokeLinejoin="round" filter="url(#warp)"/>);
    } else {
      renderContent = <rect width="300" height="300" fill="url(#ledeburite)" />;
    }
  } else {
    if (state.regionId === 'gamma_L') {
       renderContent = baseGrains.map((d, i) => <path key={i} d={d} fill={isDark?'#0284c7':'#bae6fd'} stroke={austenite} strokeWidth="20" strokeLinejoin="round" filter="url(#warp)"/>);
    } else if (state.regionId === 'alpha_gamma') {
       renderContent = baseGrains.map((d, i) => <path key={i} d={d} fill={austenite} stroke={ferrite} strokeWidth="10" strokeLinejoin="round" filter="url(#warp)"/>);
    } else if (state.regionId === 'gamma_Fe3C') {
       renderContent = baseGrains.map((d, i) => <path key={i} d={d} fill={austenite} stroke={cementite} strokeWidth="4" strokeLinejoin="round" filter="url(#warp)"/>);
    }
  }

  const heatGlow = t > 1100 ? 'shadow-[0_0_30px_rgba(239,68,68,0.5)] border-red-500/40' :
                   t > 727 ? 'shadow-[0_0_20px_rgba(249,115,22,0.3)] border-orange-500/40' :
                   isDark ? 'shadow-[0_0_15px_rgba(0,0,0,0.8)] border-slate-700' : 'shadow-[0_0_15px_rgba(0,0,0,0.3)] border-slate-300';

  return (
    <div className="flex flex-col items-center relative">
      <div className={`relative w-48 h-48 rounded-full overflow-hidden border-[8px] transition-all duration-500 ${heatGlow} ${isDark ? 'bg-slate-900' : 'bg-slate-100'} group`}>
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {patterns}
          <g clipPath="url(#microscopeClip)">
            {renderContent}
            <line x1="150" y1="0" x2="150" y2="300" stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"} strokeWidth="1" />
            <line x1="0" y1="150" x2="300" y2="150" stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"} strokeWidth="1" />
            <circle cx="150" cy="150" r="75" fill="none" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} strokeWidth="1" />
            
            <line x1="0" y1="0" x2="300" y2="0" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="3" opacity="0.8">
              <animate attributeName="y1" values="-20;320;-20" dur="3s" repeatCount="indefinite" />
              <animate attributeName="y2" values="-20;320;-20" dur="3s" repeatCount="indefinite" />
            </line>
          </g>
          <circle cx="150" cy="150" r="145" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="10" />
        </svg>

        {/* Camera Flash Overlay */}
        <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-300 ${flash ? 'opacity-100' : 'opacity-0'}`} />

        {/* Floating Capture Button */}
        <button 
          onClick={triggerFlash}
          className="absolute bottom-3 right-3 p-2 bg-indigo-600/90 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500 hover:scale-110 active:scale-95"
          title="Capture Micrograph"
        >
          <Camera size={14} />
        </button>

        {state.isQuenched && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-600/90 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded font-bold tracking-widest uppercase shadow-md pointer-events-none">
            Martensitic
          </div>
        )}
      </div>
      <div className={`text-[10px] font-mono tracking-widest mt-3 px-3 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
        500x Magnification
      </div>
    </div>
  );
});

// ============================================================================
// MAIN APPLICATION
// ============================================================================

const PRESETS = [
  { name: "Pure Iron", c: 0.00 },
  { name: "AISI 1020", c: 0.20 },
  { name: "AISI 1045", c: 0.45 },
  { name: "Eutectoid", c: 0.76 },
  { name: "AISI 1095", c: 0.95 },
  { name: "Cast Iron", c: 3.00 }
];

export default function App() {
  const [carbon, setCarbon] = useState(0.40);
  const [temp, setTemp] = useState(1600);
  const [isDark, setIsDark] = useState(false);
  const [mode, setMode] = useState('manual'); 
  const [coolingRate, setCoolingRate] = useState(0);
  const [zoomSteel, setZoomSteel] = useState(false);
  
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [captureMsg, setCaptureMsg] = useState(false);
  const [historyTrail, setHistoryTrail] = useState([]);

  const simState = useMemo(() => ThermoEngine.getState(carbon, temp, coolingRate), [carbon, temp, coolingRate]);

  // Weldability Logic
  const getWeldability = (c) => {
    if (c <= 0.25) return { rating: 'Excellent', desc: 'No pre-heat needed', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (c <= 0.50) return { rating: 'Fair', desc: 'Pre-heat required', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
    if (c <= 2.11) return { rating: 'Poor', desc: 'Special techniques', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' };
    return { rating: 'Unweldable', desc: 'Cast Iron territory', color: 'text-red-600', bg: 'bg-red-600/10 border-red-600/20' };
  };
  const weldStatus = getWeldability(carbon);

  const svgW = 850, svgH = 650;
  const margin = { top: 40, right: 60, bottom: 80, left: 70 };
  const innerW = svgW - margin.left - margin.right;
  const innerH = svgH - margin.top - margin.bottom;
  const maxC = zoomSteel ? 2.5 : 6.67;

  const mapX = c => margin.left + (Math.min(c, maxC) / maxC) * innerW;
  const mapY = t => margin.top + innerH - (t / 1600) * innerH;

  const getDiagramCoordsFromEvent = (e) => {
    if (!svgRef.current) return { c: carbon, t: temp };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const scaleX = svgW / rect.width;
    const scaleY = svgH / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    let c = ((x - margin.left) / innerW) * maxC;
    let t = 1600 - ((y - margin.top) / innerH) * 1600;

    return {
      c: Math.max(0, Math.min(maxC, c)),
      t: Math.max(0, Math.min(1600, t))
    };
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    setMode('manual');
    const { c, t } = getDiagramCoordsFromEvent(e);
    setCarbon(c);
    setTemp(t);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const { c, t } = getDiagramCoordsFromEvent(e);
    setCarbon(c);
    setTemp(t);
  };

  const handlePointerUp = () => setIsDragging(false);

  // Precision Micro-steppers
  const stepCarbon = (dir) => {
    setMode('manual');
    setCarbon(prev => Math.max(0, Math.min(zoomSteel ? 2.5 : 6.67, prev + dir * 0.01)));
  };
  const stepTemp = (dir) => {
    setMode('manual');
    setTemp(prev => Math.max(0, Math.min(1600, prev + dir * 5)));
  };

  const toggleZoom = () => {
    setZoomSteel(prev => {
      const nextZoom = !prev;
      if (nextZoom && carbon > 2.5) setCarbon(2.5); 
      return nextZoom;
    });
  };

  const copyReport = () => {
    const report = `
ABAJIS-SteelLab Analytical Report
-----------------------------
Carbon Content: ${carbon.toFixed(3)} wt%
Temperature: ${temp.toFixed(1)} °C
State: ${simState.isQuenched ? 'Quenched (Martensitic)' : 'Equilibrium'}

Phase Constitution:
${simState.fractions.map(f => `- ${f.name}: ${f.frac.toFixed(2)}% (C=${f.pos.toFixed(3)}%)`).join('\n')}

Predicted Properties:
- Microstructure: ${simState.micro}
- Lattice Structure: ${simState.crystal}
- Yield Strength: ${simState.yield} MPa
- Ultimate Tensile Strength: ${simState.uts} MPa
- Hardness: ${simState.hardness} HV
- Elongation: ${simState.elong}%
- Weldability: ${weldStatus.rating} (${weldStatus.desc})
`.trim();

    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadReport = () => {
    const report = `ABAJIS-SteelLab Analytical Report\n-----------------------------\nCarbon Content: ${carbon.toFixed(3)} wt%\nTemperature: ${temp.toFixed(1)} °C\nState: ${simState.isQuenched ? 'Quenched (Martensitic)' : 'Equilibrium'}\n\nPhase Constitution:\n${simState.fractions.map(f => `- ${f.name}: ${f.frac.toFixed(2)}% (C=${f.pos.toFixed(3)}%)`).join('\n')}\n\nPredicted Properties:\n- Microstructure: ${simState.micro}\n- Lattice Structure: ${simState.crystal}\n- Yield Strength: ${simState.yield} MPa\n- Ultimate Tensile Strength: ${simState.uts} MPa\n- Hardness: ${simState.hardness} HV\n- Elongation: ${simState.elong}%\n- Weldability: ${weldStatus.rating}`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ABAJIS_SteelLab_Report_${carbon.toFixed(2)}C_${temp.toFixed(0)}C.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCapture = () => {
    setCaptureMsg(true);
    setTimeout(() => setCaptureMsg(false), 3000);
  };

  useEffect(() => {
    let interval;
    if (mode === 'anneal' || mode === 'normalize' || mode === 'quench') {
      const rates = { 'anneal': 2, 'normalize': 10, 'quench': 150 };
      const dropRate = rates[mode];
      setCoolingRate(dropRate);
      
      interval = setInterval(() => {
        setTemp(t => {
          if (t <= 20) { setMode('manual'); setCoolingRate(0); return 20; }
          let currentDrop = dropRate;
          if ((mode === 'anneal' || mode === 'normalize') && ((t > 700 && t < 740) || (t > 1130 && t < 1160))) {
            currentDrop = Math.max(1, dropRate / 3); 
          }
          const nextT = t - currentDrop;
          setHistoryTrail(prev => [...prev.slice(-30), { c: carbon, t: nextT }]);
          return nextT;
        });
      }, 50);
    } else {
      setCoolingRate(0);
    }
    return () => clearInterval(interval);
  }, [mode, carbon]);

  useEffect(() => {
    if (mode === 'manual') setHistoryTrail([]);
  }, [mode]);

  const theme = {
    bg: isDark ? 'bg-slate-950' : 'bg-slate-50',
    panelBg: isDark ? 'bg-slate-900/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md',
    textMain: isDark ? 'text-slate-100' : 'text-slate-900',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    border: isDark ? 'border-slate-800' : 'border-slate-200',
    diagramBg: isDark ? '#020617' : '#ffffff',
    axisColor: isDark ? '#64748b' : '#334155',
    gridColor: isDark ? '#1e293b' : '#f1f5f9',
    polyStroke: isDark ? '#334155' : '#cbd5e1',
    highlightStroke: isDark ? '#38bdf8' : '#2563eb'
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.textMain} font-sans transition-colors duration-300 flex flex-col`}>
      
      {/* HEADER */}
      <nav className={`sticky top-0 z-50 px-6 py-4 border-b ${theme.border} ${theme.panelBg} shadow-sm flex flex-wrap justify-between items-center gap-4`}>
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl transition-all duration-300 ${isDark ? 'bg-indigo-900/40 shadow-[0_0_20px_rgba(79,70,229,0.2)]' : 'bg-indigo-50 shadow-sm'}`}>
            <CustomLogo isDark={isDark} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-rose-500 dark:from-indigo-400 dark:to-rose-400">
              ABAJIS-SteelLab Analytical Engine
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-mono tracking-widest ${theme.textMuted}`}>ABAJIS KERNEL v2.0 ELITE</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isDark ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                Full Telemetry Active
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={toggleZoom} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all shadow-sm ${zoomSteel ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700' : `${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}`}>
            <Search size={16}/> {zoomSteel ? 'Full Range' : 'Steel Focus'}
          </button>
          <button onClick={() => setIsDark(!isDark)} className={`p-2.5 rounded-lg border transition-all shadow-sm ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-yellow-400' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT AREA: Controls & Main SVG */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          <section className={`${isDark ? 'bg-slate-900' : 'bg-white'} border ${theme.border} rounded-2xl p-5 shadow-lg`}>
            {/* Presets Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <span className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 mr-2 ${theme.textMuted}`}>
                <Bookmark size={14} /> Presets:
              </span>
              {PRESETS.map((p) => (
                <button 
                  key={p.name}
                  onClick={() => { setCarbon(p.c); setMode('manual'); if (p.c > 2.5 && zoomSteel) setZoomSteel(false); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors border ${Math.abs(carbon - p.c) < 0.01 ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500/50 dark:text-indigo-300 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Main Controls & Advanced Heat Treatments */}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              
              {/* Carbon Control with Precision Steppers */}
              <div className="flex-1 w-full space-y-2">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold tracking-widest uppercase text-indigo-500">Carbon Content</label>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button onClick={() => stepCarbon(-1)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"><Minus size={14} /></button>
                    <input type="number" min="0" max="6.67" step="0.01" value={carbon.toFixed(2)} onChange={e => {setCarbon(Number(e.target.value)); if (Number(e.target.value) > 2.5 && zoomSteel) setZoomSteel(false);}} className={`w-16 text-center py-1 bg-transparent font-mono text-sm font-bold focus:outline-none transition-all ${theme.textMain}`} />
                    <button onClick={() => stepCarbon(1)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"><Plus size={14} /></button>
                  </div>
                </div>
                <input type="range" min="0" max={zoomSteel ? 2.5 : 6.67} step="0.01" value={carbon} onChange={e => setCarbon(parseFloat(e.target.value))} className="w-full accent-indigo-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer" />
              </div>

              {/* Temp Control with Precision Steppers */}
              <div className="flex-1 w-full space-y-2">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-bold tracking-widest uppercase text-rose-500">Temperature</label>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button onClick={() => stepTemp(-1)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"><Minus size={14} /></button>
                    <input type="number" min="0" max="1600" step="1" value={temp.toFixed(0)} onChange={e => setTemp(Number(e.target.value))} className={`w-16 text-center py-1 bg-transparent font-mono text-sm font-bold focus:outline-none transition-all ${theme.textMain}`} />
                    <button onClick={() => stepTemp(1)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"><Plus size={14} /></button>
                  </div>
                </div>
                <input type="range" min="0" max="1600" step="1" value={temp} onChange={e => {setTemp(parseFloat(e.target.value)); setMode('manual');}} className="w-full accent-rose-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer" />
              </div>

              {/* Heat Treatment Suite */}
              <div className="flex flex-col gap-2 w-full md:w-auto md:border-l md:pl-8 border-slate-200 dark:border-slate-800">
                <div className={`text-[9px] font-bold uppercase tracking-widest ${theme.textMuted} mb-1`}>Process Simulator</div>
                <div className="flex gap-2">
                  <button onClick={() => mode === 'anneal' ? setMode('manual') : setMode('anneal')} className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs tracking-wider uppercase transition-all shadow-sm hover:shadow ${mode === 'anneal' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`} title="Furnace Cool (Slow)">
                     <Flame size={14}/> Anneal
                  </button>
                  <button onClick={() => mode === 'normalize' ? setMode('manual') : setMode('normalize')} className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs tracking-wider uppercase transition-all shadow-sm hover:shadow ${mode === 'normalize' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`} title="Air Cool (Medium)">
                     <Wind size={14}/> Norm.
                  </button>
                  <button onClick={() => mode === 'quench' ? setMode('manual') : setMode('quench')} className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs tracking-wider uppercase transition-all shadow-sm hover:shadow ${mode === 'quench' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:hover:bg-purple-900/60'}`} title="Water/Oil Cool (Fast)">
                    <Zap size={14}/> Quench
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={`${isDark ? 'bg-slate-900' : 'bg-white'} border ${theme.border} rounded-2xl p-2 shadow-lg relative overflow-hidden group`}>
             <div className="absolute top-4 left-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-indigo-500 text-white px-3 py-1.5 rounded-md shadow-md text-xs font-bold z-10 backdrop-blur-md">
               <MousePointerClick size={14} /> Click & Drag to explore
             </div>

             <svg 
                ref={svgRef}
                width="100%" 
                viewBox={`0 0 ${svgW} ${svgH}`} 
                style={{ backgroundColor: theme.diagramBg }} 
                className={`w-full h-full font-sans select-none overflow-hidden block rounded-xl touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
             >
                {/* Background Grid */}
                <g stroke={theme.gridColor} strokeWidth="1">
                  {(zoomSteel ? [0.5, 1.0, 1.5, 2.0] : [1,2,3,4,5,6]).map(c => <line key={`vg${c}`} x1={mapX(c)} y1={margin.top} x2={mapX(c)} y2={svgH - margin.bottom} />)}
                  {[400,800,1200,1600].map(t => <line key={`hg${t}`} x1={margin.left} y1={mapY(t)} x2={svgW - margin.right} y2={mapY(t)} />)}
                </g>

                <g clipPath="url(#graphClip)">
                  <clipPath id="graphClip"><rect x={margin.left} y={margin.top} width={innerW} height={innerH} /></clipPath>
                  
                  {/* TEXTBOOK DIAGRAM SKELETON */}
                  <g className="phase-skeleton pointer-events-none" stroke={isDark ? '#94a3b8' : '#1e293b'} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d={`M ${mapX(0)},${mapY(1538)} L ${mapX(0.53)},${mapY(1495)}`} />
                    <path d={`M ${generateCurvePath(ThermoEngine.c_liquidus, 1495, 1147, mapX, mapY, 30)}`} />
                    <path d={`M ${generateCurvePath(ThermoEngine.c_l_fe3c, 1147, 1250, mapX, mapY, 20)}`} />
                    <path d={`M ${mapX(0)},${mapY(1538)} L ${mapX(0.09)},${mapY(1495)}`} />
                    <path d={`M ${generateCurvePath(ThermoEngine.c_solidus, 1495, 1147, mapX, mapY, 30)}`} />
                    <path d={`M ${generateCurvePath(ThermoEngine.c_a3, 912, 727, mapX, mapY, 30)}`} />
                    <path d={`M ${generateCurvePath(ThermoEngine.c_acm, 1147, 727, mapX, mapY, 30)}`} />
                    <path d={`M ${mapX(0)},${mapY(1394)} L ${mapX(0.09)},${mapY(1495)}`} />
                    <path d={`M ${mapX(0)},${mapY(1394)} L ${mapX(0.17)},${mapY(1495)}`} />
                    <path d={`M ${mapX(0)},${mapY(912)} L ${mapX(0.022)},${mapY(727)}`} />
                    <path d={`M ${generateCurvePath(ThermoEngine.c_alpha, 727, 0, mapX, mapY, 20)}`} />

                    {/* Invariant Lines */}
                    <line x1={mapX(0.09)} y1={mapY(1495)} x2={mapX(0.53)} y2={mapY(1495)} /> 
                    <line x1={mapX(2.11)} y1={mapY(1147)} x2={mapX(6.67)} y2={mapY(1147)} /> 
                    <line x1={mapX(0.022)} y1={mapY(727)} x2={mapX(6.67)} y2={mapY(727)} /> 
                    <line x1={mapX(0)} y1={mapY(0)} x2={mapX(0)} y2={mapY(1538)} />
                    {!zoomSteel && <line x1={mapX(6.67)} y1={mapY(0)} x2={mapX(6.67)} y2={mapY(1250)} />}
                  </g>

                  {/* CURIE TEMP */}
                  <g className="pointer-events-none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4">
                    <line x1={mapX(0)} y1={mapY(768)} x2={mapX(0.76)} y2={mapY(768)} />
                  </g>
                  <text x={mapX(0.38)} y={mapY(768) - 5} className={`text-[10px] font-bold pointer-events-none ${isDark ? 'fill-red-400' : 'fill-red-500'}`} textAnchor="middle">768°C (A₂)</text>

                  {/* GUIDELINES */}
                  <g className="pointer-events-none" stroke={theme.axisColor} strokeWidth="1" strokeDasharray="3,3" opacity="0.3">
                    <line x1={mapX(0.76)} y1={mapY(727)} x2={mapX(0.76)} y2={svgH - margin.bottom} />
                    <line x1={mapX(2.11)} y1={mapY(1147)} x2={mapX(2.11)} y2={svgH - margin.bottom} />
                    <line x1={mapX(0.022)} y1={mapY(727)} x2={mapX(0.022)} y2={svgH - margin.bottom} />
                    {!zoomSteel && <line x1={mapX(4.3)} y1={mapY(1147)} x2={mapX(4.3)} y2={svgH - margin.bottom} />}
                  </g>

                  {/* LABELS */}
                  <g className={`text-[11px] font-bold ${isDark ? 'fill-slate-300' : 'fill-slate-600'} pointer-events-none`} textAnchor="middle">
                    <text x={mapX(1.0)} y={mapY(1000)}>austenite (γ)</text>
                    <text x={mapX(0.01)} y={mapY(500)} textAnchor="start" fontSize="10">α</text>
                    <text x={mapX(0.25)} y={mapY(800)}>α + γ</text>
                    <text x={mapX(0.03)} y={mapY(1460)} fontSize="9">δ</text>
                    <text x={mapX(0.20)} y={mapY(1515)} fontSize="9">L + δ</text>
                    <text x={mapX(0.08)} y={mapY(1440)} fontSize="9">γ + δ</text>
                    <text x={mapX(0.4)} y={mapY(400)}>α + pearlite</text>
                    <text x={mapX(1.4)} y={mapY(400)}>pearlite + Fe₃C</text>
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

                  <g className={`text-[10px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-500'} pointer-events-none`} textAnchor="middle">
                    <text x={mapX(0.45)} y={mapY(800) + 12} transform={`rotate(-40 ${mapX(0.45)} ${mapY(800) + 12})`} fill="#f97316">A₃</text>
                    <text x={mapX(1.6)} y={mapY(980) - 8} transform={`rotate(38 ${mapX(1.6)} ${mapY(980) - 8})`} fill="#a855f7">Acm</text>
                    <text x={mapX(1.0)} y={mapY(727) + 12}>A₁ (727°C)</text>
                    {!zoomSteel && <text x={mapX(4.3)} y={mapY(1147) - 6}>Eutectic (1147°C)</text>}
                  </g>

                  {/* ACTIVE STATE OVERLAYS */}
                  <g className="pointer-events-none">
                    
                    {/* Thermal History Trail */}
                    {historyTrail.length > 1 && (
                      <polyline
                        points={historyTrail.map(p => `${mapX(p.c)},${mapY(p.t)}`).join(' ')}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeOpacity="0.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Tie Line for phases */}
                    {simState.fractions.length > 1 && (
                      <line 
                        x1={mapX(simState.fractions[0].pos)} y1={mapY(temp)} 
                        x2={mapX(simState.fractions[1].pos)} y2={mapY(temp)} 
                        stroke="#10b981" strokeWidth="4" strokeOpacity="0.9" strokeLinecap="round"
                      />
                    )}
                    
                    {/* FULL-SPAN PRECISION CROSSHAIRS */}
                    <line x1={mapX(carbon)} y1={margin.top} x2={mapX(carbon)} y2={svgH - margin.bottom} stroke={isDark?'#fff':'#000'} strokeWidth="1" strokeDasharray="4,4" opacity={isDragging ? 0.3 : 0.15} />
                    <line x1={margin.left} y1={mapY(temp)} x2={svgW - margin.right} y2={mapY(temp)} stroke={isDark?'#fff':'#000'} strokeWidth="1" strokeDasharray="4,4" opacity={isDragging ? 0.3 : 0.15} />
                    
                    {/* Active Tracker Target */}
                    <circle cx={mapX(carbon)} cy={mapY(temp)} r={isDragging ? "8" : "6"} fill="#ef4444" stroke={theme.diagramBg} strokeWidth="2.5" className={`shadow-lg transition-all duration-150 ${isDragging ? 'scale-125' : ''}`} />
                    
                    {/* Live Cursor Telemetry (HUD) */}
                    <g transform={`translate(${mapX(carbon) + 12}, ${mapY(temp) - 16})`}>
                       <rect x="0" y="-34" width="160" height="42" rx="6" fill={isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'} stroke={isDark ? 'rgba(51,65,85,0.5)' : 'rgba(203,213,225,0.5)'} strokeWidth="1" className="backdrop-blur-sm drop-shadow-lg" />
                       <text x="80" y="-18" textAnchor="middle" className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'fill-slate-300' : 'fill-slate-600'}`}>
                         {simState.regionLabel}
                       </text>
                       <text x="80" y="-6" textAnchor="middle" className={`text-[10px] font-mono font-black ${isDark ? 'fill-indigo-400' : 'fill-indigo-600'}`}>
                         {carbon.toFixed(2)}% C | {temp.toFixed(0)}°C
                       </text>
                    </g>
                  </g>
                </g>

                {/* AXES BASE */}
                <path className="pointer-events-none" d={`M ${margin.left} ${margin.top} L ${margin.left} ${svgH - margin.bottom} L ${svgW - margin.right} ${svgH - margin.bottom}`} fill="none" stroke={theme.axisColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

                {/* AXIS LABELS AND TICKS */}
                <g className={`text-[11px] font-mono font-semibold ${theme.textMain} pointer-events-none`} textAnchor="middle">
                  {(zoomSteel ? [0.5, 1.0, 1.5, 2.0, 2.5] : [1, 2, 3, 4, 5, 6]).map(c => (
                    <g key={`tx${c}`} transform={`translate(${mapX(c)}, ${svgH - margin.bottom})`}>
                      <line y2="5" stroke={theme.axisColor} strokeWidth="1.5" />
                      <text y="16" fontSize="9" className="opacity-70">{c}</text>
                    </g>
                  ))}
                  
                  {(zoomSteel ? [0.022, 0.76, 2.11] : [0.022, 0.76, 2.11, 4.3, 6.67]).map(c => (
                    <g key={`ctx${c}`} transform={`translate(${mapX(c)}, ${svgH - margin.bottom})`}>
                      <line y2="8" stroke={theme.highlightStroke} strokeWidth="2" />
                      <text y="22" textAnchor={c === 0.022 ? "start" : "middle"} dx={c === 0.022 ? 2 : 0} className="fill-indigo-600 dark:fill-indigo-400 font-bold text-[9px]">{c}</text>
                    </g>
                  ))}

                  <g stroke={theme.axisColor} strokeWidth="1.5" opacity="0.7">
                    <line x1={mapX(0)} y1={svgH - margin.bottom + 35} x2={mapX(2.11)} y2={svgH - margin.bottom + 35} />
                    <line x1={mapX(0)} y1={svgH - margin.bottom + 30} x2={mapX(0)} y2={svgH - margin.bottom + 40} />
                    <line x1={mapX(2.11)} y1={svgH - margin.bottom + 30} x2={mapX(2.11)} y2={svgH - margin.bottom + 40} />
                    <text x={mapX(1.055)} y={svgH - margin.bottom + 47} className="text-[10px] font-sans font-bold fill-slate-500 dark:fill-slate-400" stroke="none">STEEL</text>
                    {!zoomSteel && (
                      <>
                        <line x1={mapX(2.11)} y1={svgH - margin.bottom + 35} x2={mapX(6.67)} y2={svgH - margin.bottom + 35} />
                        <line x1={mapX(6.67)} y1={svgH - margin.bottom + 30} x2={mapX(6.67)} y2={svgH - margin.bottom + 40} />
                        <text x={mapX(4.39)} y={svgH - margin.bottom + 47} className="text-[10px] font-sans font-bold fill-slate-500 dark:fill-slate-400" stroke="none">CAST IRON</text>
                      </>
                    )}
                  </g>

                  <text x={margin.left + innerW/2} y={svgH - 5} className="font-sans font-bold text-xs uppercase tracking-widest text-indigo-500">Weight Percent Carbon</text>
                  
                  {[0, 200, 400, 600, 800, 1000, 1200, 1400, 1600].map(t => (
                    <g key={`ty${t}`} transform={`translate(${margin.left}, ${mapY(t)})`}>
                      <line x2="-4" stroke={theme.axisColor} strokeWidth="1.5" />
                      <text x="-8" y="3" textAnchor="end" fontSize="9" className="opacity-70">{t}</text>
                    </g>
                  ))}

                  {[727, 912, 1147, 1394, 1495, 1538].map(t => (
                    <g key={`cty${t}`} transform={`translate(${margin.left}, ${mapY(t)})`}>
                      <line x2="-8" stroke={theme.highlightStroke} strokeWidth="2" />
                      <text x="-12" y="4" textAnchor="end" className="fill-indigo-600 dark:fill-indigo-400 font-bold text-[9px]">{t}</text>
                    </g>
                  ))}

                  <text transform={`rotate(-90) translate(${-margin.top - innerH/2}, ${margin.left - 45})`} className="font-sans font-bold text-xs uppercase tracking-widest text-rose-500">Temperature (°C)</text>
                </g>
             </svg>
          </section>
        </div>

        {/* RIGHT AREA: Advanced Analytics Panel & Creator Info */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <section className={`${isDark ? 'bg-slate-900' : 'bg-white'} border ${theme.border} rounded-2xl shadow-lg flex flex-col h-full overflow-hidden`}>
            
            <div className={`px-6 py-4 border-b ${theme.border} flex items-center justify-between ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <Activity className="text-indigo-500" size={20} />
                <h2 className="font-extrabold text-sm tracking-widest uppercase">Live Analytics</h2>
              </div>
              <div className="flex items-center gap-2">
                {mode !== 'manual' && <span className="text-[10px] font-bold text-amber-500 animate-[pulse_1s_ease-in-out_infinite] uppercase px-2 py-1 border border-amber-500/30 rounded-md bg-amber-500/10">Simulating</span>}
                <div className={`flex rounded-md border overflow-hidden shadow-sm ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <button 
                    onClick={copyReport} 
                    className={`p-1.5 transition-colors ${copied ? 'bg-emerald-500 text-white' : `hover:bg-slate-200 dark:hover:bg-slate-700 ${isDark ? 'bg-slate-800' : 'bg-white'} ${theme.textMuted}`}`}
                    title="Copy Report"
                  >
                    <ClipboardCheck size={16} />
                  </button>
                  <div className={`w-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                  <button 
                    onClick={downloadReport} 
                    className={`p-1.5 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 ${isDark ? 'bg-slate-800' : 'bg-white'} ${theme.textMuted}`}
                    title="Download Text Report"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto">
              
              {/* Dynamic Weldability / Status Banner */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${weldStatus.bg}`}>
                 <div className="flex items-center gap-2">
                    <Shield className={weldStatus.color} size={16} />
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${weldStatus.color}`}>Weldability Index</span>
                 </div>
                 <div className="text-right">
                    <div className={`text-sm font-black ${weldStatus.color}`}>{weldStatus.rating}</div>
                 </div>
              </div>

              <div>
                <h3 className={`text-[10px] uppercase font-bold tracking-widest ${theme.textMuted} mb-4 flex items-center gap-2`}>
                  <Beaker size={14}/> True Phase Constitution
                </h3>
                
                {simState.fractions.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex h-6 w-full rounded-md overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-800">
                      <div className="bg-emerald-500 transition-all duration-300 ease-out flex items-center justify-center text-[10px] font-bold text-white overflow-hidden whitespace-nowrap" style={{width: `${simState.fractions[0].frac}%`}}>
                        {simState.fractions[0].frac > 8 ? `${simState.fractions[0].frac.toFixed(1)}%` : ''}
                      </div>
                      {simState.fractions.length > 1 && (
                        <div className="bg-slate-400 dark:bg-slate-600 transition-all duration-300 ease-out flex items-center justify-center text-[10px] font-bold text-white overflow-hidden whitespace-nowrap" style={{width: `${simState.fractions[1].frac}%`}}>
                           {simState.fractions[1].frac > 8 ? `${simState.fractions[1].frac.toFixed(1)}%` : ''}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 pt-1">
                      <div className={`flex justify-between items-center text-sm p-2 rounded-md ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm bg-emerald-500 block shadow-sm"></span>
                          {simState.fractions[0].name}
                        </span>
                        <div className="text-right">
                          <div className="font-mono font-bold">{simState.fractions[0].frac.toFixed(2)}%</div>
                          {simState.fractions.length > 1 && <div className="text-[10px] font-mono text-slate-500 mt-0.5">C = {simState.fractions[0].pos.toFixed(4)}</div>}
                        </div>
                      </div>
                      {simState.fractions.length > 1 && (
                        <div className={`flex justify-between items-center text-sm p-2 rounded-md ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-slate-400 dark:bg-slate-600 block shadow-sm"></span>
                            {simState.fractions[1].name}
                          </span>
                          <div className="text-right">
                            <div className="font-mono font-bold">{simState.fractions[1].frac.toFixed(2)}%</div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">C = {simState.fractions[1].pos.toFixed(4)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {simState.msTemp !== null && (
                <div className={`p-4 rounded-xl border ${simState.isQuenched ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold text-[10px] uppercase tracking-wider ${simState.isQuenched ? 'text-purple-600 dark:text-purple-400' : theme.textMuted}`}>Koistinen-Marburger</span>
                    <span className={`font-mono font-bold ${simState.isQuenched ? 'text-purple-700 dark:text-purple-300' : ''}`}>Ms = {simState.msTemp.toFixed(1)}°C</span>
                  </div>
                  {simState.isQuenched && (
                    <div className="font-mono text-[10px] text-purple-700 dark:text-purple-400 mt-3 border-t border-purple-200 dark:border-purple-800/50 pt-2">
                      fm = 1 - exp(-0.011 * ({simState.msTemp.toFixed(0)} - {temp.toFixed(0)}))
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center">
                   <h3 className={`text-[10px] uppercase font-bold tracking-widest ${theme.textMuted} mb-3 flex items-center gap-2 w-full`}>
                     <Layers size={14}/> Morphology
                   </h3>
                   {/* Microstructure w/ Snapshot functionality */}
                   <div className="relative">
                      <MicrostructureDisplay state={simState} c={carbon} t={temp} isDark={isDark} rate={coolingRate} onCapture={handleCapture}/>
                      
                      {captureMsg && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-xl animate-[pulse_0.5s_ease-out]">
                          Image Captured
                        </div>
                      )}
                   </div>
                   <div className="mt-4 text-sm font-extrabold text-center text-indigo-600 dark:text-indigo-400 leading-tight px-2">
                      {simState.micro}
                   </div>
                </div>
                
                <div className="flex flex-col justify-between">
                   <div>
                     <h3 className={`text-[10px] uppercase font-bold tracking-widest ${theme.textMuted} mb-3 flex items-center gap-2`}>
                       <Target size={14}/> Mechanical Props
                     </h3>
                     
                     {/* Visual Property Gauges */}
                     <div className="space-y-2">
                       <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                         <div className="flex justify-between items-end mb-1">
                           <span className={`text-[9px] uppercase tracking-widest font-bold ${theme.textMuted}`}>Yield</span>
                           <span className="font-mono text-xs font-black">{simState.yield} <span className="font-sans font-medium text-slate-400">MPa</span></span>
                         </div>
                         <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (simState.yield / 2500) * 100)}%` }}></div>
                         </div>
                       </div>
                       
                       <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                         <div className="flex justify-between items-end mb-1">
                           <span className={`text-[9px] uppercase tracking-widest font-bold ${theme.textMuted}`}>UTS</span>
                           <span className="font-mono text-xs font-black">{simState.uts} <span className="font-sans font-medium text-slate-400">MPa</span></span>
                         </div>
                         <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${Math.min(100, (simState.uts / 3000) * 100)}%` }}></div>
                         </div>
                       </div>

                       <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                         <div className="flex justify-between items-end mb-1">
                           <span className={`text-[9px] uppercase tracking-widest font-bold ${theme.textMuted}`}>Hardness</span>
                           <span className="font-mono text-xs font-black">{simState.hardness} <span className="font-sans font-medium text-slate-400">HV</span></span>
                         </div>
                         <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${Math.min(100, (simState.hardness / 1000) * 100)}%` }}></div>
                         </div>
                       </div>

                       <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                         <div className="flex justify-between items-end mb-1">
                           <span className={`text-[9px] uppercase tracking-widest font-bold ${theme.textMuted}`}>Elongation</span>
                           <span className="font-mono text-xs font-black">{simState.elong} <span className="font-sans font-medium text-slate-400">%</span></span>
                         </div>
                         <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.min(100, (simState.elong / 50) * 100)}%` }}></div>
                         </div>
                       </div>
                     </div>
                   </div>
                   <div className="flex flex-col items-center justify-center mt-6">
                      <CrystalCell type={simState.crystal} isDark={isDark} />
                      <div className="text-[10px] font-bold uppercase tracking-widest mt-2 text-center text-slate-500">{simState.crystal} Lattice</div>
                   </div>
                </div>
              </div>

              {/* CREATOR INFO CARD */}
              <div className={`mt-auto pt-6 border-t ${theme.border}`}>
                <div className={`p-5 rounded-xl border flex flex-col gap-3 shadow-sm transition-colors ${isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-100'}`}>
                  
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full shadow-inner ${isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold tracking-tight">Abdulrahman Saeed</h4>
                      <p className={`text-[10px] uppercase font-bold tracking-widest ${theme.textMuted} mt-0.5`}>Creator & Lead Developer</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2.5 mt-2">
                    <div className={`flex items-center gap-3 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <BookOpen size={14} className="text-indigo-400" />
                      <span>Metallurgical & Materials Engineering</span>
                    </div>
                    <div className={`flex items-center gap-3 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <MapPin size={14} className="text-indigo-400" />
                      <span>Air Force Institute of Technology (AFIT), Kaduna</span>
                    </div>
                    <div className={`flex items-center gap-3 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <Phone size={14} className="text-indigo-400" />
                      <span className="font-mono tracking-wide">+234 913 402 8050</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </section>
        </div>
      </main>
    </div>
  );
}