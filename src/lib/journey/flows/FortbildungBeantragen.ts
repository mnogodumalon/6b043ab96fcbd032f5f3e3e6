/**
 * useFortbildungBeantragenFlow — the plumbing of the flow « Fortbildung beantragen », generated from the plan.
 *
 * Writes `fortbildungsantraege`: asks `antragsteller`, `titel`, `veranstalter`, `ort`, `zielgruppe`, `beginn`, `ende`, `arbeitsbefreiung_tage`, `arbeitsbefreiung_stunden`, `kosten_unterkunft_verpflegung`, `kursgebuehren`, `fahrtkosten`, `gesamtkosten`, `ausschreibung`, `ausschreibung_link`, `leitungskraft`, `tatsaechliche_kosten`, `kostenuebernahme`; sets `status` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 4)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useFortbildungBeantragenFlow({
 *     steps: { antragsteller: 1, leitungskraft: 2, titel: 3, veranstalter: 3, ort: 3, zielgruppe: 3, beginn: 3, ende: 3, arbeitsbefreiung_tage: 3, arbeitsbefreiung_stunden: 3, kosten_unterkunft_verpflegung: 3, kursgebuehren: 3, fahrtkosten: 3, gesamtkosten: 3, ausschreibung: 3, ausschreibung_link: 3, tatsaechliche_kosten: 3, kostenuebernahme: 3 },
 *     items: { antragsteller: r => ({ id: r.id, title: fieldText(r, 'vorname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.antragsteller.select} {...flow.pick('antragsteller')} />
 *     <EntitySelectStep {...flow.picks.leitungskraft.select} {...flow.pick('leitungskraft')} />
 *     <Bound form={flow.forms.fortbildungsantraege} name="titel" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="veranstalter" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="ort" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="zielgruppe" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="beginn" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="ende" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="arbeitsbefreiung_tage" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="arbeitsbefreiung_stunden" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="kosten_unterkunft_verpflegung" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="kursgebuehren" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="fahrtkosten" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="gesamtkosten" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="ausschreibung" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="ausschreibung_link" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="tatsaechliche_kosten" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="kostenuebernahme" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import { useEffect, useRef, useState } from 'react';
import { readJourneyExtra, writeJourneyExtra } from '@/lib/journey/draft';
import { DOOR_PARENTS, nounOne } from '@/config/plan';
import { syncDoorsAfterWrite } from '@/lib/publicDoors';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';

export type FortbildungBeantragenFieldKey = 'antragsteller' | 'arbeitsbefreiung_stunden' | 'arbeitsbefreiung_tage' | 'ausschreibung' | 'ausschreibung_link' | 'beginn' | 'ende' | 'fahrtkosten' | 'gesamtkosten' | 'kosten_unterkunft_verpflegung' | 'kostenuebernahme' | 'kursgebuehren' | 'leitungskraft' | 'ort' | 'tatsaechliche_kosten' | 'titel' | 'veranstalter' | 'zielgruppe';

export interface FortbildungBeantragenForms {
  fortbildungsantraege: StepForm<'fortbildungsantraege'>;
}

// Alias so the option generics stay readable.
type Key = FortbildungBeantragenFieldKey;

export interface FortbildungBeantragenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    antragsteller?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    leitungskraft?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** A page-side narrowing per pick, on top of the plan's filter (J-3): the
   *  questions of the picked event, the open ones — `r => fieldRef(r, 'veranstaltung') === eventId`. */
  where?: {
    antragsteller?: (record: JourneyRecord) => boolean;
    leitungskraft?: (record: JourneyRecord) => boolean;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"antragsteller": 1, "arbeitsbefreiung_stunden": 3, "arbeitsbefreiung_tage": 3, "ausschreibung": 3, "ausschreibung_link": 3, "beginn": 3, "ende": 3, "fahrtkosten": 3, "gesamtkosten": 3, "kosten_unterkunft_verpflegung": 3, "kostenuebernahme": 3, "kursgebuehren": 3, "leitungskraft": 2, "ort": 3, "tatsaechliche_kosten": 3, "titel": 3, "veranstalter": 3, "zielgruppe": 3};
export const FORTBILDUNGBEANTRAGEN_REVIEW_STEP = 4;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
// local calendar day — the ISO-string of a Date is UTC and flips the date in the evening (J-7)
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useFortbildungBeantragenFlow(options: FortbildungBeantragenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const fortbildungsantraege = useStepForm('fortbildungsantraege', {
    fields: ["antragsteller", "titel", "veranstalter", "ort", "zielgruppe", "beginn", "ende", "arbeitsbefreiung_tage", "arbeitsbefreiung_stunden", "kosten_unterkunft_verpflegung", "kursgebuehren", "fahrtkosten", "gesamtkosten", "ausschreibung", "ausschreibung_link", "leitungskraft", "tatsaechliche_kosten", "kostenuebernahme"],
    steps: only(steps, ["antragsteller", "titel", "veranstalter", "ort", "zielgruppe", "beginn", "ende", "arbeitsbefreiung_tage", "arbeitsbefreiung_stunden", "kosten_unterkunft_verpflegung", "kursgebuehren", "fahrtkosten", "gesamtkosten", "ausschreibung", "ausschreibung_link", "leitungskraft", "tatsaechliche_kosten", "kostenuebernahme"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["antragsteller", "titel", "veranstalter", "ort", "zielgruppe", "beginn", "ende", "arbeitsbefreiung_tage", "arbeitsbefreiung_stunden", "kosten_unterkunft_verpflegung", "kursgebuehren", "fahrtkosten", "gesamtkosten", "ausschreibung", "ausschreibung_link", "leitungskraft", "tatsaechliche_kosten", "kostenuebernahme"]),
    messages: only(options.messages as Record<string, string> | undefined, ["antragsteller", "titel", "veranstalter", "ort", "zielgruppe", "beginn", "ende", "arbeitsbefreiung_tage", "arbeitsbefreiung_stunden", "kosten_unterkunft_verpflegung", "kursgebuehren", "fahrtkosten", "gesamtkosten", "ausschreibung", "ausschreibung_link", "leitungskraft", "tatsaechliche_kosten", "kostenuebernahme"]),
  });
  const forms: FortbildungBeantragenForms = { fortbildungsantraege };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [fortbildungsantraege];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    antragsteller: useRecordSearch(servicePort, 'personen', withPickPolicy('antragsteller', {
      searchFields: ["vorname", "nachname"] as never,
      where: options.where?.antragsteller,
      toItem: options.items?.antragsteller as never,
      claim: 'fortbildungsantraege.antragsteller',
    })),
    leitungskraft: useRecordSearch(servicePort, 'personen', withPickPolicy('leitungskraft', {
      searchFields: ["vorname", "nachname"] as never,
      where: options.where?.leitungskraft,
      toItem: options.items?.leitungskraft as never,
      claim: 'fortbildungsantraege.leitungskraft',
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:fortbildung-beantragen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:fortbildung-beantragen:write:${entity}.${field}`,
  });
  // the numbers a choice is made with: how many `rueckmeldungen_der_leitungskraefte` point at each card, per `entscheidung`
  const [tally_antragsteller, setTally_antragsteller] = useState<Record<string, Record<string, number>>>({});
  useEffect(() => {
    let alive = true;
    servicePort.list('rueckmeldungen_der_leitungskraefte').then(rows => {
      const out: Record<string, Record<string, number>> = {};
      for (const r of rows) {
        const id = fieldRef(r, 'leitungskraft');
        const k = fieldLookup(r, 'entscheidung')?.key;
        if (!id || !k) continue;
        (out[id] ??= {})[k] = (out[id][k] ?? 0) + 1;
      }
      if (alive) setTally_antragsteller(out);
    }).catch(() => { /* the cards stay without numbers — the pick itself still works */ });
    return () => { alive = false; };
  }, []);
  const withTally_antragsteller = <T extends { id: string; stats?: { label: string; value: string | number }[] }>(items: T[]): T[] => items.map(it => ({
    ...it,
    stats: [...optionsOf('rueckmeldungen_der_leitungskraefte', 'entscheidung').slice(0, 3).map(o => ({ label: o.label, value: tally_antragsteller[it.id]?.[o.key] ?? 0 })), ...(it.stats ?? [])],
  }));
  // the numbers a choice is made with: how many `rueckmeldungen_der_leitungskraefte` point at each card, per `entscheidung`
  const [tally_leitungskraft, setTally_leitungskraft] = useState<Record<string, Record<string, number>>>({});
  useEffect(() => {
    let alive = true;
    servicePort.list('rueckmeldungen_der_leitungskraefte').then(rows => {
      const out: Record<string, Record<string, number>> = {};
      for (const r of rows) {
        const id = fieldRef(r, 'leitungskraft');
        const k = fieldLookup(r, 'entscheidung')?.key;
        if (!id || !k) continue;
        (out[id] ??= {})[k] = (out[id][k] ?? 0) + 1;
      }
      if (alive) setTally_leitungskraft(out);
    }).catch(() => { /* the cards stay without numbers — the pick itself still works */ });
    return () => { alive = false; };
  }, []);
  const withTally_leitungskraft = <T extends { id: string; stats?: { label: string; value: string | number }[] }>(items: T[]): T[] => items.map(it => ({
    ...it,
    stats: [...optionsOf('rueckmeldungen_der_leitungskraefte', 'entscheidung').slice(0, 3).map(o => ({ label: o.label, value: tally_leitungskraft[it.id]?.[o.key] ?? 0 })), ...(it.stats ?? [])],
  }));
  const picks = {
    antragsteller: { ...searches.antragsteller, select: { ...searches.antragsteller.select, items: withTally_antragsteller(searches.antragsteller.select.items), create: true as boolean, hint: hintFor('antragsteller', 'personen', null as PickWhere | null) } },
    leitungskraft: { ...searches.leitungskraft, select: { ...searches.leitungskraft.select, items: withTally_leitungskraft(searches.leitungskraft.select.items), create: true as boolean, hint: hintFor('leitungskraft', 'personen', null as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'fortbildungsantraege', entity: 'fortbildungsantraege', form: fortbildungsantraege, label: nounOne('fortbildungsantraege', entityLabel('fortbildungsantraege')), primary: true,
      values: (): FormValues => ({
        status: policyFixedValue('fortbildungsantraege', 'status') ?? "antrag_gestellt",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('fortbildungsantraege', 'status', policyFixedValue('fortbildungsantraege', 'status') ?? "antrag_gestellt")],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'fortbildung-beantragen', onSuccess: (r) => {
    // EF-51: a created or changed parent record keeps its pair of doors in step (made, closed, reopened)
    for (const [k, rec] of Object.entries(r.records)) {
      const ent = plan.find(s => s.key === k)?.entity;
      if (ent && Object.values(DOOR_PARENTS).some(d => d.entity === ent)) void syncDoorsAfterWrite(ent, rec.id, rec.fields);
    }
  } });

  // A typed field the plan prefills from the picked record (`user:from_pick`),
  // still the person's to change: filled once, only while empty (PV-12)
  const prefillFrom = (pickKey: string, rec: JourneyRecord) => {
    void pickKey; void rec;
  };

  // Opened with `?<field>=<value>` for a field this flow asks — a dashboard
  // link that pre-picks the event, a form that hands the question on (J-2):
  // a typed field takes the value while it is empty (a draft wins), a pick
  // loads the record, takes it into the pick and selects it WITH its name.
  // `initial` with a bare record id gets its name the same way.
  const [linkedParams] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? ''));
  useEffect(() => {
    let on = true;
    const coerce = (form: StepForm, key: string, raw: string): unknown => {
      const kind = form.rules[key]?.kind;
      if (kind === 'number') { const n = Number(raw); return Number.isFinite(n) ? n : raw; }
      if (kind === 'bool') return raw === 'true' || raw === '1' || raw === 'ja';
      return raw;
    };
    { const v = linkedParams.get('titel'); if (v !== null && isEmptyValue(fortbildungsantraege.get('titel'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('titel', coerce(fortbildungsantraege, 'titel', v)); }
    { const v = linkedParams.get('veranstalter'); if (v !== null && isEmptyValue(fortbildungsantraege.get('veranstalter'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('veranstalter', coerce(fortbildungsantraege, 'veranstalter', v)); }
    { const v = linkedParams.get('ort'); if (v !== null && isEmptyValue(fortbildungsantraege.get('ort'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('ort', coerce(fortbildungsantraege, 'ort', v)); }
    { const v = linkedParams.get('zielgruppe'); if (v !== null && isEmptyValue(fortbildungsantraege.get('zielgruppe'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('zielgruppe', coerce(fortbildungsantraege, 'zielgruppe', v)); }
    { const v = linkedParams.get('beginn'); if (v !== null && isEmptyValue(fortbildungsantraege.get('beginn'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('beginn', coerce(fortbildungsantraege, 'beginn', v)); }
    { const v = linkedParams.get('ende'); if (v !== null && isEmptyValue(fortbildungsantraege.get('ende'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('ende', coerce(fortbildungsantraege, 'ende', v)); }
    { const v = linkedParams.get('arbeitsbefreiung_tage'); if (v !== null && isEmptyValue(fortbildungsantraege.get('arbeitsbefreiung_tage'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('arbeitsbefreiung_tage', coerce(fortbildungsantraege, 'arbeitsbefreiung_tage', v)); }
    { const v = linkedParams.get('arbeitsbefreiung_stunden'); if (v !== null && isEmptyValue(fortbildungsantraege.get('arbeitsbefreiung_stunden'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('arbeitsbefreiung_stunden', coerce(fortbildungsantraege, 'arbeitsbefreiung_stunden', v)); }
    { const v = linkedParams.get('kosten_unterkunft_verpflegung'); if (v !== null && isEmptyValue(fortbildungsantraege.get('kosten_unterkunft_verpflegung'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('kosten_unterkunft_verpflegung', coerce(fortbildungsantraege, 'kosten_unterkunft_verpflegung', v)); }
    { const v = linkedParams.get('kursgebuehren'); if (v !== null && isEmptyValue(fortbildungsantraege.get('kursgebuehren'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('kursgebuehren', coerce(fortbildungsantraege, 'kursgebuehren', v)); }
    { const v = linkedParams.get('fahrtkosten'); if (v !== null && isEmptyValue(fortbildungsantraege.get('fahrtkosten'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('fahrtkosten', coerce(fortbildungsantraege, 'fahrtkosten', v)); }
    { const v = linkedParams.get('gesamtkosten'); if (v !== null && isEmptyValue(fortbildungsantraege.get('gesamtkosten'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('gesamtkosten', coerce(fortbildungsantraege, 'gesamtkosten', v)); }
    { const v = linkedParams.get('ausschreibung'); if (v !== null && isEmptyValue(fortbildungsantraege.get('ausschreibung'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('ausschreibung', coerce(fortbildungsantraege, 'ausschreibung', v)); }
    { const v = linkedParams.get('ausschreibung_link'); if (v !== null && isEmptyValue(fortbildungsantraege.get('ausschreibung_link'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('ausschreibung_link', coerce(fortbildungsantraege, 'ausschreibung_link', v)); }
    { const v = linkedParams.get('tatsaechliche_kosten'); if (v !== null && isEmptyValue(fortbildungsantraege.get('tatsaechliche_kosten'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('tatsaechliche_kosten', coerce(fortbildungsantraege, 'tatsaechliche_kosten', v)); }
    { const v = linkedParams.get('kostenuebernahme'); if (v !== null && isEmptyValue(fortbildungsantraege.get('kostenuebernahme'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('kostenuebernahme', coerce(fortbildungsantraege, 'kostenuebernahme', v)); }
    {
      const cur = forms.fortbildungsantraege.get('antragsteller');
      const fromLink = linkedParams.get('antragsteller');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.fortbildungsantraege.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('personen', id).then(rec => {
        if (!on || !rec) return;
        picks.antragsteller.adopt(rec);
        const name = picks.antragsteller.labelOf(rec.id) ?? rec.id;
        (forms.fortbildungsantraege.set as (k: string, v: unknown, l?: string) => void)('antragsteller', rec.id, name);
        prefillFrom('antragsteller', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.fortbildungsantraege.get('leitungskraft');
      const fromLink = linkedParams.get('leitungskraft');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.fortbildungsantraege.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('personen', id).then(rec => {
        if (!on || !rec) return;
        picks.leitungskraft.adopt(rec);
        const name = picks.leitungskraft.labelOf(rec.id) ?? rec.id;
        (forms.fortbildungsantraege.set as (k: string, v: unknown, l?: string) => void)('leitungskraft', rec.id, name);
        prefillFrom('leitungskraft', rec);
      }).catch(() => undefined);
    }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: FortbildungBeantragenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined; recordOf?(id: string): JourneyRecord | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => {
        (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id));
        const rec = search?.recordOf?.(id);
        if (rec) prefillFrom(field, rec);
      },
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: FortbildungBeantragenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'fortbildung-beantragen' as const,
    draftKey: 'fortbildung-beantragen' as const,    entity: 'fortbildungsantraege' as const,
    form: fortbildungsantraege,
    forms, formList, picks, submit, steps,    reviewStep: FORTBILDUNGBEANTRAGEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type FortbildungBeantragenFlow = ReturnType<typeof useFortbildungBeantragenFlow>;
