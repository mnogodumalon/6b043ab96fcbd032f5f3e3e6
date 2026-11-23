/**
 * useRueckmeldungGebenFlow — the plumbing of the flow « Rückmeldung geben », generated from the plan.
 *
 * Writes `rueckmeldungen_der_leitungskraefte`: asks `antrag`, `leitungskraft`, `entscheidung`, `kommentar`; sets `datum` itself.
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
 *   const flow = useRueckmeldungGebenFlow({
 *     steps: { antrag: 1, leitungskraft: 2, entscheidung: 3, kommentar: 3 },
 *     items: { antrag: r => ({ id: r.id, title: fieldText(r, 'titel') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.antrag.select} {...flow.pick('antrag')} />
 *     <EntitySelectStep {...flow.picks.leitungskraft.select} {...flow.pick('leitungskraft')} />
 *     <Bound form={flow.forms.rueckmeldungen_der_leitungskraefte} name="entscheidung" />
 *     <Bound form={flow.forms.rueckmeldungen_der_leitungskraefte} name="kommentar" />
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
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';

export type RueckmeldungGebenFieldKey = 'antrag' | 'entscheidung' | 'kommentar' | 'leitungskraft';

export interface RueckmeldungGebenForms {
  rueckmeldungen_der_leitungskraefte: StepForm<'rueckmeldungen_der_leitungskraefte'>;
}

// Alias so the option generics stay readable.
type Key = RueckmeldungGebenFieldKey;

export interface RueckmeldungGebenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    antrag?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    leitungskraft?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** A page-side narrowing per pick, on top of the plan's filter (J-3): the
   *  questions of the picked event, the open ones — `r => fieldRef(r, 'veranstaltung') === eventId`. */
  where?: {
    antrag?: (record: JourneyRecord) => boolean;
    leitungskraft?: (record: JourneyRecord) => boolean;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"antrag": 1, "entscheidung": 3, "kommentar": 3, "leitungskraft": 2};
export const RUECKMELDUNGGEBEN_REVIEW_STEP = 4;

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

export function useRueckmeldungGebenFlow(options: RueckmeldungGebenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const rueckmeldungen_der_leitungskraefte = useStepForm('rueckmeldungen_der_leitungskraefte', {
    fields: ["antrag", "leitungskraft", "entscheidung", "kommentar"],
    steps: only(steps, ["antrag", "leitungskraft", "entscheidung", "kommentar"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["antrag", "leitungskraft", "entscheidung", "kommentar"]),
    messages: only(options.messages as Record<string, string> | undefined, ["antrag", "leitungskraft", "entscheidung", "kommentar"]),
  });
  const forms: RueckmeldungGebenForms = { rueckmeldungen_der_leitungskraefte };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [rueckmeldungen_der_leitungskraefte];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    antrag: useRecordSearch(servicePort, 'fortbildungsantraege', withPickPolicy('antrag', {
      searchFields: ["titel"] as never,
      filter: "r.v_status == 'abstimmung'",
      where: (r: JourneyRecord) => ((fieldLookup(r, "status")?.key ?? null) === "abstimmung") && (options.where?.antrag?.(r) ?? true),
      toItem: options.items?.antrag as never,
      claim: 'rueckmeldungen_der_leitungskraefte.antrag',
    })),
    leitungskraft: useRecordSearch(servicePort, 'personen', withPickPolicy('leitungskraft', {
      searchFields: ["vorname", "nachname"] as never,
      filter: "r.v_rolle == 'leitungskraft'",
      where: (r: JourneyRecord) => ((fieldLookup(r, "rolle")?.key ?? null) === "leitungskraft") && (options.where?.leitungskraft?.(r) ?? true),
      toItem: options.items?.leitungskraft as never,
      claim: 'rueckmeldungen_der_leitungskraefte.leitungskraft',
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:rueckmeldung-geben:read:${entity}`);
  const picks = {
    antrag: { ...searches.antrag, select: { ...searches.antrag.select, create: false as boolean, hint: hintFor('antrag', 'fortbildungsantraege', {"conditions": [{"field": "status", "op": "eq", "value": "abstimmung"}], "mode": "all"} as PickWhere | null) } },
    leitungskraft: { ...searches.leitungskraft, select: { ...searches.leitungskraft.select, create: true as boolean, hint: hintFor('leitungskraft', 'personen', {"conditions": [{"field": "rolle", "op": "eq", "value": "leitungskraft"}], "mode": "all"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'rueckmeldungen_der_leitungskraefte', entity: 'rueckmeldungen_der_leitungskraefte', form: rueckmeldungen_der_leitungskraefte, label: nounOne('rueckmeldungen_der_leitungskraefte', entityLabel('rueckmeldungen_der_leitungskraefte')), primary: true,
      values: (): FormValues => ({
        datum: policyFixedValue('rueckmeldungen_der_leitungskraefte', 'datum') ?? todayIso(),
      }),
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'rueckmeldung-geben', onSuccess: (r) => {
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
    { const v = linkedParams.get('entscheidung'); if (v !== null && isEmptyValue(rueckmeldungen_der_leitungskraefte.get('entscheidung'))) (rueckmeldungen_der_leitungskraefte.set as (k: string, v: unknown) => void)('entscheidung', coerce(rueckmeldungen_der_leitungskraefte, 'entscheidung', v)); }
    { const v = linkedParams.get('kommentar'); if (v !== null && isEmptyValue(rueckmeldungen_der_leitungskraefte.get('kommentar'))) (rueckmeldungen_der_leitungskraefte.set as (k: string, v: unknown) => void)('kommentar', coerce(rueckmeldungen_der_leitungskraefte, 'kommentar', v)); }
    {
      const cur = forms.rueckmeldungen_der_leitungskraefte.get('antrag');
      const fromLink = linkedParams.get('antrag');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.rueckmeldungen_der_leitungskraefte.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('fortbildungsantraege', id).then(rec => {
        if (!on || !rec) return;
        picks.antrag.adopt(rec);
        const name = picks.antrag.labelOf(rec.id) ?? rec.id;
        (forms.rueckmeldungen_der_leitungskraefte.set as (k: string, v: unknown, l?: string) => void)('antrag', rec.id, name);
        prefillFrom('antrag', rec);
      }).catch(() => undefined);
    }
    {
      const cur = forms.rueckmeldungen_der_leitungskraefte.get('leitungskraft');
      const fromLink = linkedParams.get('leitungskraft');
      const unnamed = typeof cur === 'string' && cur !== '' && !forms.rueckmeldungen_der_leitungskraefte.labels[cur] ? cur : null;
      const id = fromLink && isEmptyValue(cur) ? fromLink : unnamed;
      if (id) void servicePort.get('personen', id).then(rec => {
        if (!on || !rec) return;
        picks.leitungskraft.adopt(rec);
        const name = picks.leitungskraft.labelOf(rec.id) ?? rec.id;
        (forms.rueckmeldungen_der_leitungskraefte.set as (k: string, v: unknown, l?: string) => void)('leitungskraft', rec.id, name);
        prefillFrom('leitungskraft', rec);
      }).catch(() => undefined);
    }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: RueckmeldungGebenFieldKey) => {
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
  const pickMany = (field: RueckmeldungGebenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'rueckmeldung-geben' as const,
    draftKey: 'rueckmeldung-geben' as const,    entity: 'rueckmeldungen_der_leitungskraefte' as const,
    form: rueckmeldungen_der_leitungskraefte,
    forms, formList, picks, submit, steps,    reviewStep: RUECKMELDUNGGEBEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type RueckmeldungGebenFlow = ReturnType<typeof useRueckmeldungGebenFlow>;
