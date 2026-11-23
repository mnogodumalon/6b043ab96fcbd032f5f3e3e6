import type { Standorte, Personen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf } from '@/lib/journey/rules';

export interface StandorteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Standorte;
  /** 1:N „Personen" (standort): VOLLE Liste — der Block filtert auf diesen Record. */
  personenList: Personen[];
  /** Zeilen-Klick → overlay.push auf das Personen-Detail (nie der Edit-Dialog). */
  onOpenPersonen: (record: Personen) => void;
  /** Kontextuelles „+": öffnet den Personen-Dialog mit diesem Record vorgesetzt. */
  onAddPersonen?: () => void;
}

export function StandorteDetails({
  record,
  personenList,
  onOpenPersonen,
  onAddPersonen,
}: StandorteDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('standorte', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('personen')}
        items={personenList.filter(r => extractRecordId(r.fields.standort) === record.record_id)}
        map={r => ({ name: displayNameOf('personen', r.fields as Record<string, unknown>) || appLabel('personen'), meta: undefined })}
        onOpen={onOpenPersonen}
        onAdd={onAddPersonen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.STANDORTE} recordId={record.record_id} readOnly={!perms.canWrite('standorte')} />
    </>
  );
}
