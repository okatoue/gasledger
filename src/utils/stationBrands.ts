import { ImageSourcePropType } from 'react-native';

interface BrandInfo {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  icon?: ImageSourcePropType;
}

// To add a real icon: place a PNG in assets/stations/ and add the require() to the brand entry.
// e.g.  icon: require('../../assets/stations/shell.png'),
const BRANDS: { pattern: RegExp; brand: BrandInfo }[] = [
  // ── Major US brands ──
  { pattern: /\bshell\b/i, brand: { key: 'shell', label: 'Shell', color: '#FFD500', bgColor: '#DD1D21' } },
  { pattern: /\bexxon\b/i, brand: { key: 'exxon', label: 'Exxon', color: '#FFFFFF', bgColor: '#2B57A4' } },
  { pattern: /\bmobil\b/i, brand: { key: 'mobil', label: 'Mobil', color: '#FFFFFF', bgColor: '#E21836' } },
  { pattern: /\bchevron\b/i, brand: { key: 'chevron', label: 'Chevron', color: '#FFFFFF', bgColor: '#0054A6' } },
  { pattern: /\btexaco\b/i, brand: { key: 'texaco', label: 'Texaco', color: '#FFFFFF', bgColor: '#E21836' } },
  { pattern: /\bbp\b/i, brand: { key: 'bp', label: 'BP', color: '#FFFFFF', bgColor: '#009B3A' } },
  { pattern: /\bamoco\b/i, brand: { key: 'amoco', label: 'Amoco', color: '#FFFFFF', bgColor: '#E21836' } },
  { pattern: /\bmarathon\b/i, brand: { key: 'marathon', label: 'Marathon', color: '#FFFFFF', bgColor: '#D31245' } },
  { pattern: /\bphillips\s*66\b/i, brand: { key: 'phillips66', label: 'P66', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bconoco\b/i, brand: { key: 'conoco', label: 'Conoco', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bsinclair\b/i, brand: { key: 'sinclair', label: 'Sinclair', color: '#FFFFFF', bgColor: '#006341' } },
  { pattern: /\bvalero\b/i, brand: { key: 'valero', label: 'Valero', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bcitgo\b/i, brand: { key: 'citgo', label: 'CITGO', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bsunoco\b/i, brand: { key: 'sunoco', label: 'Sunoco', color: '#FFD100', bgColor: '#003DA5' } },
  { pattern: /\b76\b/, brand: { key: '76', label: '76', color: '#FF6600', bgColor: '#003DA5' } },
  { pattern: /\bgulf\b/i, brand: { key: 'gulf', label: 'Gulf', color: '#FFFFFF', bgColor: '#FF6600' } },
  { pattern: /\barco\b/i, brand: { key: 'arco', label: 'ARCO', color: '#FFFFFF', bgColor: '#E4002B' } },

  // ── Truck stops ──
  { pattern: /\blove'?s\b/i, brand: { key: 'loves', label: "Love's", color: '#FFD100', bgColor: '#E4002B' } },
  { pattern: /\bpilot\b/i, brand: { key: 'pilot', label: 'Pilot', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bflying\s*j\b/i, brand: { key: 'flyingj', label: 'FlyJ', color: '#FFFFFF', bgColor: '#006341' } },
  { pattern: /\bta\b|\btravelcenter/i, brand: { key: 'ta', label: 'TA', color: '#FFFFFF', bgColor: '#003DA5' } },

  // ── Convenience / regional ──
  { pattern: /\bspeedway\b/i, brand: { key: 'speedway', label: 'Spdwy', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bcircle\s*k\b/i, brand: { key: 'circlek', label: 'CirK', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\b7[- ]?eleven\b/i, brand: { key: '7eleven', label: '7-11', color: '#FFFFFF', bgColor: '#008061' } },
  { pattern: /\bquiktrip\b|\bqt\b/i, brand: { key: 'quiktrip', label: 'QT', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bracetrac\b/i, brand: { key: 'racetrac', label: 'RacTr', color: '#FFFFFF', bgColor: '#FFD100' } },
  { pattern: /\bwawa\b/i, brand: { key: 'wawa', label: 'Wawa', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bsheetz\b/i, brand: { key: 'sheetz', label: 'Sheetz', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bcasey'?s\b/i, brand: { key: 'caseys', label: "Casey's", color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bbuc-?ee'?s\b/i, brand: { key: 'bucees', label: "Buc's", color: '#000000', bgColor: '#FFD100' } },
  { pattern: /\bmaverik\b/i, brand: { key: 'maverik', label: 'Mavk', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bkum\s*&?\s*go\b/i, brand: { key: 'kumgo', label: 'K&G', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bkwik\s*trip\b/i, brand: { key: 'kwiktrip', label: 'KwkT', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bkwik\s*star\b/i, brand: { key: 'kwikstar', label: 'KwkS', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bholiday\b/i, brand: { key: 'holiday', label: 'Holdy', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bthorntons?\b/i, brand: { key: 'thorntons', label: 'Thrn', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bgetgo\b/i, brand: { key: 'getgo', label: 'GetGo', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\brutter'?s\b/i, brand: { key: 'rutters', label: "Rut's", color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\broyal\s*farms\b/i, brand: { key: 'royalfarms', label: 'RoFa', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bcumberland\b/i, brand: { key: 'cumberland', label: 'Cumb', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bstewart'?s\b/i, brand: { key: 'stewarts', label: "Stw's", color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\birving\b/i, brand: { key: 'irving', label: 'Irving', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\boncue\b/i, brand: { key: 'oncue', label: 'OnCue', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bgate\b/i, brand: { key: 'gate', label: 'Gate', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bmapco\b/i, brand: { key: 'mapco', label: 'Mapco', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bspinx\b/i, brand: { key: 'spinx', label: 'Spinx', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bstripes\b/i, brand: { key: 'stripes', label: 'Strps', color: '#FFFFFF', bgColor: '#E4002B' } },

  // ── Grocery / warehouse ──
  { pattern: /\bh-?e-?b\b/i, brand: { key: 'heb', label: 'HEB', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bmurphy\b/i, brand: { key: 'murphy', label: 'Mrphy', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bcostco\b/i, brand: { key: 'costco', label: 'Costco', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bsam'?s\s*club\b/i, brand: { key: 'samsclub', label: "Sam's", color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bmeijer\b/i, brand: { key: 'meijer', label: 'Meijer', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bsafeway\b/i, brand: { key: 'safeway', label: 'Sfway', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bking\s*soopers?\b/i, brand: { key: 'kingsoopers', label: 'KngS', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bhy-?vee\b/i, brand: { key: 'hyvee', label: 'HyVee', color: '#FFFFFF', bgColor: '#E4002B' } },

  // ── Canada ──
  { pattern: /\bpetro[- ]?canada\b/i, brand: { key: 'petrocanada', label: 'PtrCn', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\besso\b/i, brand: { key: 'esso', label: 'Esso', color: '#FFFFFF', bgColor: '#2B57A4' } },
  { pattern: /\bcanadian\s*tire\b/i, brand: { key: 'cantire', label: 'CanTr', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bhusky\b/i, brand: { key: 'husky', label: 'Husky', color: '#FFFFFF', bgColor: '#FF6600' } },
  { pattern: /\bultramar\b/i, brand: { key: 'ultramar', label: 'Ultra', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bco-?op\b/i, brand: { key: 'coop', label: 'Co-op', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bfas\s*gas\b/i, brand: { key: 'fasgas', label: 'FasG', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bpioneer\b/i, brand: { key: 'pioneer', label: 'Pneer', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bparkland\b/i, brand: { key: 'parkland', label: 'Prkld', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bcentex\b/i, brand: { key: 'centex', label: 'Cntex', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\btempo\b/i, brand: { key: 'tempo', label: 'Tempo', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bsuper\s*save\b/i, brand: { key: 'supersave', label: 'SSave', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bdomo\b/i, brand: { key: 'domo', label: 'Domo', color: '#FFFFFF', bgColor: '#E4002B' } },

  // ── Mexico ──
  { pattern: /\bpemex\b/i, brand: { key: 'pemex', label: 'Pemex', color: '#FFFFFF', bgColor: '#006341' } },
  { pattern: /\boxxo\b/i, brand: { key: 'oxxo', label: 'Oxxo', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\btotalenergies\b|\btotal\b/i, brand: { key: 'total', label: 'Total', color: '#FFFFFF', bgColor: '#E4002B' } },
  { pattern: /\bg500\b/i, brand: { key: 'g500', label: 'G500', color: '#FFFFFF', bgColor: '#FF6600' } },
];

const DEFAULT_BRAND: BrandInfo = {
  key: 'generic',
  label: '?',
  color: '#FFFFFF',
  bgColor: '#6B7280',
};

export function detectBrand(stationName: string): BrandInfo {
  for (const entry of BRANDS) {
    if (entry.pattern.test(stationName)) {
      return entry.brand;
    }
  }
  return { ...DEFAULT_BRAND, label: stationName.charAt(0).toUpperCase() };
}
