import type { Personen, Standorte, Fortbildungsantraege, RueckmeldungenDerLeitungskraefte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf, displayPart } from '@/lib/journey/rules';

export interface PersonenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Personen;
  /** N:1-Ziel „Standorte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  standorteList: Standorte[];
  /** Klick auf die Standorte-Relation → overlay.push auf dessen Detail. */
  onOpenStandorte?: (record: Standorte) => void;
  /** 1:N „Fortbildungsanträge" (antragsteller): VOLLE Liste — der Block filtert auf diesen Record. */
  fortbildungsantraegeAntragstellerList: Fortbildungsantraege[];
  /** Zeilen-Klick → overlay.push auf das Fortbildungsantraege-Detail (nie der Edit-Dialog). */
  onOpenFortbildungsantraegeAntragsteller: (record: Fortbildungsantraege) => void;
  /** Kontextuelles „+": öffnet den Fortbildungsantraege-Dialog mit diesem Record vorgesetzt. */
  onAddFortbildungsantraegeAntragsteller?: () => void;
  /** 1:N „Fortbildungsanträge" (leitungskraft): VOLLE Liste — der Block filtert auf diesen Record. */
  fortbildungsantraegeLeitungskraftList: Fortbildungsantraege[];
  /** Zeilen-Klick → overlay.push auf das Fortbildungsantraege-Detail (nie der Edit-Dialog). */
  onOpenFortbildungsantraegeLeitungskraft: (record: Fortbildungsantraege) => void;
  /** Kontextuelles „+": öffnet den Fortbildungsantraege-Dialog mit diesem Record vorgesetzt. */
  onAddFortbildungsantraegeLeitungskraft?: () => void;
  /** 1:N „Fortbildungsanträge" (weitere_leitungskraefte): VOLLE Liste — der Block filtert auf diesen Record. */
  fortbildungsantraegeWeitereLeitungskraefteList: Fortbildungsantraege[];
  /** Zeilen-Klick → overlay.push auf das Fortbildungsantraege-Detail (nie der Edit-Dialog). */
  onOpenFortbildungsantraegeWeitereLeitungskraefte: (record: Fortbildungsantraege) => void;
  /** Kontextuelles „+": öffnet den Fortbildungsantraege-Dialog mit diesem Record vorgesetzt. */
  onAddFortbildungsantraegeWeitereLeitungskraefte?: () => void;
  /** „Vorhandene wählen": Listenfeld-Rückbezug — hängt diesen Record an einen bestehenden Fortbildungsantraege-Datensatz. */
  onPickFortbildungsantraegeWeitereLeitungskraefte?: () => void;
  /** 1:N „Rückmeldungen der Leitungskräfte" (leitungskraft): VOLLE Liste — der Block filtert auf diesen Record. */
  rueckmeldungenDerLeitungskraefteList: RueckmeldungenDerLeitungskraefte[];
  /** Zeilen-Klick → overlay.push auf das RueckmeldungenDerLeitungskraefte-Detail (nie der Edit-Dialog). */
  onOpenRueckmeldungenDerLeitungskraefte: (record: RueckmeldungenDerLeitungskraefte) => void;
  /** Kontextuelles „+": öffnet den RueckmeldungenDerLeitungskraefte-Dialog mit diesem Record vorgesetzt. */
  onAddRueckmeldungenDerLeitungskraefte?: () => void;
}

export function PersonenDetails({
  record,
  standorteList,
  onOpenStandorte,
  fortbildungsantraegeAntragstellerList,
  onOpenFortbildungsantraegeAntragsteller,
  onAddFortbildungsantraegeAntragsteller,
  fortbildungsantraegeLeitungskraftList,
  onOpenFortbildungsantraegeLeitungskraft,
  onAddFortbildungsantraegeLeitungskraft,
  fortbildungsantraegeWeitereLeitungskraefteList,
  onOpenFortbildungsantraegeWeitereLeitungskraefte,
  onAddFortbildungsantraegeWeitereLeitungskraefte,
  onPickFortbildungsantraegeWeitereLeitungskraefte,
  rueckmeldungenDerLeitungskraefteList,
  onOpenRueckmeldungenDerLeitungskraefte,
  onAddRueckmeldungenDerLeitungskraefte,
}: PersonenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const standortTarget = standorteList.find(r => r.record_id === extractRecordId(record.fields.standort));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('personen', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('personen', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('personen', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('personen', 'rolle')} value={record.fields.rolle} format="pill" />
        <RecordField label={fieldLabel('personen', 'abteilung')} value={record.fields.abteilung} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('personen', 'standort')}
          name={standortTarget ? (displayNameOf('standorte', standortTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={undefined}
          onClick={standortTarget && onOpenStandorte ? () => onOpenStandorte!(standortTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={`${appLabel('fortbildungsantraege')} · ${fieldLabel('fortbildungsantraege', 'antragsteller')}`}
        items={fortbildungsantraegeAntragstellerList.filter(r => extractRecordId(r.fields.antragsteller) === record.record_id)}
        map={r => ({ name: displayNameOf('fortbildungsantraege', r.fields as Record<string, unknown>) || appLabel('fortbildungsantraege'), meta: displayPart(r.fields.beginn) })}
        onOpen={onOpenFortbildungsantraegeAntragsteller}
        onAdd={onAddFortbildungsantraegeAntragsteller}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={`${appLabel('fortbildungsantraege')} · ${fieldLabel('fortbildungsantraege', 'leitungskraft')}`}
        items={fortbildungsantraegeLeitungskraftList.filter(r => extractRecordId(r.fields.leitungskraft) === record.record_id)}
        map={r => ({ name: displayNameOf('fortbildungsantraege', r.fields as Record<string, unknown>) || appLabel('fortbildungsantraege'), meta: displayPart(r.fields.beginn) })}
        onOpen={onOpenFortbildungsantraegeLeitungskraft}
        onAdd={onAddFortbildungsantraegeLeitungskraft}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={`${appLabel('fortbildungsantraege')} · ${fieldLabel('fortbildungsantraege', 'weitere_leitungskraefte')}`}
        items={fortbildungsantraegeWeitereLeitungskraefteList.filter(r => Array.isArray(r.fields.weitere_leitungskraefte) && r.fields.weitere_leitungskraefte.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: displayNameOf('fortbildungsantraege', r.fields as Record<string, unknown>) || appLabel('fortbildungsantraege'), meta: displayPart(r.fields.beginn) })}
        onOpen={onOpenFortbildungsantraegeWeitereLeitungskraefte}
        onAdd={onAddFortbildungsantraegeWeitereLeitungskraefte}
        onPick={onPickFortbildungsantraegeWeitereLeitungskraefte}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('rueckmeldungen_der_leitungskraefte')}
        items={rueckmeldungenDerLeitungskraefteList.filter(r => extractRecordId(r.fields.leitungskraft) === record.record_id)}
        map={r => ({ name: displayNameOf('rueckmeldungen_der_leitungskraefte', r.fields as Record<string, unknown>) || appLabel('rueckmeldungen_der_leitungskraefte'), meta: displayPart(r.fields.datum) })}
        onOpen={onOpenRueckmeldungenDerLeitungskraefte}
        onAdd={onAddRueckmeldungenDerLeitungskraefte}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.PERSONEN} recordId={record.record_id} readOnly={!perms.canWrite('personen')} />
    </>
  );
}
