import { ImageSourcePropType } from 'react-native';
import { env } from '@/config/env';

export interface BrandInfo {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  icon?: ImageSourcePropType;
  domain?: string;
}

// To add a real icon: place a PNG in assets/stations/ and add the require() to the brand entry.
// e.g.  icon: require('../../assets/stations/shell.png'),
const BRANDS: { pattern: RegExp; brand: BrandInfo }[] = [
  // ── Major US brands ──
  { pattern: /\bshell\b/i, brand: { key: 'shell', label: 'Shell', color: '#FFD500', bgColor: '#DD1D21', domain: 'shell.com' } },
  { pattern: /\bexxon\b/i, brand: { key: 'exxon', label: 'Exxon', color: '#FFFFFF', bgColor: '#2B57A4', domain: 'exxon.com' } },
  { pattern: /\bmobil\b/i, brand: { key: 'mobil', label: 'Mobil', color: '#FFFFFF', bgColor: '#E21836', domain: 'exxon.com' } },
  { pattern: /\bchevron\b/i, brand: { key: 'chevron', label: 'Chevron', color: '#FFFFFF', bgColor: '#0054A6', domain: 'chevron.com' } },
  { pattern: /\btexaco\b/i, brand: { key: 'texaco', label: 'Texaco', color: '#FFFFFF', bgColor: '#E21836', domain: 'texaco.com' } },
  { pattern: /\bbp\b/i, brand: { key: 'bp', label: 'BP', color: '#FFFFFF', bgColor: '#009B3A', domain: 'bp.com' } },
  { pattern: /\bamoco\b/i, brand: { key: 'amoco', label: 'Amoco', color: '#FFFFFF', bgColor: '#E21836', domain: 'amoco.com' } },
  { pattern: /\bmarathon\b/i, brand: { key: 'marathon', label: 'Marathon', color: '#FFFFFF', bgColor: '#D31245', domain: 'marathonpetroleum.com' } },
  { pattern: /\bphillips\s*66\b/i, brand: { key: 'phillips66', label: 'P66', color: '#FFFFFF', bgColor: '#E4002B', domain: 'phillips66.com' } },
  { pattern: /\bconoco\b/i, brand: { key: 'conoco', label: 'Conoco', color: '#FFFFFF', bgColor: '#E4002B', domain: 'conoco.com' } },
  { pattern: /\bsinclair\b/i, brand: { key: 'sinclair', label: 'Sinclair', color: '#FFFFFF', bgColor: '#006341', domain: 'sinclairoil.com' } },
  { pattern: /\bvalero\b/i, brand: { key: 'valero', label: 'Valero', color: '#FFFFFF', bgColor: '#003DA5', domain: 'valero.com' } },
  { pattern: /\bcitgo\b/i, brand: { key: 'citgo', label: 'CITGO', color: '#FFFFFF', bgColor: '#E4002B', domain: 'citgo.com' } },
  { pattern: /\bsunoco\b/i, brand: { key: 'sunoco', label: 'Sunoco', color: '#FFD100', bgColor: '#003DA5', domain: 'sunoco.com' } },
  { pattern: /\b76\b/, brand: { key: '76', label: '76', color: '#FF6600', bgColor: '#003DA5', domain: '76.com' } },
  { pattern: /\bgulf\b/i, brand: { key: 'gulf', label: 'Gulf', color: '#FFFFFF', bgColor: '#FF6600', domain: 'gulfoil.com' } },
  { pattern: /\barco\b/i, brand: { key: 'arco', label: 'ARCO', color: '#FFFFFF', bgColor: '#E4002B', domain: 'arco.com' } },

  // ── Truck stops ──
  { pattern: /\blove'?s\b/i, brand: { key: 'loves', label: "Love's", color: '#FFD100', bgColor: '#E4002B', domain: 'loves.com' } },
  { pattern: /\bpilot\b/i, brand: { key: 'pilot', label: 'Pilot', color: '#FFFFFF', bgColor: '#E4002B', domain: 'pilotflyingj.com' } },
  { pattern: /\bflying\s*j\b/i, brand: { key: 'flyingj', label: 'FlyJ', color: '#FFFFFF', bgColor: '#006341', domain: 'pilotflyingj.com' } },
  { pattern: /\bta\b|\btravelcenter/i, brand: { key: 'ta', label: 'TA', color: '#FFFFFF', bgColor: '#003DA5', domain: 'ta-petro.com' } },

  // ── Convenience / regional ──
  { pattern: /\bspeedway\b/i, brand: { key: 'speedway', label: 'Spdwy', color: '#FFFFFF', bgColor: '#E4002B', domain: 'speedway.com' } },
  { pattern: /\bcircle\s*k\b/i, brand: { key: 'circlek', label: 'CirK', color: '#FFFFFF', bgColor: '#E4002B', domain: 'circlek.com' } },
  { pattern: /\b7[- ]?eleven\b/i, brand: { key: '7eleven', label: '7-11', color: '#FFFFFF', bgColor: '#008061', domain: '7-eleven.com' } },
  { pattern: /\bquiktrip\b|\bqt\b/i, brand: { key: 'quiktrip', label: 'QT', color: '#FFFFFF', bgColor: '#E4002B', domain: 'quiktrip.com' } },
  { pattern: /\bracetrac\b/i, brand: { key: 'racetrac', label: 'RacTr', color: '#FFFFFF', bgColor: '#FFD100', domain: 'racetrac.com' } },
  { pattern: /\bwawa\b/i, brand: { key: 'wawa', label: 'Wawa', color: '#FFFFFF', bgColor: '#E4002B', domain: 'wawa.com' } },
  { pattern: /\bsheetz\b/i, brand: { key: 'sheetz', label: 'Sheetz', color: '#FFFFFF', bgColor: '#E4002B', domain: 'sheetz.com' } },
  { pattern: /\bcasey'?s\b/i, brand: { key: 'caseys', label: "Casey's", color: '#FFFFFF', bgColor: '#E4002B', domain: 'caseys.com' } },
  { pattern: /\bbuc-?ee'?s\b/i, brand: { key: 'bucees', label: "Buc's", color: '#000000', bgColor: '#FFD100', domain: 'buc-ees.com' } },
  { pattern: /\bmaverik\b/i, brand: { key: 'maverik', label: 'Mavk', color: '#FFFFFF', bgColor: '#E4002B', domain: 'maverik.com' } },
  { pattern: /\bkum\s*&?\s*go\b/i, brand: { key: 'kumgo', label: 'K&G', color: '#FFFFFF', bgColor: '#E4002B', domain: 'kumandgo.com' } },
  { pattern: /\bkwik\s*trip\b/i, brand: { key: 'kwiktrip', label: 'KwkT', color: '#FFFFFF', bgColor: '#E4002B', domain: 'kwiktrip.com' } },
  { pattern: /\bkwik\s*star\b/i, brand: { key: 'kwikstar', label: 'KwkS', color: '#FFFFFF', bgColor: '#E4002B', domain: 'kwikstar.com' } },
  { pattern: /\bholiday\b/i, brand: { key: 'holiday', label: 'Holdy', color: '#FFFFFF', bgColor: '#003DA5', domain: 'holidaystationstores.com' } },
  { pattern: /\bthorntons?\b/i, brand: { key: 'thorntons', label: 'Thrn', color: '#FFFFFF', bgColor: '#E4002B', domain: 'mythorntons.com' } },
  { pattern: /\bgetgo\b/i, brand: { key: 'getgo', label: 'GetGo', color: '#FFFFFF', bgColor: '#003DA5', domain: 'getgocafe.com' } },
  { pattern: /\brutter'?s\b/i, brand: { key: 'rutters', label: "Rut's", color: '#FFFFFF', bgColor: '#E4002B', domain: 'rutters.com' } },
  { pattern: /\broyal\s*farms\b/i, brand: { key: 'royalfarms', label: 'RoFa', color: '#FFFFFF', bgColor: '#E4002B', domain: 'royalfarms.com' } },
  { pattern: /\bcumberland\b/i, brand: { key: 'cumberland', label: 'Cumb', color: '#FFFFFF', bgColor: '#003DA5', domain: 'cumberlandfarms.com' } },
  { pattern: /\bstewart'?s\b/i, brand: { key: 'stewarts', label: "Stw's", color: '#FFFFFF', bgColor: '#003DA5', domain: 'stewartsshops.com' } },
  { pattern: /\birving\b/i, brand: { key: 'irving', label: 'Irving', color: '#FFFFFF', bgColor: '#003DA5', domain: 'irvingoil.com' } },
  { pattern: /\boncue\b/i, brand: { key: 'oncue', label: 'OnCue', color: '#FFFFFF', bgColor: '#E4002B', domain: 'oncuestore.com' } },
  { pattern: /\bgate\b/i, brand: { key: 'gate', label: 'Gate', color: '#FFFFFF', bgColor: '#003DA5', domain: 'gatepetro.com' } },
  { pattern: /\bmapco\b/i, brand: { key: 'mapco', label: 'Mapco', color: '#FFFFFF', bgColor: '#E4002B', domain: 'mapco.com' } },
  { pattern: /\bspinx\b/i, brand: { key: 'spinx', label: 'Spinx', color: '#FFFFFF', bgColor: '#E4002B', domain: 'spinx.com' } },
  { pattern: /\bstripes\b/i, brand: { key: 'stripes', label: 'Strps', color: '#FFFFFF', bgColor: '#E4002B', domain: 'stripesstores.com' } },

  // ── Grocery / warehouse ──
  { pattern: /\bh-?e-?b\b/i, brand: { key: 'heb', label: 'HEB', color: '#FFFFFF', bgColor: '#E4002B', domain: 'heb.com' } },
  { pattern: /\bmurphy\b/i, brand: { key: 'murphy', label: 'Mrphy', color: '#FFFFFF', bgColor: '#E4002B', domain: 'murphyusa.com' } },
  { pattern: /\bcostco\b/i, brand: { key: 'costco', label: 'Costco', color: '#FFFFFF', bgColor: '#E4002B', domain: 'costco.com' } },
  { pattern: /\bsam'?s\s*club\b/i, brand: { key: 'samsclub', label: "Sam's", color: '#FFFFFF', bgColor: '#003DA5', domain: 'samsclub.com' } },
  { pattern: /\bmeijer\b/i, brand: { key: 'meijer', label: 'Meijer', color: '#FFFFFF', bgColor: '#E4002B', domain: 'meijer.com' } },
  { pattern: /\bsafeway\b/i, brand: { key: 'safeway', label: 'Sfway', color: '#FFFFFF', bgColor: '#E4002B', domain: 'safeway.com' } },
  { pattern: /\bking\s*soopers?\b/i, brand: { key: 'kingsoopers', label: 'KngS', color: '#FFFFFF', bgColor: '#E4002B', domain: 'kingsoopers.com' } },
  { pattern: /\bhy-?vee\b/i, brand: { key: 'hyvee', label: 'HyVee', color: '#FFFFFF', bgColor: '#E4002B', domain: 'hy-vee.com' } },

  // ── Canada ──
  { pattern: /\bpetro[- ]?canada\b/i, brand: { key: 'petrocanada', label: 'PtrCn', color: '#FFFFFF', bgColor: '#E4002B', domain: 'petro-canada.ca' } },
  { pattern: /\besso\b/i, brand: { key: 'esso', label: 'Esso', color: '#FFFFFF', bgColor: '#2B57A4', domain: 'esso.ca' } },
  { pattern: /\bcanadian\s*tire\b/i, brand: { key: 'cantire', label: 'CanTr', color: '#FFFFFF', bgColor: '#E4002B', domain: 'canadiantire.ca' } },
  { pattern: /\bhusky\b/i, brand: { key: 'husky', label: 'Husky', color: '#FFFFFF', bgColor: '#FF6600', domain: 'huskyenergy.com' } },
  { pattern: /\bultramar\b/i, brand: { key: 'ultramar', label: 'Ultra', color: '#FFFFFF', bgColor: '#003DA5', domain: 'ultramar.ca' } },
  { pattern: /\bco-?op\b/i, brand: { key: 'coop', label: 'Co-op', color: '#FFFFFF', bgColor: '#003DA5', domain: 'coopconnection.ca' } },
  { pattern: /\bfas\s*gas\b/i, brand: { key: 'fasgas', label: 'FasG', color: '#FFFFFF', bgColor: '#E4002B', domain: 'fasgas.com' } },
  { pattern: /\bpioneer\b/i, brand: { key: 'pioneer', label: 'Pneer', color: '#FFFFFF', bgColor: '#003DA5', domain: 'pioneerenergy.ca' } },
  { pattern: /\bparkland\b/i, brand: { key: 'parkland', label: 'Prkld', color: '#FFFFFF', bgColor: '#003DA5', domain: 'parkland.ca' } },
  { pattern: /\bcentex\b/i, brand: { key: 'centex', label: 'Cntex', color: '#FFFFFF', bgColor: '#E4002B', domain: 'centex.ca' } },
  { pattern: /\btempo\b/i, brand: { key: 'tempo', label: 'Tempo', color: '#FFFFFF', bgColor: '#003DA5' } },
  { pattern: /\bsuper\s*save\b/i, brand: { key: 'supersave', label: 'SSave', color: '#FFFFFF', bgColor: '#E4002B', domain: 'supersavegas.com' } },
  { pattern: /\bdomo\b/i, brand: { key: 'domo', label: 'Domo', color: '#FFFFFF', bgColor: '#E4002B', domain: 'domogasbar.com' } },

  // ── Mexico ──
  { pattern: /\bpemex\b/i, brand: { key: 'pemex', label: 'Pemex', color: '#FFFFFF', bgColor: '#006341', domain: 'pemex.com' } },
  { pattern: /\boxxo\b/i, brand: { key: 'oxxo', label: 'Oxxo', color: '#FFFFFF', bgColor: '#E4002B', domain: 'oxxo.com' } },
  { pattern: /\btotalenergies\b|\btotal\b/i, brand: { key: 'total', label: 'Total', color: '#FFFFFF', bgColor: '#E4002B', domain: 'totalenergies.com' } },
  { pattern: /\bg500\b/i, brand: { key: 'g500', label: 'G500', color: '#FFFFFF', bgColor: '#FF6600', domain: 'g500.mx' } },
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

export function getBrandLogoUrl(brand: BrandInfo): string | null {
  if (!brand.domain || !env.LOGO_DEV_TOKEN) return null;
  return `https://img.logo.dev/${brand.domain}?token=${env.LOGO_DEV_TOKEN}&size=64&format=png`;
}
