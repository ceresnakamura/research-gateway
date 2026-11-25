/** Anion / metalloid symbols used to identify anion lattice sites. */
export const ANION_SYMBOLS = new Set([
  'B', 'C', 'N', 'O', 'F', 'Si', 'P', 'S', 'Cl', 'Se', 'Br', 'Sb', 'Te', 'I', 'Sn', 'Ge', 'As', 'H',
]);

const SINGLE_TYPE = {
  O: 'oxide',
  C: 'carbide',
  N: 'nitride',
  B: 'boride',
  F: 'fluoride',
  Cl: 'chloride',
  I: 'iodide',
  S: 'sulfide',
  Se: 'selenide',
  Te: 'telluride',
  Si: 'silicide',
  Sb: 'antimonide',
  Sn: 'stannide',
  P: 'phosphide',
};

const COMBO_TYPE = {
  'C+N': 'carbonitride',
  'F+O': 'oxyfluoride',
  'O+Si': 'silicate',
  'C+O+Si': 'carbosilicate',
  'O+P': 'phosphate',
  'O+Sn': 'stannate',
  'P+S': 'thiophosphate',
};

const CHALCOGENS = new Set(['S', 'Se', 'Te']);
const OCCUPANCY_THRESHOLD = 0.05;

/**
 * Keep anion occupants at or above 5% occupancy. If none qualify, keep the largest.
 * @param {{ name: string, value: number }[]} anions
 */
function significantAnions(anions) {
  const kept = anions.filter(entry => entry.value >= OCCUPANCY_THRESHOLD);
  if (kept.length) return kept.map(entry => entry.name);
  if (!anions.length) return [];
  const largest = anions.reduce((best, entry) => (entry.value > best.value ? entry : best));
  return [largest.name];
}

/**
 * Collect anion symbols from one lattice site.
 * @param {Record<string, number>} occupancy
 * @returns {{ symbols: string[], pureAnionSite: boolean }}
 */
function anionsFromSite(occupancy) {
  const occupants = Object.entries(occupancy)
    .filter(([symbol]) => symbol !== 'X')
    .map(([name, value]) => ({ name, value: Number(value) }));
  if (!occupants.length) return { symbols: [], pureAnionSite: false };
  const anions = occupants.filter(entry => ANION_SYMBOLS.has(entry.name));
  const pureAnionSite = anions.length === occupants.length;
  return { symbols: significantAnions(anions), pureAnionSite };
}

/**
 * Map a sorted anion-element signature to a material-type label.
 * @param {string[]} symbols
 */
export function labelFromAnionSymbols(symbols) {
  const unique = [...new Set(symbols)].sort();
  if (!unique.length) return '';
  const key = unique.join('+');
  if (COMBO_TYPE[key]) return COMBO_TYPE[key];
  if (unique.length === 1 && SINGLE_TYPE[unique[0]]) return SINGLE_TYPE[unique[0]];
  if (unique.length >= 2 && unique.every(symbol => CHALCOGENS.has(symbol))) return 'chalcogenide';
  return '';
}

/**
 * Derive a high-entropy material type from a Sorted Json formula string.
 * @param {string} sortedJsonText
 * @returns {string}
 */
export function materialTypeFromSortedJson(sortedJsonText) {
  let composition;
  try { composition = JSON.parse(sortedJsonText); } catch { return ''; }
  if (!composition || typeof composition !== 'object' || Array.isArray(composition)) return '';

  const fromAnionSites = [];
  const fromMixedSites = [];
  for (const occupancy of Object.values(composition)) {
    if (!occupancy || typeof occupancy !== 'object' || Array.isArray(occupancy)) continue;
    const { symbols, pureAnionSite } = anionsFromSite(occupancy);
    if (pureAnionSite) fromAnionSites.push(...symbols);
    else fromMixedSites.push(...symbols);
  }

  return labelFromAnionSymbols(fromAnionSites.length ? fromAnionSites : fromMixedSites);
}
