// Auto-generated. Per-entity form-enhancements config for "Rückmeldungen der Leitungskräfte".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["antrag", {"row": ["leitungskraft", "datum"], "cols": "2fr 1fr"}, "entscheidung", "kommentar"],
  defaults: {
    'datum': { kind: 'today' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
