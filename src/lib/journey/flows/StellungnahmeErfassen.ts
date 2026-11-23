/**
 * useStellungnahmeErfassenFlow — the plumbing of the flow « Stellungnahme erfassen », generated from the plan.
 *
 * Changes `fortbildungsantraege`: the record to change is picked (`flow.pick('fortbildungsantraege')`), the form is prefilled with its values; asks `genehmigung_vorschlag`, `kategorie`, `fortbildungstage`, `fortbildungsstunden`, `dienstbefreiung_tage`, `dienstbefreiung_stunden`, `kostenuebernahme`, `eigenanteil`, `restanspruch_tage`, `beginn_zeitraum`, `bemerkung`, `weitere_leitungskraefte`.
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
 *   const flow = useStellungnahmeErfassenFlow({
 *     steps: { fortbildungsantraege: 1, weitere_leitungskraefte: 2, genehmigung_vorschlag: 3, kategorie: 3, fortbildungstage: 3, fortbildungsstunden: 3, dienstbefreiung_tage: 3, dienstbefreiung_stunden: 3, kostenuebernahme: 3, eigenanteil: 3, restanspruch_tage: 3, beginn_zeitraum: 3, bemerkung: 3 },
 *     items: { weitere_leitungskraefte: r => ({ id: r.id, title: fieldText(r, 'vorname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.weitere_leitungskraefte.select} {...flow.pickMany('weitere_leitungskraefte')} />
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.fortbildungsantraege.select} {...flow.pick('fortbildungsantraege')} />
 *     <Bound form={flow.forms.fortbildungsantraege} name="genehmigung_vorschlag" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="kategorie" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="fortbildungstage" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="fortbildungsstunden" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="dienstbefreiung_tage" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="dienstbefreiung_stunden" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="kostenuebernahme" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="eigenanteil" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="restanspruch_tage" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="beginn_zeitraum" />
 *     <Bound form={flow.forms.fortbildungsantraege} name="bemerkung" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} undo={flow.undo} />}
 *   </IntentWizardShell>
 */
import { useEffect, useRef, useState } from 'react';
import { readJourneyExtra, writeJourneyExtra } from '@/lib/journey/draft';
import { DOOR_PARENTS, nounOne } from '@/config/plan';
import { syncDoorsAfterWrite } from '@/lib/publicDoors';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { requestWizardStep } from '@/lib/journey/useStepForm';
import { reportReadFailure } from '@/lib/journey/readFailures';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';

export type StellungnahmeErfassenFieldKey = 'beginn_zeitraum' | 'bemerkung' | 'dienstbefreiung_stunden' | 'dienstbefreiung_tage' | 'eigenanteil' | 'fortbildungsantraege' | 'fortbildungsstunden' | 'fortbildungstage' | 'genehmigung_vorschlag' | 'kategorie' | 'kostenuebernahme' | 'restanspruch_tage' | 'weitere_leitungskraefte';

export interface StellungnahmeErfassenForms {
  fortbildungsantraege: StepForm<'fortbildungsantraege'>;
}

// Alias so the option generics stay readable.
type Key = StellungnahmeErfassenFieldKey;

export interface StellungnahmeErfassenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    weitere_leitungskraefte?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    fortbildungsantraege?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** A page-side narrowing per pick, on top of the plan's filter (J-3): the
   *  questions of the picked event, the open ones — `r => fieldRef(r, 'veranstaltung') === eventId`. */
  where?: {
    weitere_leitungskraefte?: (record: JourneyRecord) => boolean;
    fortbildungsantraege?: (record: JourneyRecord) => boolean;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"beginn_zeitraum": 3, "bemerkung": 3, "dienstbefreiung_stunden": 3, "dienstbefreiung_tage": 3, "eigenanteil": 3, "fortbildungsantraege": 1, "fortbildungsstunden": 3, "fortbildungstage": 3, "genehmigung_vorschlag": 3, "kategorie": 3, "kostenuebernahme": 3, "restanspruch_tage": 3, "weitere_leitungskraefte": 2};
export const STELLUNGNAHMEERFASSEN_REVIEW_STEP = 4;
// a label of the plan in the page's language
function labelIn(m: Record<string, string>): string {
  const l = (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'de';
  return m[l.slice(0, 2)] ?? m.de ?? Object.values(m)[0] ?? '';
}
// the counter-action (plan: undo) — what puts the changed record back
const UNDO_SETS: Record<string, unknown> = {"status": "stellungnahme"};

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
// The picked record as `?record=<id>` in the address — a reload or a shared
// address opens the flow on the same record (J-8). replaceState: no navigation.
function mirrorRecordParam(id: string | null): void {
  try {
    const [base, query = ''] = window.location.hash.split('?');
    const q = new URLSearchParams(query);
    if (id) q.set('record', id); else q.delete('record');
    const qs = q.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${base}${qs ? `?${qs}` : ''}`);
  } catch {
    /* ignore */
  }
}

export function useStellungnahmeErfassenFlow(options: StellungnahmeErfassenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [fortbildungsantraegeTargetId, setFortbildungsantraegeTargetId] = useState<string | null>(null);
  const fortbildungsantraege = useStepForm('fortbildungsantraege', {
    fields: ["genehmigung_vorschlag", "kategorie", "fortbildungstage", "fortbildungsstunden", "dienstbefreiung_tage", "dienstbefreiung_stunden", "kostenuebernahme", "eigenanteil", "restanspruch_tage", "beginn_zeitraum", "bemerkung", "weitere_leitungskraefte"],
    steps: only(steps, ["genehmigung_vorschlag", "kategorie", "fortbildungstage", "fortbildungsstunden", "dienstbefreiung_tage", "dienstbefreiung_stunden", "kostenuebernahme", "eigenanteil", "restanspruch_tage", "beginn_zeitraum", "bemerkung", "weitere_leitungskraefte"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["genehmigung_vorschlag", "kategorie", "fortbildungstage", "fortbildungsstunden", "dienstbefreiung_tage", "dienstbefreiung_stunden", "kostenuebernahme", "eigenanteil", "restanspruch_tage", "beginn_zeitraum", "bemerkung", "weitere_leitungskraefte"]),
    messages: only(options.messages as Record<string, string> | undefined, ["genehmigung_vorschlag", "kategorie", "fortbildungstage", "fortbildungsstunden", "dienstbefreiung_tage", "dienstbefreiung_stunden", "kostenuebernahme", "eigenanteil", "restanspruch_tage", "beginn_zeitraum", "bemerkung", "weitere_leitungskraefte"]),
  });
  const forms: StellungnahmeErfassenForms = { fortbildungsantraege };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [fortbildungsantraege];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    weitere_leitungskraefte: useRecordSearch(servicePort, 'personen', withPickPolicy('weitere_leitungskraefte', {
      searchFields: ["vorname", "nachname", "abteilung"] as never,
      filter: "r.v_rolle == 'leitungskraft'",
      where: (r: JourneyRecord) => ((fieldLookup(r, "rolle")?.key ?? null) === "leitungskraft") && (options.where?.weitere_leitungskraefte?.(r) ?? true),
      toItem: options.items?.weitere_leitungskraefte as never,
      claim: 'fortbildungsantraege.weitere_leitungskraefte',
    })),
    fortbildungsantraege: useRecordSearch(servicePort, 'fortbildungsantraege', withPickPolicy('fortbildungsantraege', {
      searchFields: ["titel"] as never,
      filter: "r.v_status == 'antrag_gestellt' or r.v_status == 'stellungnahme' or r.v_status == 'ueberarbeitung'",
      where: (r: JourneyRecord) => ((fieldLookup(r, "status")?.key ?? null) === "antrag_gestellt" || (fieldLookup(r, "status")?.key ?? null) === "stellungnahme" || (fieldLookup(r, "status")?.key ?? null) === "ueberarbeitung") && (options.where?.fortbildungsantraege?.(r) ?? true),
      toItem: options.items?.fortbildungsantraege as never,
      includeTaken: true,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:stellungnahme-erfassen:read:${entity}`);
  const picks = {
    weitere_leitungskraefte: { ...searches.weitere_leitungskraefte, select: { ...searches.weitere_leitungskraefte.select, create: false as boolean, hint: hintFor('weitere_leitungskraefte', 'personen', {"conditions": [{"field": "rolle", "op": "eq", "value": "leitungskraft"}], "mode": "all"} as PickWhere | null) } },
    fortbildungsantraege: { ...searches.fortbildungsantraege, select: { ...searches.fortbildungsantraege.select, create: false as boolean, hint: hintFor('fortbildungsantraege', 'fortbildungsantraege', {"conditions": [{"field": "status", "op": "eq", "value": "antrag_gestellt"}, {"field": "status", "op": "eq", "value": "stellungnahme"}, {"field": "status", "op": "eq", "value": "ueberarbeitung"}], "mode": "any"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'fortbildungsantraege', entity: 'fortbildungsantraege', form: fortbildungsantraege, label: nounOne('fortbildungsantraege', entityLabel('fortbildungsantraege')), primary: true,
      updates: () => fortbildungsantraegeTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => fortbildungsantraegeTargetId
        ? { key: 'target:fortbildungsantraege', label: nounOne('fortbildungsantraege', entityLabel('fortbildungsantraege')), value: picks.fortbildungsantraege.labelOf(fortbildungsantraegeTargetId) ?? fortbildungsantraegeTargetId, step: steps.fortbildungsantraege }
        : undefined,
      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "nicht automatisch", "id": "ablehnung-bei-nein", "question": "Ablehnung der Leitungskraft automatisch \u00fcbernehmen?"}],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'stellungnahme-erfassen', onSuccess: (r) => {
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
    { const v = linkedParams.get('genehmigung_vorschlag'); if (v !== null && isEmptyValue(fortbildungsantraege.get('genehmigung_vorschlag'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('genehmigung_vorschlag', coerce(fortbildungsantraege, 'genehmigung_vorschlag', v)); }
    { const v = linkedParams.get('kategorie'); if (v !== null && isEmptyValue(fortbildungsantraege.get('kategorie'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('kategorie', coerce(fortbildungsantraege, 'kategorie', v)); }
    { const v = linkedParams.get('fortbildungstage'); if (v !== null && isEmptyValue(fortbildungsantraege.get('fortbildungstage'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('fortbildungstage', coerce(fortbildungsantraege, 'fortbildungstage', v)); }
    { const v = linkedParams.get('fortbildungsstunden'); if (v !== null && isEmptyValue(fortbildungsantraege.get('fortbildungsstunden'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('fortbildungsstunden', coerce(fortbildungsantraege, 'fortbildungsstunden', v)); }
    { const v = linkedParams.get('dienstbefreiung_tage'); if (v !== null && isEmptyValue(fortbildungsantraege.get('dienstbefreiung_tage'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('dienstbefreiung_tage', coerce(fortbildungsantraege, 'dienstbefreiung_tage', v)); }
    { const v = linkedParams.get('dienstbefreiung_stunden'); if (v !== null && isEmptyValue(fortbildungsantraege.get('dienstbefreiung_stunden'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('dienstbefreiung_stunden', coerce(fortbildungsantraege, 'dienstbefreiung_stunden', v)); }
    { const v = linkedParams.get('kostenuebernahme'); if (v !== null && isEmptyValue(fortbildungsantraege.get('kostenuebernahme'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('kostenuebernahme', coerce(fortbildungsantraege, 'kostenuebernahme', v)); }
    { const v = linkedParams.get('eigenanteil'); if (v !== null && isEmptyValue(fortbildungsantraege.get('eigenanteil'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('eigenanteil', coerce(fortbildungsantraege, 'eigenanteil', v)); }
    { const v = linkedParams.get('restanspruch_tage'); if (v !== null && isEmptyValue(fortbildungsantraege.get('restanspruch_tage'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('restanspruch_tage', coerce(fortbildungsantraege, 'restanspruch_tage', v)); }
    { const v = linkedParams.get('beginn_zeitraum'); if (v !== null && isEmptyValue(fortbildungsantraege.get('beginn_zeitraum'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('beginn_zeitraum', coerce(fortbildungsantraege, 'beginn_zeitraum', v)); }
    { const v = linkedParams.get('bemerkung'); if (v !== null && isEmptyValue(fortbildungsantraege.get('bemerkung'))) (fortbildungsantraege.set as (k: string, v: unknown) => void)('bemerkung', coerce(fortbildungsantraege, 'bemerkung', v)); }
    {
      const cur = forms.fortbildungsantraege.get('weitere_leitungskraefte');
      const fromLink = linkedParams.get('weitere_leitungskraefte');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.fortbildungsantraege.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('personen', id).then(rec => {
        if (!on || !rec) return;
        picks.weitere_leitungskraefte.adopt(rec);
        const name = picks.weitere_leitungskraefte.labelOf(rec.id) ?? rec.id;
        forms.fortbildungsantraege.remember(rec.id, name);
        (forms.fortbildungsantraege.set as (k: string, v: unknown, l?: string) => void)('weitere_leitungskraefte', [rec.id], name);
      }).catch(() => undefined);
    }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    fortbildungsantraege: {
      selectedId: fortbildungsantraegeTargetId,
      onSelect: (id: string) => {
        setFortbildungsantraegeTargetId(id);
        const rec = picks.fortbildungsantraege.recordOf(id);
        if (rec) fortbildungsantraege.reset({ genehmigung_vorschlag: fieldLookup(rec, "genehmigung_vorschlag")?.key, kategorie: fieldLookup(rec, "kategorie")?.key, fortbildungstage: fieldNumber(rec, "fortbildungstage"), fortbildungsstunden: fieldNumber(rec, "fortbildungsstunden"), dienstbefreiung_tage: fieldNumber(rec, "dienstbefreiung_tage"), dienstbefreiung_stunden: fieldNumber(rec, "dienstbefreiung_stunden"), kostenuebernahme: fieldNumber(rec, "kostenuebernahme"), eigenanteil: fieldNumber(rec, "eigenanteil"), restanspruch_tage: fieldNumber(rec, "restanspruch_tage"), beginn_zeitraum: fieldDate(rec, "beginn_zeitraum"), bemerkung: fieldText(rec, "bemerkung"), });
        // survives a reload: in the draft's side data, and as `?record=` in the address (J-8)
        writeJourneyExtra('stellungnahme-erfassen', 'target:fortbildungsantraege', id);
        mirrorRecordParam(id);
      },
      get record(): JourneyRecord | undefined { return fortbildungsantraegeTargetId ? picks.fortbildungsantraege.recordOf(fortbildungsantraegeTargetId) : undefined; },
    },
  };
  // Opened for one record — `#/intents/stellungnahme-erfassen?record=<id>`, the dashboard's
  // flowActionFor(): that record is the one to change. Loaded, taken into the
  // pick and selected — when this flow may change it at all (the pick's rule).
  // After a reload the pick comes back the same way: from the address, else
  // from the draft's side data (J-8).
  const [linkedId] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record')
    ?? readJourneyExtra<string>('stellungnahme-erfassen', 'target:fortbildungsantraege'));
  useEffect(() => {
    if (!linkedId) return;
    let on = true;
    void servicePort.get('fortbildungsantraege', linkedId).then(rec => {
      if (!on || !rec || !((r: JourneyRecord) => (fieldLookup(r, "status")?.key ?? null) === "antrag_gestellt" || (fieldLookup(r, "status")?.key ?? null) === "stellungnahme" || (fieldLookup(r, "status")?.key ?? null) === "ueberarbeitung")(rec)) return;
      reportReadFailure('stellungnahme-erfassen:linked', null);
      picks.fortbildungsantraege.adopt(rec);
      targets.fortbildungsantraege.onSelect(rec.id);
      // the link named the record — start after the steps that pick it, without the start screen
      const after = Math.max(...Object.keys(targets).map(k => steps[k] ?? 1)) + 1;
      if (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') === linkedId) requestWizardStep(after);
    }).catch(() => { if (on) reportReadFailure('stellungnahme-erfassen:linked', 'fortbildungsantraege'); });
    return () => { on = false; reportReadFailure('stellungnahme-erfassen:linked', null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, [linkedId]);
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: StellungnahmeErfassenFieldKey) => {
    if (field in targets) {
      const t = targets[field as keyof typeof targets];
      return { selectedId: t.selectedId, onSelect: t.onSelect };
    }
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
  const pickMany = (field: StellungnahmeErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); setFortbildungsantraegeTargetId(null); writeJourneyExtra('stellungnahme-erfassen', 'target:fortbildungsantraege', null); mirrorRecordParam(null); };

  /** The counter-action of the changed record — `undo={flow.undo}` on <SuccessStep> (PV-15). */
  const flowUndo = fortbildungsantraegeTargetId
    ? { label: labelIn({"de": "Stellungnahme zur\u00fccknehmen", "en": "Withdraw opinion"}), run: async () => {
        const id = fortbildungsantraegeTargetId;
        await servicePort.update('fortbildungsantraege', id, UNDO_SETS);
        // the way back is a write like any other: the record's doors follow (a reopened record
        // takes submissions again, EF-58) and the overview re-reads
        if (Object.values(DOOR_PARENTS).some(d => d.entity === 'fortbildungsantraege')) await syncDoorsAfterWrite('fortbildungsantraege', id, UNDO_SETS);
        window.dispatchEvent(new CustomEvent('assistant:data-changed'));
      } }
    : undefined;
  return {
    slug: 'stellungnahme-erfassen' as const,
    draftKey: 'stellungnahme-erfassen' as const,    undo: flowUndo,    entity: 'fortbildungsantraege' as const,
    form: fortbildungsantraege,
    forms, formList, picks, submit, steps, targets,    reviewStep: STELLUNGNAHMEERFASSEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type StellungnahmeErfassenFlow = ReturnType<typeof useStellungnahmeErfassenFlow>;
