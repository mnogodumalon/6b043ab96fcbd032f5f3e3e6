/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'standorte'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.standorte.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.standorte.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.standorte.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.standorte              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   standorte: bezeichnung  ·  ← personen (list + contextual +)
 *   personen: vorname, nachname, email, rolle, abteilung, standort  ·  → standorte · ← fortbildungsantraege (list + contextual +) · ← fortbildungsantraege (list + contextual +) · ← fortbildungsantraege (list + contextual + + choose existing) · ← rueckmeldungen_der_leitungskraefte (list + contextual +)
 *   fortbildungsantraege: antragsteller, titel, veranstalter, ort, zielgruppe, beginn, ende, arbeitsbefreiung_tage, …  ·  → personen · ← rueckmeldungen_der_leitungskraefte (list + contextual +)
 *   rueckmeldungen_der_leitungskraefte: antrag, leitungskraft, entscheidung, kommentar, datum  ·  → fortbildungsantraege · → personen
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Standorte, Personen, Fortbildungsantraege, RueckmeldungenDerLeitungskraefte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordIds } from '@/services/livingAppsService';
import { enrichPersonen, enrichFortbildungsantraege, enrichRueckmeldungenDerLeitungskraefte } from '@/lib/enrich';
import type { EnrichedPersonen, EnrichedFortbildungsantraege, EnrichedRueckmeldungenDerLeitungskraefte } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { StandorteDialog, type StandorteDialogDefaults } from '@/components/dialogs/StandorteDialog';
import { StandorteDetails } from '@/components/details/StandorteDetails';
import { PersonenDialog, type PersonenDialogDefaults } from '@/components/dialogs/PersonenDialog';
import { PersonenDetails } from '@/components/details/PersonenDetails';
import { FortbildungsantraegeDialog, type FortbildungsantraegeDialogDefaults } from '@/components/dialogs/FortbildungsantraegeDialog';
import { FortbildungsantraegeDetails } from '@/components/details/FortbildungsantraegeDetails';
import { RueckmeldungenDerLeitungskraefteDialog, type RueckmeldungenDerLeitungskraefteDialogDefaults } from '@/components/dialogs/RueckmeldungenDerLeitungskraefteDialog';
import { RueckmeldungenDerLeitungskraefteDetails } from '@/components/details/RueckmeldungenDerLeitungskraefteDetails';
import { PickExistingDialog } from '@/components/PickExistingDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { syncDoorsAfterWrite } from '@/lib/publicDoors';
import { displayNameOf, displayPart } from '@/lib/journey/rules';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'standorte'; record: Standorte }
  | { type: 'personen'; record: EnrichedPersonen }
  | { type: 'fortbildungsantraege'; record: EnrichedFortbildungsantraege }
  | { type: 'rueckmeldungenDerLeitungskraefte'; record: EnrichedRueckmeldungenDerLeitungskraefte };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  /** The action may return a sentence — the reason the step was NOT taken; the overlay shows it under the button. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void | string | Promise<void | string> } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  standorte: EntityCrudApi<Standorte, StandorteDialogDefaults>;
  personen: EntityCrudApi<Personen, PersonenDialogDefaults>;
  fortbildungsantraege: EntityCrudApi<Fortbildungsantraege, FortbildungsantraegeDialogDefaults>;
  rueckmeldungenDerLeitungskraefte: EntityCrudApi<RueckmeldungenDerLeitungskraefte, RueckmeldungenDerLeitungskraefteDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { standorte: Standorte[]; personen: EnrichedPersonen[]; fortbildungsantraege: EnrichedFortbildungsantraege[]; rueckmeldungenDerLeitungskraefte: EnrichedRueckmeldungenDerLeitungskraefte[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [standorteDialog, setStandorteDialog] = useState<{ defaults?: StandorteDialogDefaults; editing?: Standorte } | null>(null);
  const [personenDialog, setPersonenDialog] = useState<{ defaults?: PersonenDialogDefaults; editing?: Personen } | null>(null);
  const [fortbildungsantraegeDialog, setFortbildungsantraegeDialog] = useState<{ defaults?: FortbildungsantraegeDialogDefaults; editing?: Fortbildungsantraege } | null>(null);
  const [rueckmeldungenDerLeitungskraefteDialog, setRueckmeldungenDerLeitungskraefteDialog] = useState<{ defaults?: RueckmeldungenDerLeitungskraefteDialogDefaults; editing?: RueckmeldungenDerLeitungskraefte } | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug fortbildungsantraege.weitere_leitungskraefte → personen: hält die Hub-record_id.
  const [pickPersonenFortbildungsantraegeWeitereLeitungskraefte, setPickPersonenFortbildungsantraegeWeitereLeitungskraefte] = useState<string | null>(null);
  const enrichedPersonen = useMemo(() => enrichPersonen(data.personen, { standorteMap: data.standorteMap }), [data.personen, data.standorteMap]);
  const enrichedFortbildungsantraege = useMemo(() => enrichFortbildungsantraege(data.fortbildungsantraege, { personenMap: data.personenMap }), [data.fortbildungsantraege, data.personenMap]);
  const enrichedRueckmeldungenDerLeitungskraefte = useMemo(() => enrichRueckmeldungenDerLeitungskraefte(data.rueckmeldungenDerLeitungskraefte, { fortbildungsantraegeMap: data.fortbildungsantraegeMap, personenMap: data.personenMap }), [data.rueckmeldungenDerLeitungskraefte, data.fortbildungsantraegeMap, data.personenMap]);

  function detailStandorte(record: Standorte, push = false) {
    const item: OverlayItem = { type: 'standorte', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitStandorte(fields: Standorte['fields']) {
    const editing = standorteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setStandorte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateStandorteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('standorte')} — ${t('crud_updated')}`, async () => {
        data.setStandorte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateStandorteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
      void syncDoorsAfterWrite('standorte', editing.record_id, fields as Record<string, unknown>);
    } else {
      const made = await LivingAppsService.createStandorteEntry(fields);
      undoToast(`${appLabel('standorte')} — ${t('crud_created')}`);
      // EF-51: a new parent record gets its pair of doors right away (the record's own link)
      const madeId = (made as { id?: string; record_id?: string } | undefined)?.id ?? (made as { record_id?: string } | undefined)?.record_id;
      if (madeId) void syncDoorsAfterWrite('standorte', madeId, fields as Record<string, unknown>).then(r => { if (!r.ok) toast.error(r.message ? `${t('door_failed')}: ${r.message}` : t('door_failed_later')); });
      data.fetchAll();
    }
  }

  function detailPersonen(record: Personen, push = false) {
    const rec = enrichedPersonen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'personen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitPersonen(fields: Personen['fields']) {
    const editing = personenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setPersonen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updatePersonenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('personen')} — ${t('crud_updated')}`, async () => {
        data.setPersonen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updatePersonenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
      void syncDoorsAfterWrite('personen', editing.record_id, fields as Record<string, unknown>);
    } else {
      const made = await LivingAppsService.createPersonenEntry(fields);
      undoToast(`${appLabel('personen')} — ${t('crud_created')}`);
      // EF-51: a new parent record gets its pair of doors right away (the record's own link)
      const madeId = (made as { id?: string; record_id?: string } | undefined)?.id ?? (made as { record_id?: string } | undefined)?.record_id;
      if (madeId) void syncDoorsAfterWrite('personen', madeId, fields as Record<string, unknown>).then(r => { if (!r.ok) toast.error(r.message ? `${t('door_failed')}: ${r.message}` : t('door_failed_later')); });
      data.fetchAll();
    }
  }

  // Link an EXISTING Fortbildungsantraege to the Personen hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkPersonenFortbildungsantraegeWeitereLeitungskraefte(sourceId: string) {
    const hub = pickPersonenFortbildungsantraegeWeitereLeitungskraefte;
    const src = data.fortbildungsantraege.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.weitere_leitungskraefte);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.PERSONEN, id));
    data.setFortbildungsantraege(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, weitere_leitungskraefte: next } } : r)));
    try {
      await LivingAppsService.updateFortbildungsantraegeEntry(sourceId, { weitere_leitungskraefte: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('fortbildungsantraege')} — ${t('pick_linked')}`, async () => {
      data.setFortbildungsantraege(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateFortbildungsantraegeEntry(sourceId, { weitere_leitungskraefte: src.fields.weitere_leitungskraefte }); } catch { data.fetchAll(); }
    });
  }

  function detailFortbildungsantraege(record: Fortbildungsantraege, push = false) {
    const rec = enrichedFortbildungsantraege.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'fortbildungsantraege', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitFortbildungsantraege(fields: Fortbildungsantraege['fields']) {
    const editing = fortbildungsantraegeDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setFortbildungsantraege(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateFortbildungsantraegeEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('fortbildungsantraege')} — ${t('crud_updated')}`, async () => {
        data.setFortbildungsantraege(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateFortbildungsantraegeEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
      void syncDoorsAfterWrite('fortbildungsantraege', editing.record_id, fields as Record<string, unknown>);
    } else {
      const made = await LivingAppsService.createFortbildungsantraegeEntry(fields);
      undoToast(`${appLabel('fortbildungsantraege')} — ${t('crud_created')}`);
      // EF-51: a new parent record gets its pair of doors right away (the record's own link)
      const madeId = (made as { id?: string; record_id?: string } | undefined)?.id ?? (made as { record_id?: string } | undefined)?.record_id;
      if (madeId) void syncDoorsAfterWrite('fortbildungsantraege', madeId, fields as Record<string, unknown>).then(r => { if (!r.ok) toast.error(r.message ? `${t('door_failed')}: ${r.message}` : t('door_failed_later')); });
      data.fetchAll();
    }
  }

  function detailRueckmeldungenDerLeitungskraefte(record: RueckmeldungenDerLeitungskraefte, push = false) {
    const rec = enrichedRueckmeldungenDerLeitungskraefte.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'rueckmeldungenDerLeitungskraefte', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitRueckmeldungenDerLeitungskraefte(fields: RueckmeldungenDerLeitungskraefte['fields']) {
    const editing = rueckmeldungenDerLeitungskraefteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setRueckmeldungenDerLeitungskraefte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateRueckmeldungenDerLeitungskraefteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('rueckmeldungen_der_leitungskraefte')} — ${t('crud_updated')}`, async () => {
        data.setRueckmeldungenDerLeitungskraefte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateRueckmeldungenDerLeitungskraefteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
      void syncDoorsAfterWrite('rueckmeldungen_der_leitungskraefte', editing.record_id, fields as Record<string, unknown>);
    } else {
      const made = await LivingAppsService.createRueckmeldungenDerLeitungskraefteEntry(fields);
      undoToast(`${appLabel('rueckmeldungen_der_leitungskraefte')} — ${t('crud_created')}`);
      // EF-51: a new parent record gets its pair of doors right away (the record's own link)
      const madeId = (made as { id?: string; record_id?: string } | undefined)?.id ?? (made as { record_id?: string } | undefined)?.record_id;
      if (madeId) void syncDoorsAfterWrite('rueckmeldungen_der_leitungskraefte', madeId, fields as Record<string, unknown>).then(r => { if (!r.ok) toast.error(r.message ? `${t('door_failed')}: ${r.message}` : t('door_failed_later')); });
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <StandorteDialog
        open={standorteDialog !== null}
        onClose={() => setStandorteDialog(null)}
        onSubmit={submitStandorte}
        defaultValues={standorteDialog?.defaults}
        recordId={standorteDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Standorte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Standorte']}
      />
      <PersonenDialog
        open={personenDialog !== null}
        onClose={() => setPersonenDialog(null)}
        onSubmit={submitPersonen}
        defaultValues={personenDialog?.defaults}
        recordId={personenDialog?.editing?.record_id}
        standorteList={data.standorte}
        enablePhotoScan={AI_PHOTO_SCAN['Personen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Personen']}
      />
      <FortbildungsantraegeDialog
        open={fortbildungsantraegeDialog !== null}
        onClose={() => setFortbildungsantraegeDialog(null)}
        onSubmit={submitFortbildungsantraege}
        defaultValues={fortbildungsantraegeDialog?.defaults}
        recordId={fortbildungsantraegeDialog?.editing?.record_id}
        personenList={data.personen}
        enablePhotoScan={AI_PHOTO_SCAN['Fortbildungsantraege']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Fortbildungsantraege']}
      />
      <RueckmeldungenDerLeitungskraefteDialog
        open={rueckmeldungenDerLeitungskraefteDialog !== null}
        onClose={() => setRueckmeldungenDerLeitungskraefteDialog(null)}
        onSubmit={submitRueckmeldungenDerLeitungskraefte}
        defaultValues={rueckmeldungenDerLeitungskraefteDialog?.defaults}
        recordId={rueckmeldungenDerLeitungskraefteDialog?.editing?.record_id}
        fortbildungsantraegeList={data.fortbildungsantraege}
        personenList={data.personen}
        enablePhotoScan={AI_PHOTO_SCAN['RueckmeldungenDerLeitungskraefte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['RueckmeldungenDerLeitungskraefte']}
      />
      <PickExistingDialog
        open={pickPersonenFortbildungsantraegeWeitereLeitungskraefte !== null}
        onClose={() => setPickPersonenFortbildungsantraegeWeitereLeitungskraefte(null)}
        title={t('pick_title', { title: appLabel('fortbildungsantraege') })}
        items={data.fortbildungsantraege
          .filter(r => !extractRecordIds(r.fields.weitere_leitungskraefte).includes(pickPersonenFortbildungsantraegeWeitereLeitungskraefte ?? ''))
          .map(r => ({ id: r.record_id, label: String(displayNameOf('fortbildungsantraege', r.fields as Record<string, unknown>) || appLabel('fortbildungsantraege')), hint: displayPart(r.fields.beginn) ? String(displayPart(r.fields.beginn)) : undefined }))}
        onPick={linkPersonenFortbildungsantraegeWeitereLeitungskraefte}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'standorte') {
            return (
              <>
                <RecordHeader title={displayNameOf('standorte', top.record.fields as Record<string, unknown>) || appLabel('standorte')} subtitle={undefined} />
                <StandorteDetails
                  record={top.record}
                  personenList={data.personen}
                  onOpenPersonen={(r) => detailPersonen(r, true)}
                  onAddPersonen={perms.canWrite('personen') ? () => setPersonenDialog({ defaults: { standort: createRecordUrl(APP_IDS.STANDORTE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'personen') {
            return (
              <>
                <RecordHeader title={displayNameOf('personen', top.record.fields as Record<string, unknown>) || appLabel('personen')} subtitle={undefined} />
                <PersonenDetails
                  record={top.record}
                  standorteList={data.standorte}
                  onOpenStandorte={(r) => detailStandorte(r, true)}
                  fortbildungsantraegeAntragstellerList={data.fortbildungsantraege}
                  onOpenFortbildungsantraegeAntragsteller={(r) => detailFortbildungsantraege(r, true)}
                  onAddFortbildungsantraegeAntragsteller={perms.canWrite('fortbildungsantraege') ? () => setFortbildungsantraegeDialog({ defaults: { antragsteller: createRecordUrl(APP_IDS.PERSONEN, top.record.record_id) } }) : undefined}
                  fortbildungsantraegeLeitungskraftList={data.fortbildungsantraege}
                  onOpenFortbildungsantraegeLeitungskraft={(r) => detailFortbildungsantraege(r, true)}
                  onAddFortbildungsantraegeLeitungskraft={perms.canWrite('fortbildungsantraege') ? () => setFortbildungsantraegeDialog({ defaults: { leitungskraft: createRecordUrl(APP_IDS.PERSONEN, top.record.record_id) } }) : undefined}
                  fortbildungsantraegeWeitereLeitungskraefteList={data.fortbildungsantraege}
                  onOpenFortbildungsantraegeWeitereLeitungskraefte={(r) => detailFortbildungsantraege(r, true)}
                  onAddFortbildungsantraegeWeitereLeitungskraefte={perms.canWrite('fortbildungsantraege') ? () => setFortbildungsantraegeDialog({ defaults: { weitere_leitungskraefte: [createRecordUrl(APP_IDS.PERSONEN, top.record.record_id)] } }) : undefined}
                  onPickFortbildungsantraegeWeitereLeitungskraefte={perms.canWrite('fortbildungsantraege') ? () => setPickPersonenFortbildungsantraegeWeitereLeitungskraefte(top.record.record_id) : undefined}
                  rueckmeldungenDerLeitungskraefteList={data.rueckmeldungenDerLeitungskraefte}
                  onOpenRueckmeldungenDerLeitungskraefte={(r) => detailRueckmeldungenDerLeitungskraefte(r, true)}
                  onAddRueckmeldungenDerLeitungskraefte={perms.canWrite('rueckmeldungen_der_leitungskraefte') ? () => setRueckmeldungenDerLeitungskraefteDialog({ defaults: { leitungskraft: createRecordUrl(APP_IDS.PERSONEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'fortbildungsantraege') {
            return (
              <>
                <RecordHeader title={displayNameOf('fortbildungsantraege', top.record.fields as Record<string, unknown>) || appLabel('fortbildungsantraege')} subtitle={top.record.fields.beginn ? formatDate(top.record.fields.beginn) : undefined} />
                <FortbildungsantraegeDetails
                  record={top.record}
                  personenList={data.personen}
                  onOpenPersonen={(r) => detailPersonen(r, true)}
                  rueckmeldungenDerLeitungskraefteList={data.rueckmeldungenDerLeitungskraefte}
                  onOpenRueckmeldungenDerLeitungskraefte={(r) => detailRueckmeldungenDerLeitungskraefte(r, true)}
                  onAddRueckmeldungenDerLeitungskraefte={perms.canWrite('rueckmeldungen_der_leitungskraefte') ? () => setRueckmeldungenDerLeitungskraefteDialog({ defaults: { antrag: createRecordUrl(APP_IDS.FORTBILDUNGSANTRAEGE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'rueckmeldungenDerLeitungskraefte') {
            return (
              <>
                <RecordHeader title={displayNameOf('rueckmeldungen_der_leitungskraefte', top.record.fields as Record<string, unknown>) || appLabel('rueckmeldungen_der_leitungskraefte')} subtitle={top.record.fields.datum ? formatDate(top.record.fields.datum) : undefined} />
                <RueckmeldungenDerLeitungskraefteDetails
                  record={top.record}
                  fortbildungsantraegeList={data.fortbildungsantraege}
                  onOpenFortbildungsantraege={(r) => detailFortbildungsantraege(r, true)}
                  personenList={data.personen}
                  onOpenPersonen={(r) => detailPersonen(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'standorte') return perms.canWrite('standorte');
          if (top.type === 'personen') return perms.canWrite('personen');
          if (top.type === 'fortbildungsantraege') return perms.canWrite('fortbildungsantraege');
          if (top.type === 'rueckmeldungenDerLeitungskraefte') return perms.canWrite('rueckmeldungen_der_leitungskraefte');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'standorte') setStandorteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'personen') setPersonenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'fortbildungsantraege') setFortbildungsantraegeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'rueckmeldungenDerLeitungskraefte') setRueckmeldungenDerLeitungskraefteDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    standorte: {
      openCreate: (defaults?: StandorteDialogDefaults) => (perms.canWrite('standorte') ? setStandorteDialog({ defaults }) : refuse()),
      openEdit: (record: Standorte) => (perms.canWrite('standorte') ? setStandorteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Standorte) => detailStandorte(record, false),
      canWrite: perms.canWrite('standorte'),
    },
    personen: {
      openCreate: (defaults?: PersonenDialogDefaults) => (perms.canWrite('personen') ? setPersonenDialog({ defaults }) : refuse()),
      openEdit: (record: Personen) => (perms.canWrite('personen') ? setPersonenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Personen) => detailPersonen(record, false),
      canWrite: perms.canWrite('personen'),
    },
    fortbildungsantraege: {
      openCreate: (defaults?: FortbildungsantraegeDialogDefaults) => (perms.canWrite('fortbildungsantraege') ? setFortbildungsantraegeDialog({ defaults }) : refuse()),
      openEdit: (record: Fortbildungsantraege) => (perms.canWrite('fortbildungsantraege') ? setFortbildungsantraegeDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Fortbildungsantraege) => detailFortbildungsantraege(record, false),
      canWrite: perms.canWrite('fortbildungsantraege'),
    },
    rueckmeldungenDerLeitungskraefte: {
      openCreate: (defaults?: RueckmeldungenDerLeitungskraefteDialogDefaults) => (perms.canWrite('rueckmeldungen_der_leitungskraefte') ? setRueckmeldungenDerLeitungskraefteDialog({ defaults }) : refuse()),
      openEdit: (record: RueckmeldungenDerLeitungskraefte) => (perms.canWrite('rueckmeldungen_der_leitungskraefte') ? setRueckmeldungenDerLeitungskraefteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: RueckmeldungenDerLeitungskraefte) => detailRueckmeldungenDerLeitungskraefte(record, false),
      canWrite: perms.canWrite('rueckmeldungen_der_leitungskraefte'),
    },
    enriched: { standorte: data.standorte, personen: enrichedPersonen, fortbildungsantraege: enrichedFortbildungsantraege, rueckmeldungenDerLeitungskraefte: enrichedRueckmeldungenDerLeitungskraefte },
  };
}
