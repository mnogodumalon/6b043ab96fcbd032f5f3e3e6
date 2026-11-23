/**
 * FortbildungsantraegeDialog — pre-generated create/edit dialog for Fortbildungsantraege.
 *
 * Props: open, onClose, onSubmit(fields) => Promise<void>, defaultValues?,
 * recordId? (pass when EDITING — enables the attachments section),
 * personenList (full hook array — resolves the Personen applookup),
 * enablePhotoScan?, enablePhotoLocation?.
 *
 * defaultValues is SHAPE-TOLERANT and its prop type is the EXPORTED
 * FortbildungsantraegeDialogDefaults — NOT the entity field type: lookup fields accept
 * the bare KEY string (or LookupValue), applookup fields the bare record id
 * (or record URL); the dialog normalizes. Type prefill STATE with the export:
 *  ❌ useState<Partial<Fortbildungsantraege['fields']>>({ … })   // LookupValue fields reject string prefills (TS2322)
 *  ✓ useState<FortbildungsantraegeDialogDefaults | undefined>(undefined)
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Fortbildungsantraege, Personen, LookupValue } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, extractRecordIds, uploadFile, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef, dialogLabel, dropHidden } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Fortbildungsantraege';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { requiredMessage } from '@/lib/journey/messages';
import { displayNameOf } from '@/lib/journey/rules';
import { t, appLabel, fieldLabel, lookupLabel, localeTag, CURRENCY } from '@/i18n';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox, MultiCombobox } from '@/components/Combobox';
import { PersonenDialog } from '@/components/dialogs/PersonenDialog';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircle, IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

/** Widened prefill type for FortbildungsantraegeDialog.defaultValues — see file header. */
export type FortbildungsantraegeDialogDefaults = Omit<Fortbildungsantraege['fields'], 'status' | 'genehmigung_vorschlag' | 'kategorie' | 'zahlungsart'> & {
    status?: LookupValue | string;
    genehmigung_vorschlag?: LookupValue | string;
    kategorie?: LookupValue | string;
    zahlungsart?: LookupValue | string;
  };

interface FortbildungsantraegeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Fortbildungsantraege['fields']) => Promise<void>;
  /** SHAPE-TOLERANT: lookup fields accept the bare key (string) or the
   *  LookupValue object; applookup fields the bare record id or the full
   *  record URL — the dialog normalizes both. */
  defaultValues?: FortbildungsantraegeDialogDefaults;
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  personenList: Personen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

// defaultValues are SHAPE-TOLERANT: the dialog resolves bare lookup keys via
// its own options and bare record ids via the field's target app — consumers
// never carry the LookupValue/record-URL shape in their head.
const NORMALIZE_LOOKUPS: Record<string, readonly { key: string; label: string }[]> = {
  status: LOOKUP_OPTIONS['fortbildungsantraege']?.['status'] ?? [],
  genehmigung_vorschlag: LOOKUP_OPTIONS['fortbildungsantraege']?.['genehmigung_vorschlag'] ?? [],
  kategorie: LOOKUP_OPTIONS['fortbildungsantraege']?.['kategorie'] ?? [],
  zahlungsart: LOOKUP_OPTIONS['fortbildungsantraege']?.['zahlungsart'] ?? [],
};
const NORMALIZE_APPLOOKUPS: Record<string, string> = {
  antragsteller: APP_IDS.PERSONEN,
  leitungskraft: APP_IDS.PERSONEN,
  weitere_leitungskraefte: APP_IDS.PERSONEN,
};
function normalizeDefaults(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [k, opts] of Object.entries(NORMALIZE_LOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string') out[k] = opts.find(o => o.key === v) ?? { key: v, label: v };
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' ? opts.find(o => o.key === x) ?? { key: x, label: x } : x));
  }
  for (const [k, appId] of Object.entries(NORMALIZE_APPLOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string' && v !== '' && !v.startsWith('http')) out[k] = createRecordUrl(appId, v);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' && x !== '' && !x.startsWith('http') ? createRecordUrl(appId, x) : x));
  }
  return out;
}

export function FortbildungsantraegeDialog({ open, onClose, onSubmit, defaultValues, recordId, personenList, enablePhotoScan = true, enablePhotoLocation = true }: FortbildungsantraegeDialogProps) {
  const [fields, setFields] = useState<Partial<Fortbildungsantraege['fields']>>({});
  const [saving, setSaving] = useState(false);
  const normalizedDefaults = useMemo<Record<string, unknown> | undefined>(
    () => (defaultValues ? normalizeDefaults(defaultValues as Record<string, unknown>) : undefined),
    [defaultValues],
  );
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!normalizedDefaults) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(normalizedDefaults);
    } catch {
      return true;
    }
  }, [fields, normalizedDefaults]);
  // Inline-Create state for "Personen" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraPersonen` list, and select it in
  // the originating Combobox via the captured `createPersonenField`.
  const [createPersonenOpen, setCreatePersonenOpen] = useState(false);
  const [createPersonenInitial, setCreatePersonenInitial] = useState('');
  const [createPersonenField, setCreatePersonenField] = useState<string>('');
  const [extraPersonen, setExtraPersonen] = useState< Personen[]>([]);
  const personenListAll = useMemo(
    () => [...personenList, ...extraPersonen],
    [personenList, extraPersonen],
  );
  function openCreatePersonen(fieldKey: string, q: string) {
    setCreatePersonenField(fieldKey);
    setCreatePersonenInitial(q);
    setCreatePersonenOpen(true);
  }
  // Fields the plan assigns to a tool (empty without a plan).
  const SYSTEM_ASSIGNED: string[] = [];
  const PLAN_CREATE_PRESETS: Record<string, unknown> = {"status": "antrag_gestellt"};
  const [showErrors, setShowErrors] = useState(false);
  const REQUIRED_FIELDS = ['antragsteller', 'titel', 'veranstalter', 'ort', 'beginn', 'ende', 'gesamtkosten', 'leitungskraft', 'status'] as const;
  const missingRequired = REQUIRED_FIELDS.filter(k => {
    const v = (fields as Record<string, unknown>)[k];
    return v == null || v === '' || (Array.isArray(v) && v.length === 0);
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      'antragsteller': personenList,
      'leitungskraft': personenList,
      'weitere_leitungskraefte': personenList,
    },
  }), [personenList, personenList, personenList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults({ ...(recordId ? {} : normalizeDefaults(PLAN_CREATE_PRESETS)), ...(normalizedDefaults ?? {}) }, formEnhancements.defaults) as Partial<Fortbildungsantraege['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
      setSubmitError(null);
    }
  }, [open, normalizedDefaults]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  // Submit errors surface IN the dialog (it is modal — a banner in the page
  // body would be hidden behind it). A consumer onSubmit that THROWS (the
  // documented "throw to prevent closing" validation pattern) lands here:
  // the dialog stays open, nothing is saved, the message is visible.
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missingRequired.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'fortbildungsantraege');
      await onSubmit(clean as Fortbildungsantraege['fields']);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : t('submit_error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="antragsteller" entity="Personen">\n${JSON.stringify(personenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="leitungskraft" entity="Personen">\n${JSON.stringify(personenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="weitere_leitungskraefte" entity="Personen">\n${JSON.stringify(personenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "antragsteller": string | null, // Display name from Personen (see <available-records>)\n  "titel": string | null, // Titel der Veranstaltung\n  "veranstalter": string | null, // Veranstalter\n  "ort": string | null, // Ort der Veranstaltung oder digitales Format\n  "zielgruppe": string | null, // Zielgruppe\n  "beginn": string | null, // YYYY-MM-DDTHH:MM\n  "ende": string | null, // YYYY-MM-DDTHH:MM\n  "arbeitsbefreiung_tage": number | null, // Arbeitsbefreiung in Tagen\n  "arbeitsbefreiung_stunden": number | null, // Arbeitsbefreiung in Stunden\n  "kosten_unterkunft_verpflegung": number | null, // Kosten Unterkunft und Verpflegung (€)\n  "kursgebuehren": number | null, // Kursgebühren (€)\n  "fahrtkosten": number | null, // Fahrtkosten (€)\n  "gesamtkosten": number | null, // Gesamtkosten (€)\n  "ausschreibung_link": string | null, // Link zur Ausschreibung\n  "leitungskraft": string | null, // Display name from Personen (see <available-records>)\n  "weitere_leitungskraefte": string[] | null, // Display names from Personen, one per referenced record (see <available-records>)\n  "status": LookupValue | null, // Status (select one key: "antrag_gestellt" | "stellungnahme" | "abstimmung" | "ueberarbeitung" | "genehmigt" | "abgelehnt" | "abrechnung" | "zahlung_offen" | "abgeschlossen") mapping: antrag_gestellt=Antrag gestellt, stellungnahme=Stellungnahme Vorgesetzte/r, abstimmung=Abstimmung Leitungskräfte, ueberarbeitung=Überarbeitung, genehmigt=Genehmigt, abgelehnt=Abgelehnt, abrechnung=Abrechnung, zahlung_offen=Zahlung offen, abgeschlossen=Abgeschlossen\n  "genehmigung_vorschlag": LookupValue | null, // Genehmigung (select one key: "ja" | "nein") mapping: ja=Ja, nein=Nein\n  "kategorie": LookupValue | null, // Fortbildungskategorie (select one key: "kategorie_1" | "kategorie_2" | "kategorie_3" | "fachtag") mapping: kategorie_1=Kategorie 1, kategorie_2=Kategorie 2, kategorie_3=Kategorie 3, fachtag=Fachtag\n  "fortbildungstage": number | null, // Fortbildungstage (Tage)\n  "fortbildungsstunden": number | null, // Fortbildungsstunden\n  "dienstbefreiung_tage": number | null, // Dienstbefreiung in Tagen\n  "dienstbefreiung_stunden": number | null, // Dienstbefreiung in Stunden\n  "kostenuebernahme": number | null, // Kostenübernahme in Höhe von (€)\n  "eigenanteil": number | null, // Eigenanteil (€)\n  "restanspruch_tage": number | null, // Restanspruch Fortbildungstage (2 Jahre)\n  "beginn_zeitraum": string | null, // YYYY-MM-DD\n  "bemerkung": string | null, // Bemerkung\n  "genehmigt_am": string | null, // YYYY-MM-DD\n  "mitteilung_antragsteller": boolean | null, // Antragsteller/in wurde informiert (inkl. verbleibender Fortbildungstage)\n  "tatsaechliche_kosten": number | null, // Tatsächliche Gesamtkosten (€)\n  "abrechnung_datum": string | null, // YYYY-MM-DD\n  "abrechnung_bemerkung": string | null, // Bemerkung zur Abrechnung\n  "zahlungsart": LookupValue | null, // Zahlungsart (select one key: "eigenanteil_anfordern" | "restbetrag_ueberweisen" | "keine_zahlung") mapping: eigenanteil_anfordern=Eigenanteil wird angefordert, restbetrag_ueberweisen=Restbetrag wird überwiesen, keine_zahlung=Keine Zahlung nötig\n  "zahlungsbetrag": number | null, // Zahlungsbetrag (€)\n  "zahlungseingang": boolean | null, // Zahlung eingegangen bzw. erfolgt\n  "zahlungseingang_datum": string | null, // YYYY-MM-DD\n  "abschluss_datum": string | null, // YYYY-MM-DD\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["antragsteller", "leitungskraft", "weitere_leitungskraefte"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const antragstellerName = raw['antragsteller'] as string | null;
        if (antragstellerName) {
          const antragstellerMatch = personenList.find(r => matchName(antragstellerName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (antragstellerMatch) merged['antragsteller'] = createRecordUrl(APP_IDS.PERSONEN, antragstellerMatch.record_id);
        }
        const leitungskraftName = raw['leitungskraft'] as string | null;
        if (leitungskraftName) {
          const leitungskraftMatch = personenList.find(r => matchName(leitungskraftName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (leitungskraftMatch) merged['leitungskraft'] = createRecordUrl(APP_IDS.PERSONEN, leitungskraftMatch.record_id);
        }
        const weitere_leitungskraefteNames = raw['weitere_leitungskraefte'];
        if (Array.isArray(weitere_leitungskraefteNames) && weitere_leitungskraefteNames.length > 0) {
          const weitere_leitungskraefteUrls = (weitere_leitungskraefteNames as unknown[])
            .map(n => personenList.find(r => matchName(String(n), [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')])))
            .filter((r): r is NonNullable<typeof r> => Boolean(r))
            .map(r => createRecordUrl(APP_IDS.PERSONEN, r.record_id));
          if (weitere_leitungskraefteUrls.length > 0) merged['weitere_leitungskraefte'] = weitere_leitungskraefteUrls;
        }
        return merged as Partial<Fortbildungsantraege['fields']>;
      });
      // Upload scanned file to file fields
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        try {
          const blob = dataUriToBlob(uri!);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, ausschreibung: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error(`${t('scan_error')}:`, err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  // EDIT is a record, not a prefill: openCreate(defaults) used to read „bearbeiten“
  // (acceptance 4, L-42) because the title keyed on defaultValues
  const DIALOG_INTENT = recordId
    ? (formEnhancements.title?.edit ?? t('edit_entity', { entity: appLabel('fortbildungsantraege') }))
    : (formEnhancements.title?.create ?? t('new_entity', { entity: appLabel('fortbildungsantraege') }));
  // the dialog's word for a field — the config may rename it (S-3)
  const labelFor = (k: string) => dialogLabel(formEnhancements, k, fieldLabel('fortbildungsantraege', k));

  const fieldBlocks: Record<string, React.ReactNode> = {
    'antragsteller': (
      <div key="antragsteller" className="space-y-1.5">
        <Label htmlFor="antragsteller">{labelFor('antragsteller')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Combobox
          id="antragsteller"
          placeholder="Wer beantragt?"
          items={personenListAll.map(r => ({
            id: r.record_id,
            label: displayNameOf('personen', r.fields as Record<string, unknown>) || r.record_id,
          }))}
          value={extractRecordId(fields.antragsteller)}
          onChange={id => setFields(f => ({ ...f, antragsteller: id ? createRecordUrl(APP_IDS.PERSONEN, id) : undefined }))}
          onCreateNew={(q) => openCreatePersonen("antragsteller", q)}
          createLabel={t('create_in', { entity: appLabel('personen') })}
        />
        {showErrors && !fields.antragsteller && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('fortbildungsantraege', 'antragsteller')}</p>
        )}
      </div>
    ),
    'titel': (
      <div key="titel" className="space-y-1.5">
        <Label htmlFor="titel">{labelFor('titel')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="titel"
          placeholder="z. B. Erste Hilfe für Teams"
          value={fields.titel ?? ''}
          onChange={e => setFields(f => ({ ...f, titel: e.target.value }))}
          required
        />
        {showErrors && !fields.titel && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('fortbildungsantraege', 'titel')}</p>
        )}
      </div>
    ),
    'veranstalter': (
      <div key="veranstalter" className="space-y-1.5">
        <Label htmlFor="veranstalter">{labelFor('veranstalter')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="veranstalter"
          placeholder="z. B. Bildungswerk Nord"
          value={fields.veranstalter ?? ''}
          onChange={e => setFields(f => ({ ...f, veranstalter: e.target.value }))}
          required
        />
        {showErrors && !fields.veranstalter && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('fortbildungsantraege', 'veranstalter')}</p>
        )}
      </div>
    ),
    'ort': (
      <div key="ort" className="space-y-1.5">
        <Label htmlFor="ort">{labelFor('ort')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="ort"
          placeholder="z. B. Hamburg oder online"
          value={fields.ort ?? ''}
          onChange={e => setFields(f => ({ ...f, ort: e.target.value }))}
          required
        />
        {showErrors && !fields.ort && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('fortbildungsantraege', 'ort')}</p>
        )}
      </div>
    ),
    'zielgruppe': (
      <div key="zielgruppe" className="space-y-1.5">
        <Label htmlFor="zielgruppe">{labelFor('zielgruppe')}</Label>
        <Input
          id="zielgruppe"
          placeholder="z. B. Fachkräfte"
          value={fields.zielgruppe ?? ''}
          onChange={e => setFields(f => ({ ...f, zielgruppe: e.target.value }))}
        />
      </div>
    ),
    'beginn': (
      <div key="beginn" className="space-y-1.5">
        <Label htmlFor="beginn">{labelFor('beginn')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <DatePicker
          id="beginn"
          placeholder="Wann beginnt die Fortbildung?"
          mode="datetime"
          value={fields.beginn ?? null}
          onChange={v => setFields(f => ({ ...f, beginn: v ?? undefined }))}
          required
        />
        {showErrors && !fields.beginn && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('fortbildungsantraege', 'beginn')}</p>
        )}
      </div>
    ),
    'ende': (
      <div key="ende" className="space-y-1.5">
        <Label htmlFor="ende">{labelFor('ende')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <DatePicker
          id="ende"
          placeholder="Wann endet sie?"
          mode="datetime"
          value={fields.ende ?? null}
          onChange={v => setFields(f => ({ ...f, ende: v ?? undefined }))}
          required
        />
        {showErrors && !fields.ende && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('fortbildungsantraege', 'ende')}</p>
        )}
      </div>
    ),
    'arbeitsbefreiung_tage': (
      <div key="arbeitsbefreiung_tage" className="space-y-1.5">
        <Label htmlFor="arbeitsbefreiung_tage">{labelFor('arbeitsbefreiung_tage')}</Label>
        <Input
          id="arbeitsbefreiung_tage"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'arbeitsbefreiung_tage')}
          placeholder="z. B. 2"
          value={fields.arbeitsbefreiung_tage !== undefined ? fields.arbeitsbefreiung_tage : (computedValues['arbeitsbefreiung_tage'] ?? '')}
          onChange={e => setFields(f => ({ ...f, arbeitsbefreiung_tage: clampNumberValue(formEnhancements, 'arbeitsbefreiung_tage', e.target.value) }))}
        />
      </div>
    ),
    'arbeitsbefreiung_stunden': (
      <div key="arbeitsbefreiung_stunden" className="space-y-1.5">
        <Label htmlFor="arbeitsbefreiung_stunden">{labelFor('arbeitsbefreiung_stunden')}</Label>
        <Input
          id="arbeitsbefreiung_stunden"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'arbeitsbefreiung_stunden')}
          placeholder="z. B. 16"
          value={fields.arbeitsbefreiung_stunden !== undefined ? fields.arbeitsbefreiung_stunden : (computedValues['arbeitsbefreiung_stunden'] ?? '')}
          onChange={e => setFields(f => ({ ...f, arbeitsbefreiung_stunden: clampNumberValue(formEnhancements, 'arbeitsbefreiung_stunden', e.target.value) }))}
        />
      </div>
    ),
    'kosten_unterkunft_verpflegung': (
      <div key="kosten_unterkunft_verpflegung" className="space-y-1.5">
        <Label htmlFor="kosten_unterkunft_verpflegung">{labelFor('kosten_unterkunft_verpflegung')}</Label>
        <Input
          id="kosten_unterkunft_verpflegung"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'kosten_unterkunft_verpflegung')}
          placeholder="z. B. 180"
          value={fields.kosten_unterkunft_verpflegung !== undefined ? fields.kosten_unterkunft_verpflegung : (computedValues['kosten_unterkunft_verpflegung'] ?? '')}
          onChange={e => setFields(f => ({ ...f, kosten_unterkunft_verpflegung: clampNumberValue(formEnhancements, 'kosten_unterkunft_verpflegung', e.target.value) }))}
        />
      </div>
    ),
    'kursgebuehren': (
      <div key="kursgebuehren" className="space-y-1.5">
        <Label htmlFor="kursgebuehren">{labelFor('kursgebuehren')}</Label>
        <Input
          id="kursgebuehren"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'kursgebuehren')}
          placeholder="z. B. 450"
          value={fields.kursgebuehren !== undefined ? fields.kursgebuehren : (computedValues['kursgebuehren'] ?? '')}
          onChange={e => setFields(f => ({ ...f, kursgebuehren: clampNumberValue(formEnhancements, 'kursgebuehren', e.target.value) }))}
        />
      </div>
    ),
    'fahrtkosten': (
      <div key="fahrtkosten" className="space-y-1.5">
        <Label htmlFor="fahrtkosten">{labelFor('fahrtkosten')}</Label>
        <Input
          id="fahrtkosten"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'fahrtkosten')}
          placeholder="z. B. 60"
          value={fields.fahrtkosten !== undefined ? fields.fahrtkosten : (computedValues['fahrtkosten'] ?? '')}
          onChange={e => setFields(f => ({ ...f, fahrtkosten: clampNumberValue(formEnhancements, 'fahrtkosten', e.target.value) }))}
        />
      </div>
    ),
    'gesamtkosten': (
      <div key="gesamtkosten" className="space-y-1.5">
        <Label htmlFor="gesamtkosten">{labelFor('gesamtkosten')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="gesamtkosten"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'gesamtkosten')}
          placeholder="z. B. 690"
          value={fields.gesamtkosten !== undefined ? fields.gesamtkosten : (computedValues['gesamtkosten'] ?? '')}
          onChange={e => setFields(f => ({ ...f, gesamtkosten: clampNumberValue(formEnhancements, 'gesamtkosten', e.target.value) }))}
        />
        {showErrors && !fields.gesamtkosten && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('fortbildungsantraege', 'gesamtkosten')}</p>
        )}
      </div>
    ),
    'ausschreibung': (
      <div key="ausschreibung" className="space-y-1.5">
        <Label htmlFor="ausschreibung">{labelFor('ausschreibung')}</Label>
        {fields.ausschreibung ? (
          <div className="flex items-center gap-3 rounded-lg border p-2">
            <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <IconFileText size={20} className="text-muted-foreground" />
              </div>
              <img
                src={fields.ausschreibung}
                alt=""
                className="relative h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate text-foreground">{fields.ausschreibung.split("/").pop()}</p>
              <div className="flex gap-2 mt-1">
                <label
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {t('fr_change')}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const fileUrl = await uploadFile(file, file.name);
                        setFields(f => ({ ...f, ausschreibung: fileUrl }));
                      } catch (err) { console.error('Upload failed:', err); }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setFields(f => ({ ...f, ausschreibung: undefined }))}
                >
                  {t('fr_remove')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label
            className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <IconUpload size={20} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('fr_upload_file')}</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const fileUrl = await uploadFile(file, file.name);
                  setFields(f => ({ ...f, ausschreibung: fileUrl }));
                } catch (err) { console.error('Upload failed:', err); }
              }}
            />
          </label>
        )}
      </div>
    ),
    'ausschreibung_link': (
      <div key="ausschreibung_link" className="space-y-1.5">
        <Label htmlFor="ausschreibung_link">{labelFor('ausschreibung_link')}</Label>
        <Input
          id="ausschreibung_link"
          type="url"
          inputMode="url"
          placeholder="z. B. https://beispiel.de"
          value={fields.ausschreibung_link ?? ''}
          onChange={e => setFields(f => ({ ...f, ausschreibung_link: e.target.value }))}
        />
      </div>
    ),
    'leitungskraft': (
      <div key="leitungskraft" className="space-y-1.5">
        <Label htmlFor="leitungskraft">{labelFor('leitungskraft')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Combobox
          id="leitungskraft"
          placeholder="Welche Leitungskraft?"
          items={personenListAll.map(r => ({
            id: r.record_id,
            label: displayNameOf('personen', r.fields as Record<string, unknown>) || r.record_id,
          }))}
          value={extractRecordId(fields.leitungskraft)}
          onChange={id => setFields(f => ({ ...f, leitungskraft: id ? createRecordUrl(APP_IDS.PERSONEN, id) : undefined }))}
          onCreateNew={(q) => openCreatePersonen("leitungskraft", q)}
          createLabel={t('create_in', { entity: appLabel('personen') })}
        />
        {showErrors && !fields.leitungskraft && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('fortbildungsantraege', 'leitungskraft')}</p>
        )}
      </div>
    ),
    'weitere_leitungskraefte': (
      <div key="weitere_leitungskraefte" className="space-y-1.5">
        <Label htmlFor="weitere_leitungskraefte">{labelFor('weitere_leitungskraefte')}</Label>
        <MultiCombobox
          id="weitere_leitungskraefte"
          placeholder="Welche weiteren Personen?"
          items={personenListAll.map(r => ({
            id: r.record_id,
            label: displayNameOf('personen', r.fields as Record<string, unknown>) || r.record_id,
          }))}
          values={extractRecordIds(fields.weitere_leitungskraefte)}
          onChange={ids => setFields(f => ({ ...f, weitere_leitungskraefte: ids.length ? ids.map(id => createRecordUrl(APP_IDS.PERSONEN, id)) as any : undefined }))}
          onCreateNew={(q) => openCreatePersonen("weitere_leitungskraefte", q)}
          createLabel={t('create_in', { entity: appLabel('personen') })}
        />
      </div>
    ),
    'status': (
      <div key="status" className="space-y-1.5">
        <Label htmlFor="status">{labelFor('status')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Select
          value={lookupKey(fields.status) ?? ''}
          onValueChange={v => setFields(f => ({ ...f, status: v === 'none' ? undefined : v as any }))}
        >
          <SelectTrigger id="status" className="max-sm:h-11"><SelectValue placeholder="Wie ist der Stand?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            <SelectItem value="antrag_gestellt">{lookupLabel('fortbildungsantraege', 'status', 'antrag_gestellt') ?? 'Antrag gestellt'}</SelectItem>
            <SelectItem value="stellungnahme">{lookupLabel('fortbildungsantraege', 'status', 'stellungnahme') ?? 'Stellungnahme Vorgesetzte/r'}</SelectItem>
            <SelectItem value="abstimmung">{lookupLabel('fortbildungsantraege', 'status', 'abstimmung') ?? 'Abstimmung Leitungskräfte'}</SelectItem>
            <SelectItem value="ueberarbeitung">{lookupLabel('fortbildungsantraege', 'status', 'ueberarbeitung') ?? 'Überarbeitung'}</SelectItem>
            <SelectItem value="genehmigt">{lookupLabel('fortbildungsantraege', 'status', 'genehmigt') ?? 'Genehmigt'}</SelectItem>
            <SelectItem value="abgelehnt">{lookupLabel('fortbildungsantraege', 'status', 'abgelehnt') ?? 'Abgelehnt'}</SelectItem>
            <SelectItem value="abrechnung">{lookupLabel('fortbildungsantraege', 'status', 'abrechnung') ?? 'Abrechnung'}</SelectItem>
            <SelectItem value="zahlung_offen">{lookupLabel('fortbildungsantraege', 'status', 'zahlung_offen') ?? 'Zahlung offen'}</SelectItem>
            <SelectItem value="abgeschlossen">{lookupLabel('fortbildungsantraege', 'status', 'abgeschlossen') ?? 'Abgeschlossen'}</SelectItem>
          </SelectContent>
        </Select>
        {showErrors && !fields.status && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('fortbildungsantraege', 'status')}</p>
        )}
      </div>
    ),
    'genehmigung_vorschlag': (
      <div key="genehmigung_vorschlag" className="space-y-1.5">
        <Label htmlFor="genehmigung_vorschlag">{labelFor('genehmigung_vorschlag')}</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.genehmigung_vorschlag) === 'ja'}
            onClick={() => setFields(f => ({ ...f, genehmigung_vorschlag: (lookupKey(f.genehmigung_vorschlag) === 'ja' ? undefined : 'ja') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.genehmigung_vorschlag) === 'ja'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('fortbildungsantraege', 'genehmigung_vorschlag', 'ja') ?? 'Ja'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.genehmigung_vorschlag) === 'nein'}
            onClick={() => setFields(f => ({ ...f, genehmigung_vorschlag: (lookupKey(f.genehmigung_vorschlag) === 'nein' ? undefined : 'nein') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.genehmigung_vorschlag) === 'nein'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('fortbildungsantraege', 'genehmigung_vorschlag', 'nein') ?? 'Nein'}
          </button>
        </div>
      </div>
    ),
    'kategorie': (
      <div key="kategorie" className="space-y-1.5">
        <Label htmlFor="kategorie">{labelFor('kategorie')}</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.kategorie) === 'kategorie_1'}
            onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'kategorie_1' ? undefined : 'kategorie_1') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.kategorie) === 'kategorie_1'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('fortbildungsantraege', 'kategorie', 'kategorie_1') ?? 'Kategorie 1'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.kategorie) === 'kategorie_2'}
            onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'kategorie_2' ? undefined : 'kategorie_2') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.kategorie) === 'kategorie_2'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('fortbildungsantraege', 'kategorie', 'kategorie_2') ?? 'Kategorie 2'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.kategorie) === 'kategorie_3'}
            onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'kategorie_3' ? undefined : 'kategorie_3') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.kategorie) === 'kategorie_3'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('fortbildungsantraege', 'kategorie', 'kategorie_3') ?? 'Kategorie 3'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.kategorie) === 'fachtag'}
            onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'fachtag' ? undefined : 'fachtag') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.kategorie) === 'fachtag'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('fortbildungsantraege', 'kategorie', 'fachtag') ?? 'Fachtag'}
          </button>
        </div>
      </div>
    ),
    'fortbildungstage': (
      <div key="fortbildungstage" className="space-y-1.5">
        <Label htmlFor="fortbildungstage">{labelFor('fortbildungstage')}</Label>
        <Input
          id="fortbildungstage"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'fortbildungstage')}
          placeholder="z. B. 2"
          value={fields.fortbildungstage !== undefined ? fields.fortbildungstage : (computedValues['fortbildungstage'] ?? '')}
          onChange={e => setFields(f => ({ ...f, fortbildungstage: clampNumberValue(formEnhancements, 'fortbildungstage', e.target.value) }))}
        />
      </div>
    ),
    'fortbildungsstunden': (
      <div key="fortbildungsstunden" className="space-y-1.5">
        <Label htmlFor="fortbildungsstunden">{labelFor('fortbildungsstunden')}</Label>
        <Input
          id="fortbildungsstunden"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'fortbildungsstunden')}
          placeholder="z. B. 16"
          value={fields.fortbildungsstunden !== undefined ? fields.fortbildungsstunden : (computedValues['fortbildungsstunden'] ?? '')}
          onChange={e => setFields(f => ({ ...f, fortbildungsstunden: clampNumberValue(formEnhancements, 'fortbildungsstunden', e.target.value) }))}
        />
      </div>
    ),
    'dienstbefreiung_tage': (
      <div key="dienstbefreiung_tage" className="space-y-1.5">
        <Label htmlFor="dienstbefreiung_tage">{labelFor('dienstbefreiung_tage')}</Label>
        <Input
          id="dienstbefreiung_tage"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'dienstbefreiung_tage')}
          placeholder="z. B. 2"
          value={fields.dienstbefreiung_tage !== undefined ? fields.dienstbefreiung_tage : (computedValues['dienstbefreiung_tage'] ?? '')}
          onChange={e => setFields(f => ({ ...f, dienstbefreiung_tage: clampNumberValue(formEnhancements, 'dienstbefreiung_tage', e.target.value) }))}
        />
      </div>
    ),
    'dienstbefreiung_stunden': (
      <div key="dienstbefreiung_stunden" className="space-y-1.5">
        <Label htmlFor="dienstbefreiung_stunden">{labelFor('dienstbefreiung_stunden')}</Label>
        <Input
          id="dienstbefreiung_stunden"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'dienstbefreiung_stunden')}
          placeholder="z. B. 16"
          value={fields.dienstbefreiung_stunden !== undefined ? fields.dienstbefreiung_stunden : (computedValues['dienstbefreiung_stunden'] ?? '')}
          onChange={e => setFields(f => ({ ...f, dienstbefreiung_stunden: clampNumberValue(formEnhancements, 'dienstbefreiung_stunden', e.target.value) }))}
        />
      </div>
    ),
    'kostenuebernahme': (
      <div key="kostenuebernahme" className="space-y-1.5">
        <Label htmlFor="kostenuebernahme">{labelFor('kostenuebernahme')}</Label>
        <Input
          id="kostenuebernahme"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'kostenuebernahme')}
          placeholder="z. B. 500"
          value={fields.kostenuebernahme !== undefined ? fields.kostenuebernahme : (computedValues['kostenuebernahme'] ?? '')}
          onChange={e => setFields(f => ({ ...f, kostenuebernahme: clampNumberValue(formEnhancements, 'kostenuebernahme', e.target.value) }))}
        />
      </div>
    ),
    'eigenanteil': (
      <div key="eigenanteil" className="space-y-1.5">
        <Label htmlFor="eigenanteil">{labelFor('eigenanteil')}</Label>
        <Input
          id="eigenanteil"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'eigenanteil')}
          placeholder="z. B. 190"
          value={fields.eigenanteil !== undefined ? fields.eigenanteil : (computedValues['eigenanteil'] ?? '')}
          onChange={e => setFields(f => ({ ...f, eigenanteil: clampNumberValue(formEnhancements, 'eigenanteil', e.target.value) }))}
        />
      </div>
    ),
    'restanspruch_tage': (
      <div key="restanspruch_tage" className="space-y-1.5">
        <Label htmlFor="restanspruch_tage">{labelFor('restanspruch_tage')}</Label>
        <Input
          id="restanspruch_tage"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'restanspruch_tage')}
          placeholder="z. B. 3"
          value={fields.restanspruch_tage !== undefined ? fields.restanspruch_tage : (computedValues['restanspruch_tage'] ?? '')}
          onChange={e => setFields(f => ({ ...f, restanspruch_tage: clampNumberValue(formEnhancements, 'restanspruch_tage', e.target.value) }))}
        />
      </div>
    ),
    'beginn_zeitraum': (
      <div key="beginn_zeitraum" className="space-y-1.5">
        <Label htmlFor="beginn_zeitraum">{labelFor('beginn_zeitraum')}</Label>
        <DatePicker
          id="beginn_zeitraum"
          placeholder="Wann startet der Zeitraum?"
          mode="date"
          value={fields.beginn_zeitraum ?? null}
          onChange={v => setFields(f => ({ ...f, beginn_zeitraum: v ?? undefined }))}
        />
      </div>
    ),
    'bemerkung': (
      <div key="bemerkung" className="space-y-1.5">
        <Label htmlFor="bemerkung">{labelFor('bemerkung')}</Label>
        <Textarea
          id="bemerkung"
          placeholder="Anmerkungen zum Antrag"
          value={fields.bemerkung ?? ''}
          onChange={e => setFields(f => ({ ...f, bemerkung: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'genehmigt_am': (
      <div key="genehmigt_am" className="space-y-1.5">
        <Label htmlFor="genehmigt_am">{labelFor('genehmigt_am')}</Label>
        <DatePicker
          id="genehmigt_am"
          placeholder="Wann wurde genehmigt?"
          mode="date"
          value={fields.genehmigt_am ?? null}
          onChange={v => setFields(f => ({ ...f, genehmigt_am: v ?? undefined }))}
        />
      </div>
    ),
    'mitteilung_antragsteller': (
      <div key="mitteilung_antragsteller" className="space-y-1.5">
        <Label htmlFor="mitteilung_antragsteller">{labelFor('mitteilung_antragsteller')}</Label>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="mitteilung_antragsteller"
            checked={!!fields.mitteilung_antragsteller}
            onCheckedChange={(v) => setFields(f => ({ ...f, mitteilung_antragsteller: !!v }))}
          />
          <Label htmlFor="mitteilung_antragsteller" className="font-normal">{labelFor('mitteilung_antragsteller')}</Label>
        </div>
      </div>
    ),
    'tatsaechliche_kosten': (
      <div key="tatsaechliche_kosten" className="space-y-1.5">
        <Label htmlFor="tatsaechliche_kosten">{labelFor('tatsaechliche_kosten')}</Label>
        <Input
          id="tatsaechliche_kosten"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'tatsaechliche_kosten')}
          placeholder="z. B. 700"
          value={fields.tatsaechliche_kosten !== undefined ? fields.tatsaechliche_kosten : (computedValues['tatsaechliche_kosten'] ?? '')}
          onChange={e => setFields(f => ({ ...f, tatsaechliche_kosten: clampNumberValue(formEnhancements, 'tatsaechliche_kosten', e.target.value) }))}
        />
      </div>
    ),
    'abrechnung_datum': (
      <div key="abrechnung_datum" className="space-y-1.5">
        <Label htmlFor="abrechnung_datum">{labelFor('abrechnung_datum')}</Label>
        <DatePicker
          id="abrechnung_datum"
          placeholder="Wann wurde abgerechnet?"
          mode="date"
          value={fields.abrechnung_datum ?? null}
          onChange={v => setFields(f => ({ ...f, abrechnung_datum: v ?? undefined }))}
        />
      </div>
    ),
    'abrechnung_bemerkung': (
      <div key="abrechnung_bemerkung" className="space-y-1.5">
        <Label htmlFor="abrechnung_bemerkung">{labelFor('abrechnung_bemerkung')}</Label>
        <Textarea
          id="abrechnung_bemerkung"
          placeholder="Anmerkungen zur Abrechnung"
          value={fields.abrechnung_bemerkung ?? ''}
          onChange={e => setFields(f => ({ ...f, abrechnung_bemerkung: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'zahlungsart': (
      <div key="zahlungsart" className="space-y-1.5">
        <Label htmlFor="zahlungsart">{labelFor('zahlungsart')}</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.zahlungsart) === 'eigenanteil_anfordern'}
            onClick={() => setFields(f => ({ ...f, zahlungsart: (lookupKey(f.zahlungsart) === 'eigenanteil_anfordern' ? undefined : 'eigenanteil_anfordern') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.zahlungsart) === 'eigenanteil_anfordern'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('fortbildungsantraege', 'zahlungsart', 'eigenanteil_anfordern') ?? 'Eigenanteil wird angefordert'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.zahlungsart) === 'restbetrag_ueberweisen'}
            onClick={() => setFields(f => ({ ...f, zahlungsart: (lookupKey(f.zahlungsart) === 'restbetrag_ueberweisen' ? undefined : 'restbetrag_ueberweisen') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.zahlungsart) === 'restbetrag_ueberweisen'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('fortbildungsantraege', 'zahlungsart', 'restbetrag_ueberweisen') ?? 'Restbetrag wird überwiesen'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.zahlungsart) === 'keine_zahlung'}
            onClick={() => setFields(f => ({ ...f, zahlungsart: (lookupKey(f.zahlungsart) === 'keine_zahlung' ? undefined : 'keine_zahlung') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.zahlungsart) === 'keine_zahlung'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('fortbildungsantraege', 'zahlungsart', 'keine_zahlung') ?? 'Keine Zahlung nötig'}
          </button>
        </div>
      </div>
    ),
    'zahlungsbetrag': (
      <div key="zahlungsbetrag" className="space-y-1.5">
        <Label htmlFor="zahlungsbetrag">{labelFor('zahlungsbetrag')}</Label>
        <Input
          id="zahlungsbetrag"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'zahlungsbetrag')}
          placeholder="z. B. 190"
          value={fields.zahlungsbetrag !== undefined ? fields.zahlungsbetrag : (computedValues['zahlungsbetrag'] ?? '')}
          onChange={e => setFields(f => ({ ...f, zahlungsbetrag: clampNumberValue(formEnhancements, 'zahlungsbetrag', e.target.value) }))}
        />
      </div>
    ),
    'zahlungseingang': (
      <div key="zahlungseingang" className="space-y-1.5">
        <Label htmlFor="zahlungseingang">{labelFor('zahlungseingang')}</Label>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="zahlungseingang"
            checked={!!fields.zahlungseingang}
            onCheckedChange={(v) => setFields(f => ({ ...f, zahlungseingang: !!v }))}
          />
          <Label htmlFor="zahlungseingang" className="font-normal">{labelFor('zahlungseingang')}</Label>
        </div>
      </div>
    ),
    'zahlungseingang_datum': (
      <div key="zahlungseingang_datum" className="space-y-1.5">
        <Label htmlFor="zahlungseingang_datum">{labelFor('zahlungseingang_datum')}</Label>
        <DatePicker
          id="zahlungseingang_datum"
          placeholder="Wann kam die Zahlung?"
          mode="date"
          value={fields.zahlungseingang_datum ?? null}
          onChange={v => setFields(f => ({ ...f, zahlungseingang_datum: v ?? undefined }))}
        />
      </div>
    ),
    'abschluss_datum': (
      <div key="abschluss_datum" className="space-y-1.5">
        <Label htmlFor="abschluss_datum">{labelFor('abschluss_datum')}</Label>
        <DatePicker
          id="abschluss_datum"
          placeholder="Wann abgeschlossen?"
          mode="date"
          value={fields.abschluss_datum ?? null}
          onChange={v => setFields(f => ({ ...f, abschluss_datum: v ?? undefined }))}
        />
      </div>
    ),
  };
  // Fields this dialog never shows: the config's `hidden` and the fields the
  // OVERVIEW changes with its own button (plan.dashboard.writes, how: button —
  // a control, not a form value; S-3). A required field stays visible.
  const DASHBOARD_BUTTON_FIELDS: string[] = ["zahlungseingang"];
  const ALWAYS_SHOWN: string[] = ['antragsteller', 'titel', 'veranstalter', 'ort', 'beginn', 'ende', 'gesamtkosten', 'leitungskraft', 'status'];
  // the values the plan's create flow sets itself (fixed:…): preset on create and
  // not asked — the dialog is the record's door, the flow's rule still holds (S-12)
  const HIDDEN = new Set<string>([...(formEnhancements.hidden ?? []), ...DASHBOARD_BUTTON_FIELDS, ...(recordId ? [] : Object.keys(PLAN_CREATE_PRESETS))].filter(k => !ALWAYS_SHOWN.includes(k)));
  const orderedFields = dropHidden(applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder), HIDDEN);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"antragsteller": "Antragsteller/in", "titel": "Titel der Veranstaltung", "veranstalter": "Veranstalter", "ort": "Ort der Veranstaltung oder digitales Format", "zielgruppe": "Zielgruppe", "beginn": "Beginn", "ende": "Ende", "arbeitsbefreiung_tage": "Arbeitsbefreiung in Tagen", "arbeitsbefreiung_stunden": "Arbeitsbefreiung in Stunden", "kosten_unterkunft_verpflegung": "Kosten Unterkunft und Verpflegung (€)", "kursgebuehren": "Kursgebühren (€)", "fahrtkosten": "Fahrtkosten (€)", "gesamtkosten": "Gesamtkosten (€)", "ausschreibung": "Kursausschreibung bzw. Tagungsprogramm", "ausschreibung_link": "Link zur Ausschreibung", "leitungskraft": "Zuständige Leitungskraft", "weitere_leitungskraefte": "Weitere Leitungskräfte (mindestens drei)", "status": "Status", "genehmigung_vorschlag": "Genehmigung", "kategorie": "Fortbildungskategorie", "fortbildungstage": "Fortbildungstage (Tage)", "fortbildungsstunden": "Fortbildungsstunden", "dienstbefreiung_tage": "Dienstbefreiung in Tagen", "dienstbefreiung_stunden": "Dienstbefreiung in Stunden", "kostenuebernahme": "Kostenübernahme in Höhe von (€)", "eigenanteil": "Eigenanteil (€)", "restanspruch_tage": "Restanspruch Fortbildungstage (2 Jahre)", "beginn_zeitraum": "Beginn 2-Jahres-Zeitraum", "bemerkung": "Bemerkung", "genehmigt_am": "Genehmigt am", "mitteilung_antragsteller": "Antragsteller/in wurde informiert (inkl. verbleibender Fortbildungstage)", "tatsaechliche_kosten": "Tatsächliche Gesamtkosten (€)", "abrechnung_datum": "Datum der Abrechnung", "abrechnung_bemerkung": "Bemerkung zur Abrechnung", "zahlungsart": "Zahlungsart", "zahlungsbetrag": "Zahlungsbetrag (€)", "zahlungseingang": "Zahlung eingegangen bzw. erfolgt", "zahlungseingang_datum": "Datum des Zahlungseingangs", "abschluss_datum": "Vorgang abgeschlossen am"};
  const CURRENCY_KEYS = new Set<string>(["kosten_unterkunft_verpflegung", "kursgebuehren", "fahrtkosten", "gesamtkosten", "kostenuebernahme", "eigenanteil", "tatsaechliche_kosten", "zahlungsbetrag"]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"antragsteller": {"vorname": "Vorname", "nachname": "Nachname", "email": "E-Mail", "rolle": "Rolle", "abteilung": "Abteilung", "standort": "Standort"}, "leitungskraft": {"vorname": "Vorname", "nachname": "Nachname", "email": "E-Mail", "rolle": "Rolle", "abteilung": "Abteilung", "standort": "Standort"}, "weitere_leitungskraefte": {"vorname": "Vorname", "nachname": "Nachname", "email": "E-Mail", "rolle": "Rolle", "abteilung": "Abteilung", "standort": "Standort"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0 max-sm:[&>button]:size-10 max-sm:[&>button]:grid max-sm:[&>button]:place-items-center max-sm:[&>button]:rounded-full max-sm:[&>button]:border max-sm:[&>button]:border-input max-sm:[&>button]:bg-background max-sm:[&>button]:opacity-100 max-sm:[&>button>svg]:size-5">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 max-sm:py-2.5 max-sm:px-4 text-xs font-semibold transition-all mr-7 max-sm:mr-12 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">{t('smart_fill')}</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">{t('scan_header_sub')}</p>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  {t('useinfo_label')}
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? t('useinfo_loading') : `(${t('useinfo_more')})`}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">{t('profile_preamble')}</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">{t('useinfo_error')}</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_analyzing')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_analyzing_sub')}</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('scan_success')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_success_sub')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_upload')}</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />{t('scan_camera_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />{t('scan_file_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />{t('scan_doc_btn')}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder={t('scan_text_placeholder')}
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title={t('paste')}
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />{t('scan_text_analyze')}
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0 max-sm:[&_input]:h-11">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                // A field the plan gives to a TOOL. On CREATE it is not shown
                // at all — the value does not exist yet and typing one only
                // gets overwritten. On EDIT it stays a normal input with a
                // note: when a tool could not compose its value (a missing
                // ingredient), this is the only place to repair the record.
                if (SYSTEM_ASSIGNED.includes(k) && !recordId) {
                  return (
                    <div key={k} className="space-y-1.5 min-w-0">
                      <Label>{labelFor(k)}</Label>
                      <p className="text-sm text-muted-foreground">{t('assigned_by_system')}</p>
                    </div>
                  );
                }
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {SYSTEM_ASSIGNED.includes(k) && (
                      <p className="text-xs text-muted-foreground">{t('assigned_by_system')}</p>
                    )}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {showErrors && missingRequired.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1.5" role="alert">
                <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                {t('missing_required')}
              </p>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS.FORTBILDUNGSANTRAEGE} recordId={recordId} />
              </div>
            )}
          </div>
          {submitError && (
            <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/10 px-6 py-2.5 text-sm text-destructive" role="alert">
              <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{submitError}</span>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2 max-sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="max-sm:h-12 max-sm:flex-1 max-sm:text-base">{t('cancel')}</Button>
            <Button
              type="submit"
              className="max-sm:h-12 max-sm:flex-1 max-sm:text-base"
              disabled={saving || !isDirty || (showErrors && missingRequired.length > 0)}
            >
              {saving ? t('saving') : defaultValues ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createPersonenOpen && (
      <PersonenDialog
        open={createPersonenOpen}
        onClose={() => setCreatePersonenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createPersonenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Personen;
            setExtraPersonen(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.PERSONEN, result.id);
            setFields(prev => ({ ...prev, [createPersonenField]: url } as any));
          }
          setCreatePersonenOpen(false);
        }}
        defaultValues={createPersonenInitial
          ? ({ vorname: createPersonenInitial } as any)
          : undefined}
        standorteList={[]}
      />
    )}
    </>
  );
}