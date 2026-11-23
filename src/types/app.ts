import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Standorte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
  };
}

export interface Personen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    rolle?: LookupValue;
    abteilung?: string;
    standort?: RecordUrl; // applookup -> URL zu 'Standorte' Record
  };
}

export interface Fortbildungsantraege {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    antragsteller?: RecordUrl; // applookup -> URL zu 'Personen' Record
    titel?: string;
    veranstalter?: string;
    ort?: string;
    zielgruppe?: string;
    beginn?: string; // Format: YYYY-MM-DD oder ISO String
    ende?: string; // Format: YYYY-MM-DD oder ISO String
    arbeitsbefreiung_tage?: number;
    arbeitsbefreiung_stunden?: number;
    kosten_unterkunft_verpflegung?: number;
    kursgebuehren?: number;
    fahrtkosten?: number;
    gesamtkosten?: number;
    ausschreibung?: string;
    ausschreibung_link?: string;
    leitungskraft?: RecordUrl; // applookup -> URL zu 'Personen' Record
    weitere_leitungskraefte?: RecordUrl[];
    status?: LookupValue;
    genehmigung_vorschlag?: LookupValue;
    kategorie?: LookupValue;
    fortbildungstage?: number;
    fortbildungsstunden?: number;
    dienstbefreiung_tage?: number;
    dienstbefreiung_stunden?: number;
    kostenuebernahme?: number;
    eigenanteil?: number;
    restanspruch_tage?: number;
    beginn_zeitraum?: string; // Format: YYYY-MM-DD oder ISO String
    bemerkung?: string;
    genehmigt_am?: string; // Format: YYYY-MM-DD oder ISO String
    mitteilung_antragsteller?: boolean;
    tatsaechliche_kosten?: number;
    abrechnung_datum?: string; // Format: YYYY-MM-DD oder ISO String
    abrechnung_bemerkung?: string;
    zahlungsart?: LookupValue;
    zahlungsbetrag?: number;
    zahlungseingang?: boolean;
    zahlungseingang_datum?: string; // Format: YYYY-MM-DD oder ISO String
    abschluss_datum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface RueckmeldungenDerLeitungskraefte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    antrag?: RecordUrl; // applookup -> URL zu 'Fortbildungsantraege' Record
    leitungskraft?: RecordUrl; // applookup -> URL zu 'Personen' Record
    entscheidung?: LookupValue;
    kommentar?: string;
    datum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  STANDORTE: '6b043a989170fbb45cc768c5',
  PERSONEN: '6b043a9deed16d3125fbe8d9',
  FORTBILDUNGSANTRAEGE: '6b043a9d28c5fd1c6f783c12',
  RUECKMELDUNGEN_DER_LEITUNGSKRAEFTE: '6b043a9e3e12b3dbe1c4e594',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'personen': {
    rolle: [{ key: "leitungskraft", get label() { return lookupLabel('personen', 'rolle', "leitungskraft") ?? "Leitungskraft"; } }, { key: "sachbearbeitung", get label() { return lookupLabel('personen', 'rolle', "sachbearbeitung") ?? "Sachbearbeitung Fortbildung"; } }],
  },
  'fortbildungsantraege': {
    status: [{ key: "antrag_gestellt", get label() { return lookupLabel('fortbildungsantraege', 'status', "antrag_gestellt") ?? "Antrag gestellt"; } }, { key: "stellungnahme", get label() { return lookupLabel('fortbildungsantraege', 'status', "stellungnahme") ?? "Stellungnahme Vorgesetzte/r"; } }, { key: "abstimmung", get label() { return lookupLabel('fortbildungsantraege', 'status', "abstimmung") ?? "Abstimmung Leitungskräfte"; } }, { key: "ueberarbeitung", get label() { return lookupLabel('fortbildungsantraege', 'status', "ueberarbeitung") ?? "Überarbeitung"; } }, { key: "genehmigt", get label() { return lookupLabel('fortbildungsantraege', 'status', "genehmigt") ?? "Genehmigt"; } }, { key: "abgelehnt", get label() { return lookupLabel('fortbildungsantraege', 'status', "abgelehnt") ?? "Abgelehnt"; } }, { key: "abrechnung", get label() { return lookupLabel('fortbildungsantraege', 'status', "abrechnung") ?? "Abrechnung"; } }, { key: "zahlung_offen", get label() { return lookupLabel('fortbildungsantraege', 'status', "zahlung_offen") ?? "Zahlung offen"; } }, { key: "abgeschlossen", get label() { return lookupLabel('fortbildungsantraege', 'status', "abgeschlossen") ?? "Abgeschlossen"; } }],
    genehmigung_vorschlag: [{ key: "ja", get label() { return lookupLabel('fortbildungsantraege', 'genehmigung_vorschlag', "ja") ?? "Ja"; } }, { key: "nein", get label() { return lookupLabel('fortbildungsantraege', 'genehmigung_vorschlag', "nein") ?? "Nein"; } }],
    kategorie: [{ key: "kategorie_1", get label() { return lookupLabel('fortbildungsantraege', 'kategorie', "kategorie_1") ?? "Kategorie 1"; } }, { key: "kategorie_2", get label() { return lookupLabel('fortbildungsantraege', 'kategorie', "kategorie_2") ?? "Kategorie 2"; } }, { key: "kategorie_3", get label() { return lookupLabel('fortbildungsantraege', 'kategorie', "kategorie_3") ?? "Kategorie 3"; } }, { key: "fachtag", get label() { return lookupLabel('fortbildungsantraege', 'kategorie', "fachtag") ?? "Fachtag"; } }],
    zahlungsart: [{ key: "eigenanteil_anfordern", get label() { return lookupLabel('fortbildungsantraege', 'zahlungsart', "eigenanteil_anfordern") ?? "Eigenanteil wird angefordert"; } }, { key: "restbetrag_ueberweisen", get label() { return lookupLabel('fortbildungsantraege', 'zahlungsart', "restbetrag_ueberweisen") ?? "Restbetrag wird überwiesen"; } }, { key: "keine_zahlung", get label() { return lookupLabel('fortbildungsantraege', 'zahlungsart', "keine_zahlung") ?? "Keine Zahlung nötig"; } }],
  },
  'rueckmeldungen_der_leitungskraefte': {
    entscheidung: [{ key: "zustimmung", get label() { return lookupLabel('rueckmeldungen_der_leitungskraefte', 'entscheidung', "zustimmung") ?? "Zustimmung"; } }, { key: "rueckfrage", get label() { return lookupLabel('rueckmeldungen_der_leitungskraefte', 'entscheidung', "rueckfrage") ?? "Rückfrage"; } }, { key: "kommentar", get label() { return lookupLabel('rueckmeldungen_der_leitungskraefte', 'entscheidung', "kommentar") ?? "Kommentar"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'standorte': {
    'bezeichnung': 'string/text',
  },
  'personen': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'rolle': 'lookup/radio',
    'abteilung': 'string/text',
    'standort': 'applookup/select',
  },
  'fortbildungsantraege': {
    'antragsteller': 'applookup/select',
    'titel': 'string/text',
    'veranstalter': 'string/text',
    'ort': 'string/text',
    'zielgruppe': 'string/text',
    'beginn': 'date/datetimeminute',
    'ende': 'date/datetimeminute',
    'arbeitsbefreiung_tage': 'number',
    'arbeitsbefreiung_stunden': 'number',
    'kosten_unterkunft_verpflegung': 'number',
    'kursgebuehren': 'number',
    'fahrtkosten': 'number',
    'gesamtkosten': 'number',
    'ausschreibung': 'file',
    'ausschreibung_link': 'string/url',
    'leitungskraft': 'applookup/select',
    'weitere_leitungskraefte': 'multipleapplookup/select',
    'status': 'lookup/select',
    'genehmigung_vorschlag': 'lookup/radio',
    'kategorie': 'lookup/select',
    'fortbildungstage': 'number',
    'fortbildungsstunden': 'number',
    'dienstbefreiung_tage': 'number',
    'dienstbefreiung_stunden': 'number',
    'kostenuebernahme': 'number',
    'eigenanteil': 'number',
    'restanspruch_tage': 'number',
    'beginn_zeitraum': 'date/date',
    'bemerkung': 'string/textarea',
    'genehmigt_am': 'date/date',
    'mitteilung_antragsteller': 'bool',
    'tatsaechliche_kosten': 'number',
    'abrechnung_datum': 'date/date',
    'abrechnung_bemerkung': 'string/textarea',
    'zahlungsart': 'lookup/radio',
    'zahlungsbetrag': 'number',
    'zahlungseingang': 'bool',
    'zahlungseingang_datum': 'date/date',
    'abschluss_datum': 'date/date',
  },
  'rueckmeldungen_der_leitungskraefte': {
    'antrag': 'applookup/select',
    'leitungskraft': 'applookup/select',
    'entscheidung': 'lookup/radio',
    'kommentar': 'string/textarea',
    'datum': 'date/date',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
  'personen': [
    { field: 'antragsteller', entity: 'fortbildungsantraege' },
    { field: 'leitungskraft', entity: 'fortbildungsantraege' },
    { field: 'weitere_leitungskraefte', entity: 'fortbildungsantraege' },
    { field: 'leitungskraft', entity: 'rueckmeldungen_der_leitungskraefte' },
  ],
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateStandorte = StripLookup<Standorte['fields']>;
export type CreatePersonen = StripLookup<Personen['fields']>;
export type CreateFortbildungsantraege = StripLookup<Fortbildungsantraege['fields']>;
export type CreateRueckmeldungenDerLeitungskraefte = StripLookup<RueckmeldungenDerLeitungskraefte['fields']>;