import type { RueckmeldungenDerLeitungskraefte, Fortbildungsantraege, Personen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf } from '@/lib/journey/rules';

export interface RueckmeldungenDerLeitungskraefteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: RueckmeldungenDerLeitungskraefte;
  /** N:1-Ziel „Fortbildungsantraege": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  fortbildungsantraegeList: Fortbildungsantraege[];
  /** Klick auf die Fortbildungsantraege-Relation → overlay.push auf dessen Detail. */
  onOpenFortbildungsantraege?: (record: Fortbildungsantraege) => void;
  /** N:1-Ziel „Personen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  personenList: Personen[];
  /** Klick auf die Personen-Relation → overlay.push auf dessen Detail. */
  onOpenPersonen?: (record: Personen) => void;
}

export function RueckmeldungenDerLeitungskraefteDetails({
  record,
  fortbildungsantraegeList,
  onOpenFortbildungsantraege,
  personenList,
  onOpenPersonen,
}: RueckmeldungenDerLeitungskraefteDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const antragTarget = fortbildungsantraegeList.find(r => r.record_id === extractRecordId(record.fields.antrag));
  const leitungskraftTarget = personenList.find(r => r.record_id === extractRecordId(record.fields.leitungskraft));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('rueckmeldungen_der_leitungskraefte', 'entscheidung')} value={record.fields.entscheidung} format="pill" />
        <RecordField label={fieldLabel('rueckmeldungen_der_leitungskraefte', 'kommentar')} value={record.fields.kommentar} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('rueckmeldungen_der_leitungskraefte', 'datum')} value={record.fields.datum} format="date" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('rueckmeldungen_der_leitungskraefte', 'antrag')}
          name={antragTarget ? (displayNameOf('fortbildungsantraege', antragTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[antragTarget?.fields.veranstalter, antragTarget?.fields.ort].filter(Boolean).join(' · ') || undefined}
          onClick={antragTarget && onOpenFortbildungsantraege ? () => onOpenFortbildungsantraege!(antragTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('rueckmeldungen_der_leitungskraefte', 'leitungskraft')}
          name={leitungskraftTarget ? (displayNameOf('personen', leitungskraftTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[leitungskraftTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={leitungskraftTarget && onOpenPersonen ? () => onOpenPersonen!(leitungskraftTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.RUECKMELDUNGEN_DER_LEITUNGSKRAEFTE} recordId={record.record_id} readOnly={!perms.canWrite('rueckmeldungen_der_leitungskraefte')} />
    </>
  );
}
