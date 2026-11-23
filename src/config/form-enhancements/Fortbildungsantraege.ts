// Auto-generated. Per-entity form-enhancements config for "Fortbildungsanträge".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["titel", "antragsteller", "veranstalter", "ort", {"row": ["beginn", "ende"]}, "leitungskraft", "status", "gesamtkosten", "zielgruppe", "kategorie", "genehmigung_vorschlag", "weitere_leitungskraefte", {"row": ["fortbildungstage", "fortbildungsstunden"], "cols": "1fr 1fr"}, {"row": ["arbeitsbefreiung_tage", "arbeitsbefreiung_stunden"], "cols": "1fr 1fr"}, {"row": ["dienstbefreiung_tage", "dienstbefreiung_stunden"], "cols": "1fr 1fr"}, {"row": ["kursgebuehren", "kosten_unterkunft_verpflegung"], "cols": "1fr 1fr"}, "fahrtkosten", {"row": ["kostenuebernahme", "eigenanteil"], "cols": "1fr 1fr"}, {"row": ["restanspruch_tage", "beginn_zeitraum"], "cols": "1fr 1fr"}, "genehmigt_am", "mitteilung_antragsteller", {"row": ["tatsaechliche_kosten", "abrechnung_datum"], "cols": "1fr 1fr"}, {"row": ["zahlungsart", "zahlungsbetrag"], "cols": "1fr 1fr"}, {"row": ["zahlungseingang", "zahlungseingang_datum"], "cols": "1fr 1fr"}, "abschluss_datum", "ausschreibung_link", "bemerkung", "abrechnung_bemerkung"],
  defaults: {
    'beginn': { kind: 'today', withTime: true },
    'ende': { kind: 'todayOffset', days: 1, withTime: true },
    'status': { kind: 'lookup', key: 'antrag_gestellt', label: 'Antrag gestellt' },
  },
  computed: {
    'gesamtkosten': { op: 'add', left: { op: 'add', left: { kind: 'field', key: 'kursgebuehren' }, right: { kind: 'field', key: 'kosten_unterkunft_verpflegung' } }, right: { kind: 'field', key: 'fahrtkosten' } },
    'fortbildungstage': { kind: 'dateDiff', from: 'beginn', to: 'ende', unit: 'days' },
    'fortbildungsstunden': { kind: 'dateDiff', from: 'beginn', to: 'ende', unit: 'hours' },
    '_fortbildung_dauer_tage': { kind: 'dateDiff', from: 'beginn', to: 'ende', unit: 'days' },
    'eigenanteil': { op: 'sub', left: { kind: 'field', key: 'gesamtkosten' }, right: { kind: 'field', key: 'kostenuebernahme' } },
  },
  numberFields: {
    'restanspruch_tage': { allowNegative: true },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
