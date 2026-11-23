import { useMemo } from 'react';
import { format } from 'date-fns';
import { IconPlus, IconCalendarStats, IconCoin, IconReceipt, IconSchool } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedFortbildungsantraege } from '@/types/enriched';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { tx, appLabel } from '@/i18n';
import { countOf } from '@/config/plan';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { Button } from '@/components/ui/button';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';

// Statuses in which a training counts as approved (days are consumed)
const CONSUMING = ['genehmigt', 'abrechnung', 'zahlung_offen', 'abgeschlossen'];

function tageOf(r: EnrichedFortbildungsantraege): number {
  const f = r.fields;
  if (f.fortbildungstage != null) return f.fortbildungstage;
  if (f.arbeitsbefreiung_tage != null) return f.arbeitsbefreiung_tage;
  if (f.fortbildungsstunden != null) return f.fortbildungsstunden / 8;
  if (f.arbeitsbefreiung_stunden != null) return f.arbeitsbefreiung_stunden / 8;
  return 0;
}

function kostenOf(r: EnrichedFortbildungsantraege): number {
  return r.fields.tatsaechliche_kosten ?? r.fields.gesamtkosten ?? 0;
}

function toneForStatus(status: string | undefined): KanbanTone {
  switch (status) {
    case 'abstimmung':
    case 'stellungnahme':
    case 'antrag_gestellt': return 'primary';
    case 'ueberarbeitung': return 'warning';
    case 'zahlung_offen': return 'warning';
    case 'abgelehnt': return 'destructive';
    case 'genehmigt':
    case 'abrechnung': return 'success';
    default: return 'default';
  }
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { rueckmeldungenDerLeitungskraefte, setFortbildungsantraege, fetchAll } = data;
  const clock = useClock();

  // Next workflow step in the record overlay: a received payment closes the open item
  const markPaid = (r: EnrichedFortbildungsantraege) => {
    const id = r.record_id;
    const prevFields = { zahlungseingang: r.fields.zahlungseingang };
    setFortbildungsantraege(prev => prev.map(x => x.record_id === id ? { ...x, fields: { ...x.fields, zahlungseingang: true } } : x));
    LivingAppsService.updateFortbildungsantraegeEntry(id, { zahlungseingang: true }).catch(() => { void fetchAll(); });
    undoToast(tx`${r.fields.titel ?? ''} — Zahlung eingegangen`, () => {
      setFortbildungsantraege(prev => prev.map(x => x.record_id === id ? { ...x, fields: { ...x.fields, ...prevFields } } : x));
      LivingAppsService.updateFortbildungsantraegeEntry(id, { zahlungseingang: prevFields.zahlungseingang ?? false }).catch(() => { void fetchAll(); });
    });
  };

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'fortbildungsantraege') return undefined;
      const rec = top.record as EnrichedFortbildungsantraege;
      if (lookupKey(rec.fields.status) === 'zahlung_offen' && !rec.fields.zahlungseingang && crud.fortbildungsantraege.canWrite) {
        return { label: tx('Zahlung eingegangen'), onClick: () => markPaid(rec) };
      }
      return undefined;
    },
  });
  const antraege = crud.enriched.fortbildungsantraege;

  const statusOf = (r: EnrichedFortbildungsantraege) => lookupKey(r.fields.status) ?? 'antrag_gestellt';
  const year = clock.getFullYear();

  // How many Rückmeldungen each Antrag already has
  const rueckByAntrag = useMemo(() => {
    const m = new Map<string, { total: number; zustimmung: number }>();
    for (const r of rueckmeldungenDerLeitungskraefte) {
      const id = extractRecordId(r.fields.antrag);
      if (!id) continue;
      const e = m.get(id) ?? { total: 0, zustimmung: 0 };
      e.total += 1;
      if (lookupKey(r.fields.entscheidung) === 'zustimmung') e.zustimmung += 1;
      m.set(id, e);
    }
    return m;
  }, [rueckmeldungenDerLeitungskraefte]);

  const columns = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['fortbildungsantraege']?.['status'] ?? []).map(o => ({ key: o.key, label: o.label })),
    [],
  );

  const cards: KanbanCard[] = antraege.map(r => {
    const st = statusOf(r);
    const rk = rueckByAntrag.get(r.record_id);
    const who = r.antragstellerName || '—';
    const sub = st === 'abstimmung'
      ? tx`${who} · ${rk?.zustimmung ?? 0} von ${rk?.total ?? 0} Zustimmungen`
      : `${who} · ${formatDate(r.fields.beginn)}`;
    return {
      id: `fortbildung:${r.record_id}`,
      column: st,
      title: r.fields.titel ?? '—',
      subtitle: sub,
      tone: toneForStatus(st),
    };
  });

  // Verbrauch: only approved up to closed
  const consuming = antraege.filter(r => CONSUMING.includes(statusOf(r)));
  const tageThisYear = consuming
    .filter(r => r.fields.beginn?.slice(0, 4) === String(year))
    .reduce((s, r) => s + tageOf(r), 0);
  const gesamtkosten = antraege.filter(r => statusOf(r) !== 'abgelehnt').reduce((s, r) => s + kostenOf(r), 0);
  const abgerechnet = antraege.filter(r => r.fields.tatsaechliche_kosten != null && statusOf(r) !== 'abgelehnt')
    .reduce((s, r) => s + (r.fields.tatsaechliche_kosten ?? 0), 0);

  const offeneZahlungen = antraege.filter(r => statusOf(r) === 'zahlung_offen' && !r.fields.zahlungseingang);
  const offenerBetrag = offeneZahlungen.reduce((s, r) => s + (r.fields.zahlungsbetrag ?? 0), 0);

  const chartRows: ChartRow<EnrichedFortbildungsantraege>[] = consuming.map(r => ({ id: `fortbildungsantraege:${r.record_id}`, data: r }));

  const restanspruch = [...consuming]
    .filter(r => r.fields.restanspruch_tage != null)
    .sort((a, b) => (b.fields.genehmigt_am ?? b.createdat).localeCompare(a.fields.genehmigt_am ?? a.createdat))[0];

  const titelListe = [...consuming].sort((a, b) => (b.fields.beginn ?? '').localeCompare(a.fields.beginn ?? ''));

  // Context line — names people in every branch
  const inAbstimmung = antraege.filter(r => statusOf(r) === 'abstimmung');
  const inUeberarbeitung = antraege.filter(r => statusOf(r) === 'ueberarbeitung');
  let context: string;
  if (antraege.length === 0) {
    context = tx`Noch kein Antrag vorhanden — stelle den ersten Fortbildungsantrag.`;
  } else if (inAbstimmung.length > 0) {
    const n = namen(inAbstimmung.map(r => r.antragstellerName));
    context = tx`${n} wartet auf Rückmeldungen der Leitungskräfte.`;
  } else if (offeneZahlungen.length > 0) {
    const n = namen(offeneZahlungen.map(r => r.antragstellerName));
    context = tx`Bei ${n} ist noch eine Zahlung offen.`;
  } else if (inUeberarbeitung.length > 0) {
    const n = namen(inUeberarbeitung.map(r => r.antragstellerName));
    context = tx`${n} überarbeitet den Antrag nach den Kommentaren.`;
  } else {
    const last = titelListe[0];
    context = last
      ? tx`Alles im Fluss — zuletzt: ${last.fields.titel ?? ''} (${last.antragstellerName}).`
      : tx`Alle Anträge sind bearbeitet.`;
  }

  const canCreate = crud.fortbildungsantraege.canWrite;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{context}</p>
        </div>
        {canCreate && (
          <Button onClick={() => crud.fortbildungsantraege.openCreate({ status: 'antrag_gestellt' })} className="gap-2">
            <IconPlus size={16} className="shrink-0" />
            {tx('Neuer Antrag')}
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="wide"
        hero={antraege.length === 0 && canCreate ? (
          <div className="flex flex-col items-center gap-3 rounded-[27px] bg-card p-8 text-center shadow-lg">
            <IconSchool size={48} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{tx('Hier laufen alle Fortbildungen zusammen — von der Beantragung bis zum Abschluss.')}</p>
            <Button onClick={() => crud.fortbildungsantraege.openCreate({ status: 'antrag_gestellt' })}>{tx('Ersten Antrag stellen')}</Button>
          </div>
        ) : undefined}
        kpis={antraege.length > 0 ? (
          <StatStrip>
            <StatStripItem
              title={tx`Fortbildungstage ${year}`}
              value={tx`${Math.round(tageThisYear * 10) / 10} Tage`}
              icon={<IconCalendarStats size={18} className="text-muted-foreground" />}
            />
            <StatStripItem
              title={tx('Gesamtkosten')}
              value={formatCurrency(gesamtkosten)}
              icon={<IconCoin size={18} className="text-muted-foreground" />}
            />
            <StatStripItem
              title={tx('Zahlung ausstehend')}
              value={formatCurrency(offenerBetrag)}
              tone={offenerBetrag > 0 ? 'warning' : 'default'}
              icon={<IconReceipt size={18} className="text-muted-foreground" />}
            />
          </StatStrip>
        ) : undefined}
        primary={
          <KanbanWidget
            cards={cards}
            columns={columns}
            defaultCollapsed={['abgelehnt', 'abgeschlossen']}
            onCardClick={card => {
              const rec = antraege.find(r => r.record_id === card.id.split(':')[1]);
              if (rec) crud.fortbildungsantraege.openDetail(rec);
            }}
            onAddCard={canCreate ? column => crud.fortbildungsantraege.openCreate({ status: column }) : undefined}
          />
        }
        aside={
          <>
            <ChartWidget<EnrichedFortbildungsantraege>
              title={tx('Fortbildungstage nach Jahr')}
              rows={chartRows}
              dimension={{ kind: 'category', accessor: r => r.data.fields.beginn?.slice(0, 4) ?? null, label: tx('Jahr') }}
              measure={{ aggregate: 'sum', label: tx('Tage verbraucht'), value: r => tageOf(r.data), format: 'number' }}
              footer={restanspruch
                ? <>{tx`Restanspruch laut letzter Stellungnahme: ${restanspruch.fields.restanspruch_tage ?? 0} Tage (${restanspruch.antragstellerName})`}</>
                : <>{tx('Nur genehmigte bis abgeschlossene Anträge zählen als Verbrauch.')}</>}
            />
            <WorkList
              title={tx('Offene Zahlungen')}
              items={offeneZahlungen.map(r => ({
                id: r.record_id,
                title: r.fields.titel ?? '—',
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">{r.fields.zahlungsart?.label ?? tx('Zahlung offen')}</span>
                    <span className="text-muted-foreground"> · {r.antragstellerName} · {formatCurrency(r.fields.zahlungsbetrag)}</span>
                  </>
                ),
                action: crud.fortbildungsantraege.canWrite ? { label: tx('Eingegangen'), onClick: () => markPaid(r) } : undefined,
              }))}
              onItemClick={id => { const rec = antraege.find(r => r.record_id === id); if (rec) crud.fortbildungsantraege.openDetail(rec); }}
              empty={{ text: tx('Keine offenen Zahlungen — alles beglichen.') }}
            />
            <WorkList
              title={tx('Fortbildungen')}
              max={6}
              items={titelListe.map(r => ({
                id: r.record_id,
                title: r.fields.titel ?? '—',
                secondLine: (
                  <>
                    <span className="font-medium text-foreground">{r.fields.status?.label}</span>
                    <span className="text-muted-foreground"> · {r.antragstellerName} · {formatDate(r.fields.beginn)}</span>
                  </>
                ),
              }))}
              onItemClick={id => { const rec = antraege.find(r => r.record_id === id); if (rec) crud.fortbildungsantraege.openDetail(rec); }}
              empty={{ text: tx`Noch keine genehmigte Fortbildung — ${countOf('fortbildungsantraege', antraege.length, appLabel('fortbildungsantraege'))} insgesamt.` }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
