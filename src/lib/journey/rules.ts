/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'standorte' | 'personen' | 'fortbildungsantraege' | 'rueckmeldungen_der_leitungskraefte';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "standorte": "bezeichnung";
  "personen": "vorname" | "nachname" | "email" | "abteilung";
  "fortbildungsantraege": "titel" | "veranstalter" | "ort" | "zielgruppe" | "ausschreibung_link" | "bemerkung" | "abrechnung_bemerkung";
  "rueckmeldungen_der_leitungskraefte": "kommentar";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "standorte": never;
  "personen": "standort";
  "fortbildungsantraege": "antragsteller" | "leitungskraft" | "weitere_leitungskraefte";
  "rueckmeldungen_der_leitungskraefte": "antrag" | "leitungskraft";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it as a value. `file` is false: a file is UPLOADED
   *  (`form.file(key)` → FileField; the chosen file travels in the create as a data URL). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "standorte": {
    "key": "standorte",
    "appId": "6b043a989170fbb45cc768c5",
    "label": "Standorte",
    "pascal": "Standorte",
    "single": "StandorteEntry"
  },
  "personen": {
    "key": "personen",
    "appId": "6b043a9deed16d3125fbe8d9",
    "label": "Personen",
    "pascal": "Personen",
    "single": "PersonenEntry"
  },
  "fortbildungsantraege": {
    "key": "fortbildungsantraege",
    "appId": "6b043a9d28c5fd1c6f783c12",
    "label": "Fortbildungsanträge",
    "pascal": "Fortbildungsantraege",
    "single": "FortbildungsantraegeEntry"
  },
  "rueckmeldungen_der_leitungskraefte": {
    "key": "rueckmeldungen_der_leitungskraefte",
    "appId": "6b043a9e3e12b3dbe1c4e594",
    "label": "Rückmeldungen der Leitungskräfte",
    "pascal": "RueckmeldungenDerLeitungskraefte",
    "single": "RueckmeldungenDerLeitungskraefteEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "standorte": {
    "bezeichnung": {
      "key": "bezeichnung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Standort",
      "writable": true,
      "maxLength": 4000
    }
  },
  "personen": {
    "vorname": {
      "key": "vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "nachname": {
      "key": "nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "rolle": {
      "key": "rolle",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Rolle",
      "writable": true,
      "options": [
        "leitungskraft",
        "sachbearbeitung"
      ]
    },
    "abteilung": {
      "key": "abteilung",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Abteilung",
      "writable": true,
      "maxLength": 4000
    },
    "standort": {
      "key": "standort",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Standort",
      "writable": true,
      "targetAppId": "6b043a989170fbb45cc768c5",
      "targetEntity": "standorte"
    }
  },
  "fortbildungsantraege": {
    "antragsteller": {
      "key": "antragsteller",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Antragsteller/in",
      "writable": true,
      "targetAppId": "6b043a9deed16d3125fbe8d9",
      "targetEntity": "personen"
    },
    "titel": {
      "key": "titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Titel der Veranstaltung",
      "writable": true,
      "maxLength": 4000
    },
    "veranstalter": {
      "key": "veranstalter",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Veranstalter",
      "writable": true,
      "maxLength": 4000
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Ort der Veranstaltung oder digitales Format",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "zielgruppe": {
      "key": "zielgruppe",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Zielgruppe",
      "writable": true,
      "maxLength": 4000
    },
    "beginn": {
      "key": "beginn",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": true,
      "label": "Beginn",
      "writable": true
    },
    "ende": {
      "key": "ende",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": true,
      "label": "Ende",
      "writable": true
    },
    "arbeitsbefreiung_tage": {
      "key": "arbeitsbefreiung_tage",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Arbeitsbefreiung in Tagen",
      "writable": true
    },
    "arbeitsbefreiung_stunden": {
      "key": "arbeitsbefreiung_stunden",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Arbeitsbefreiung in Stunden",
      "writable": true
    },
    "kosten_unterkunft_verpflegung": {
      "key": "kosten_unterkunft_verpflegung",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Kosten Unterkunft und Verpflegung (€)",
      "writable": true,
      "format": "currency"
    },
    "kursgebuehren": {
      "key": "kursgebuehren",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Kursgebühren (€)",
      "writable": true,
      "format": "currency"
    },
    "fahrtkosten": {
      "key": "fahrtkosten",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Fahrtkosten (€)",
      "writable": true,
      "format": "currency"
    },
    "gesamtkosten": {
      "key": "gesamtkosten",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Gesamtkosten (€)",
      "writable": true,
      "format": "currency"
    },
    "ausschreibung": {
      "key": "ausschreibung",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Kursausschreibung bzw. Tagungsprogramm",
      "writable": false
    },
    "ausschreibung_link": {
      "key": "ausschreibung_link",
      "fulltype": "string/url",
      "kind": "url",
      "required": false,
      "label": "Link zur Ausschreibung",
      "writable": true,
      "autoComplete": "url"
    },
    "leitungskraft": {
      "key": "leitungskraft",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Zuständige Leitungskraft",
      "writable": true,
      "targetAppId": "6b043a9deed16d3125fbe8d9",
      "targetEntity": "personen"
    },
    "weitere_leitungskraefte": {
      "key": "weitere_leitungskraefte",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Weitere Leitungskräfte (mindestens drei)",
      "writable": true,
      "targetAppId": "6b043a9deed16d3125fbe8d9",
      "targetEntity": "personen"
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "antrag_gestellt",
        "stellungnahme",
        "abstimmung",
        "ueberarbeitung",
        "genehmigt",
        "abgelehnt",
        "abrechnung",
        "zahlung_offen",
        "abgeschlossen"
      ]
    },
    "genehmigung_vorschlag": {
      "key": "genehmigung_vorschlag",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": false,
      "label": "Genehmigung",
      "writable": true,
      "options": [
        "ja",
        "nein"
      ]
    },
    "kategorie": {
      "key": "kategorie",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Fortbildungskategorie",
      "writable": true,
      "options": [
        "kategorie_1",
        "kategorie_2",
        "kategorie_3",
        "fachtag"
      ]
    },
    "fortbildungstage": {
      "key": "fortbildungstage",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Fortbildungstage (Tage)",
      "writable": true
    },
    "fortbildungsstunden": {
      "key": "fortbildungsstunden",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Fortbildungsstunden",
      "writable": true
    },
    "dienstbefreiung_tage": {
      "key": "dienstbefreiung_tage",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Dienstbefreiung in Tagen",
      "writable": true
    },
    "dienstbefreiung_stunden": {
      "key": "dienstbefreiung_stunden",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Dienstbefreiung in Stunden",
      "writable": true
    },
    "kostenuebernahme": {
      "key": "kostenuebernahme",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Kostenübernahme in Höhe von (€)",
      "writable": true,
      "format": "currency"
    },
    "eigenanteil": {
      "key": "eigenanteil",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Eigenanteil (€)",
      "writable": true,
      "format": "currency"
    },
    "restanspruch_tage": {
      "key": "restanspruch_tage",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Restanspruch Fortbildungstage (2 Jahre)",
      "writable": true
    },
    "beginn_zeitraum": {
      "key": "beginn_zeitraum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Beginn 2-Jahres-Zeitraum",
      "writable": true
    },
    "bemerkung": {
      "key": "bemerkung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bemerkung",
      "writable": true
    },
    "genehmigt_am": {
      "key": "genehmigt_am",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Genehmigt am",
      "writable": true
    },
    "mitteilung_antragsteller": {
      "key": "mitteilung_antragsteller",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Antragsteller/in wurde informiert (inkl. verbleibender Fortbildungstage)",
      "writable": true
    },
    "tatsaechliche_kosten": {
      "key": "tatsaechliche_kosten",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Tatsächliche Gesamtkosten (€)",
      "writable": true,
      "format": "currency"
    },
    "abrechnung_datum": {
      "key": "abrechnung_datum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Datum der Abrechnung",
      "writable": true
    },
    "abrechnung_bemerkung": {
      "key": "abrechnung_bemerkung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bemerkung zur Abrechnung",
      "writable": true
    },
    "zahlungsart": {
      "key": "zahlungsart",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": false,
      "label": "Zahlungsart",
      "writable": true,
      "options": [
        "eigenanteil_anfordern",
        "restbetrag_ueberweisen",
        "keine_zahlung"
      ]
    },
    "zahlungsbetrag": {
      "key": "zahlungsbetrag",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Zahlungsbetrag (€)",
      "writable": true,
      "format": "currency"
    },
    "zahlungseingang": {
      "key": "zahlungseingang",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Zahlung eingegangen bzw. erfolgt",
      "writable": true
    },
    "zahlungseingang_datum": {
      "key": "zahlungseingang_datum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Datum des Zahlungseingangs",
      "writable": true
    },
    "abschluss_datum": {
      "key": "abschluss_datum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Vorgang abgeschlossen am",
      "writable": true
    }
  },
  "rueckmeldungen_der_leitungskraefte": {
    "antrag": {
      "key": "antrag",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Fortbildungsantrag",
      "writable": true,
      "targetAppId": "6b043a9d28c5fd1c6f783c12",
      "targetEntity": "fortbildungsantraege"
    },
    "leitungskraft": {
      "key": "leitungskraft",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Leitungskraft",
      "writable": true,
      "targetAppId": "6b043a9deed16d3125fbe8d9",
      "targetEntity": "personen"
    },
    "entscheidung": {
      "key": "entscheidung",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Rückmeldung",
      "writable": true,
      "options": [
        "zustimmung",
        "rueckfrage",
        "kommentar"
      ]
    },
    "kommentar": {
      "key": "kommentar",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Kommentar oder Rückfrage",
      "writable": true
    },
    "datum": {
      "key": "datum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Datum der Rückmeldung",
      "writable": true
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "standorte": [],
  "personen": [
    {
      "kind": "choice",
      "field": "rolle",
      "count": 2
    },
    {
      "kind": "record",
      "field": "standort",
      "targetEntity": "standorte"
    }
  ],
  "fortbildungsantraege": [
    {
      "kind": "range",
      "from": "beginn",
      "to": "ende"
    },
    {
      "kind": "choice",
      "field": "genehmigung_vorschlag",
      "count": 2
    },
    {
      "kind": "choice",
      "field": "kategorie",
      "count": 4
    },
    {
      "kind": "choice",
      "field": "zahlungsart",
      "count": 3
    },
    {
      "kind": "record",
      "field": "antragsteller",
      "targetEntity": "personen"
    },
    {
      "kind": "record",
      "field": "leitungskraft",
      "targetEntity": "personen"
    },
    {
      "kind": "record",
      "field": "weitere_leitungskraefte",
      "targetEntity": "personen"
    }
  ],
  "rueckmeldungen_der_leitungskraefte": [
    {
      "kind": "choice",
      "field": "entscheidung",
      "count": 3
    },
    {
      "kind": "record",
      "field": "antrag",
      "targetEntity": "fortbildungsantraege"
    },
    {
      "kind": "record",
      "field": "leitungskraft",
      "targetEntity": "personen"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "standorte": [
    "bezeichnung"
  ],
  "personen": [
    "vorname",
    "nachname"
  ],
  "fortbildungsantraege": [
    "titel"
  ],
  "rueckmeldungen_der_leitungskraefte": [
    "kommentar"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
/** A date reads as a date (a target whose only readable fields are `beginn`/`ende` — Doodle KB 6),
 *  a number as a number; a record URL or a bare id is never a name (0.0.389). */
export function displayPart(v: unknown): string {
  if (typeof v === 'string') {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatDate(s);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return formatDateTime(s);
    if (/^https?:\/\//.test(s) || /^[0-9a-f]{24}$/i.test(s)) return '';
    return s;
  }
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

/** „Nicht ausgefüllt“ for a required field, by its kind: a checkbox that is
 *  `false` is NOT filled — the person did not consent (live 03.11.2026: a
 *  consent page validated with the box unticked and the grant took it). Every
 *  other kind is isEmptyValue. */
export function isUnfilled(entity: EntityKey, key: string, v: unknown): boolean {
  if (ruleOf(entity, key)?.kind === 'bool') return v !== true;
  return isEmptyValue(v);
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
