/**
 * US State Code to Full Name Mapping
 * Used for SEO schema generation
 */

export const STATE_MAPPING: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

/**
 * Get full state name from state code
 */
export function getStateName(stateCode: string | null | undefined): string {
  if (!stateCode) return 'Georgia'; // Default to GA
  const code = stateCode.toUpperCase();
  return STATE_MAPPING[code] || stateCode;
}

/**
 * Get state code from full name (reverse lookup)
 */
export function getStateCode(stateName: string | null | undefined): string {
  if (!stateName) return 'GA'; // Default to GA

  // If already a code, return it
  if (stateName.length === 2) {
    return stateName.toUpperCase();
  }

  // Find the code by matching the full name
  const entry = Object.entries(STATE_MAPPING).find(
    ([, name]) => name.toLowerCase() === stateName.toLowerCase()
  );

  return entry ? entry[0] : 'GA';
}

/**
 * Normalize state data - returns both code and full name
 */
export function normalizeState(state: string | null | undefined): {
  code: string;
  name: string;
} {
  if (!state) {
    return { code: 'GA', name: 'Georgia' };
  }

  // Determine if input is code or full name
  if (state.length === 2) {
    const code = state.toUpperCase();
    return {
      code,
      name: STATE_MAPPING[code] || state,
    };
  } else {
    const code = getStateCode(state);
    return {
      code,
      name: getStateName(code),
    };
  }
}
