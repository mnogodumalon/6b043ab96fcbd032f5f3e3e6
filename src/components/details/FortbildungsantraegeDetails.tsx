import type { Fortbildungsantraege, Personen, RueckmeldungenDerLeitungskraefte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';
import { displayNameOf, displayPart } from '@/lib/journey/rules';

export interface FortbildungsantraegeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Fortbildungsantraege;
  /** N:1-Ziel „Personen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  personenList: Personen[];
  /** Klick auf die Personen-Relation → overlay.push auf dessen Detail. */
  onOpenPersonen?: (record: Personen) => void;
  /** 1:N „Rückmeldungen der Leitungskräfte" (antrag): VOLLE Liste — der Block filtert auf diesen Record. */
  rueckmeldungenDerLeitungskraefteList: RueckmeldungenDerLeitungskraefte[];
  /** Zeilen-Klick → overlay.push auf das RueckmeldungenDerLeitungskraefte-Detail (nie der Edit-Dialog). */
  onOpenRueckmeldungenDerLeitungskraefte: (record: RueckmeldungenDerLeitungskraefte) => void;
  /** Kontextuelles „+": öffnet den RueckmeldungenDerLeitungskraefte-Dialog mit diesem Record vorgesetzt. */
  onAddRueckmeldungenDerLeitungskraefte?: () => void;
}

export function FortbildungsantraegeDetails({
  record,
  personenList,
  onOpenPersonen,
  rueckmeldungenDerLeitungskraefteList,
  onOpenRueckmeldungenDerLeitungskraefte,
  onAddRueckmeldungenDerLeitungskraefte,
}: FortbildungsantraegeDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const antragstellerTarget = personenList.find(r => r.record_id === extractRecordId(record.fields.antragsteller));
  const leitungskraftTarget = personenList.find(r => r.record_id === extractRecordId(record.fields.leitungskraft));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('fortbildungsantraege', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'veranstalter')} value={record.fields.veranstalter} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'zielgruppe')} value={record.fields.zielgruppe} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'beginn')} value={record.fields.beginn} format="datetime" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'ende')} value={record.fields.ende} format="datetime" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'arbeitsbefreiung_tage')} value={record.fields.arbeitsbefreiung_tage} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'arbeitsbefreiung_stunden')} value={record.fields.arbeitsbefreiung_stunden} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'kosten_unterkunft_verpflegung')} value={record.fields.kosten_unterkunft_verpflegung} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'kursgebuehren')} value={record.fields.kursgebuehren} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'fahrtkosten')} value={record.fields.fahrtkosten} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'gesamtkosten')} value={record.fields.gesamtkosten} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'ausschreibung')} className="md:col-span-2">
          {record.fields.ausschreibung ? (
            <MediaThumbnail src={record.fields.ausschreibung as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('fortbildungsantraege', 'ausschreibung_link')} value={record.fields.ausschreibung_link} format="url" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'weitere_leitungskraefte')} value={Array.isArray(record.fields.weitere_leitungskraefte) ? record.fields.weitere_leitungskraefte.map((u: unknown) => personenList.find(t => t.record_id === extractRecordId(u))?.fields.vorname ?? '—').join(', ') : null} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'genehmigung_vorschlag')} value={record.fields.genehmigung_vorschlag} format="pill" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'kategorie')} value={record.fields.kategorie} format="pill" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'fortbildungstage')} value={record.fields.fortbildungstage} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'fortbildungsstunden')} value={record.fields.fortbildungsstunden} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'dienstbefreiung_tage')} value={record.fields.dienstbefreiung_tage} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'dienstbefreiung_stunden')} value={record.fields.dienstbefreiung_stunden} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'kostenuebernahme')} value={record.fields.kostenuebernahme} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'eigenanteil')} value={record.fields.eigenanteil} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'restanspruch_tage')} value={record.fields.restanspruch_tage} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'beginn_zeitraum')} value={record.fields.beginn_zeitraum} format="date" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'genehmigt_am')} value={record.fields.genehmigt_am} format="date" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'mitteilung_antragsteller')} value={record.fields.mitteilung_antragsteller} format="bool" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'tatsaechliche_kosten')} value={record.fields.tatsaechliche_kosten} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'abrechnung_datum')} value={record.fields.abrechnung_datum} format="date" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'abrechnung_bemerkung')} value={record.fields.abrechnung_bemerkung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'zahlungsart')} value={record.fields.zahlungsart} format="pill" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'zahlungsbetrag')} value={record.fields.zahlungsbetrag} format="text" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'zahlungseingang')} value={record.fields.zahlungseingang} format="bool" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'zahlungseingang_datum')} value={record.fields.zahlungseingang_datum} format="date" />
        <RecordField label={fieldLabel('fortbildungsantraege', 'abschluss_datum')} value={record.fields.abschluss_datum} format="date" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('fortbildungsantraege', 'antragsteller')}
          name={antragstellerTarget ? (displayNameOf('personen', antragstellerTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[antragstellerTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={antragstellerTarget && onOpenPersonen ? () => onOpenPersonen!(antragstellerTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('fortbildungsantraege', 'leitungskraft')}
          name={leitungskraftTarget ? (displayNameOf('personen', leitungskraftTarget.fields as Record<string, unknown>) || '—') : '—'}
          meta={[leitungskraftTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={leitungskraftTarget && onOpenPersonen ? () => onOpenPersonen!(leitungskraftTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('rueckmeldungen_der_leitungskraefte')}
        items={rueckmeldungenDerLeitungskraefteList.filter(r => extractRecordId(r.fields.antrag) === record.record_id)}
        map={r => ({ name: displayNameOf('rueckmeldungen_der_leitungskraefte', r.fields as Record<string, unknown>) || appLabel('rueckmeldungen_der_leitungskraefte'), meta: displayPart(r.fields.datum) })}
        onOpen={onOpenRueckmeldungenDerLeitungskraefte}
        onAdd={onAddRueckmeldungenDerLeitungskraefte}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.FORTBILDUNGSANTRAEGE} recordId={record.record_id} readOnly={!perms.canWrite('fortbildungsantraege')} />
    </>
  );
}
