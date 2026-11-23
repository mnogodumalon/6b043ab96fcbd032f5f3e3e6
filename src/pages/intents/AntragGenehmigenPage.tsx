/**
 * Antrag genehmigen — 4-Schritt-Wizard.
 * Steps: 1) Antrag wählen → 2) Rückmeldungen sichten → 3) Mitteilung an Antragsteller → 4) Entscheidung & Prüfen.
 * Reads: fortbildungsantraege, rueckmeldungen_der_leitungskraefte. Writes: fortbildungsantraege (Status, genehmigt_am, mitteilung_antragsteller).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { fieldText, fieldLookup, fieldNumber, fieldRef, fieldDate, useLiveList } from '@/lib/journey';
import { useAntragGenehmigenFlow } from '@/lib/journey/flows/AntragGenehmigen';
import { tx } from '@/i18n';

export default function AntragGenehmigenPage() {
  const [step, setStep] = useState(1);
  const flow = useAntragGenehmigenFlow({
    steps: { fortbildungsantraege: 1, mitteilung_antragsteller: 3 },
    items: {
      fortbildungsantraege: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: [ctx.ref('antragsteller'), fieldLookup(r, 'status')?.label].filter(Boolean).join(' · '),
      }),
    },
    where: {
      fortbildungsantraege: r => {
        const key = fieldLookup(r, 'status')?.key;
        return key === 'abstimmung' || key === 'ueberarbeitung';
      },
    },
  });

  const antrag = flow.targets.fortbildungsantraege?.record;
  const antragId = antrag?.id ?? null;
  const rueck = useLiveList(flow.port, 'rueckmeldungen_der_leitungskraefte', {
    intervalMs: 0,
    enabled: Boolean(antragId),
  });
  const rueckmeldungen = rueck.records.filter(r => fieldRef(r, 'antrag') === antragId);
  const restanspruch = antrag ? fieldNumber(antrag, 'restanspruch_tage') : null;

  return (
    <IntentWizardShell
      title={tx('Antrag genehmigen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Nach der Abstimmung entscheiden und den Antragsteller informieren.'),
        needs: [tx('Rückmeldungen der Leitungskräfte'), tx('Restanspruch an Fortbildungstagen')],
      }}
    >
      <WizardStep label={tx('Antrag')} description={tx('Welcher Antrag ist in Abstimmung oder Überarbeitung?')}>
        <EntitySelectStep
          {...flow.picks.fortbildungsantraege.select}
          {...flow.pick('fortbildungsantraege')}
          searchPlaceholder={tx('Titel suchen …')}
          emptyText={tx('Kein Antrag wartet gerade auf eine Entscheidung.')}
        />
      </WizardStep>

      <WizardStep label={tx('Rückmeldungen')} description={tx('Was haben die Leitungskräfte geantwortet?')} needs={['fortbildungsantraege']}>
        <div className="space-y-3">
          {antrag && (
            <div className="rounded-xl bg-secondary p-3 text-sm">
              <div className="font-medium">{fieldText(antrag, 'titel')}</div>
              <div className="text-muted-foreground">
                {tx`Kostenübernahme: ${fieldNumber(antrag, 'kostenuebernahme') ?? '—'} €`}
              </div>
            </div>
          )}
          {rueck.loading && <p className="text-sm text-muted-foreground">{tx('Rückmeldungen werden geladen …')}</p>}
          {!rueck.loading && rueckmeldungen.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {tx('Noch keine Rückmeldungen vorhanden.')}{' '}
              <a className="underline" href="#/intents/rueckmeldung-geben">{tx('Rückmeldung geben')}</a>
            </p>
          )}
          <ul className="space-y-2">
            {rueckmeldungen.map(r => {
              const e = fieldLookup(r, 'entscheidung');
              return (
                <li key={r.id} className="overflow-hidden rounded-xl border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 truncate font-medium">{flow.picks.fortbildungsantraege.refLabel(r, 'leitungskraft') ?? tx('Leitungskraft')}</span>
                    {e && <StatusBadge statusKey={e.key} label={e.label} />}
                    <span className="text-xs text-muted-foreground">{fieldDate(r, 'datum') ?? ''}</span>
                  </div>
                  {fieldText(r, 'kommentar') && <p className="mt-1 text-sm text-muted-foreground">{fieldText(r, 'kommentar')}</p>}
                </li>
              );
            })}
          </ul>
          <StepNav onBack={() => setStep(1)} nextStepLabel={tx('Mitteilung')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Mitteilung')} description={tx('Antragsteller informieren — mit den verbleibenden Fortbildungstagen.')} needs={['fortbildungsantraege']}>
        <div className="space-y-4">
          <div className="rounded-xl bg-secondary p-3 text-sm">
            {restanspruch !== null
              ? tx`Verbleibender Restanspruch: ${restanspruch} Fortbildungstage`
              : tx('Für diesen Antrag ist noch kein Restanspruch erfasst.')}
          </div>
          <Bound form={flow.forms.fortbildungsantraege} name="mitteilung_antragsteller" />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Entscheiden')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Entscheiden')} description={tx('Genehmigen, ablehnen oder zur Überarbeitung zurückgeben.')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            variants={flow.actions}
            whatHappensNext={tx('Der Status des Antrags wird gesetzt, das Genehmigungsdatum steht auf heute.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          next={[
            { label: tx('Weiteren Antrag entscheiden') },
            { label: tx('Rückmeldung geben'), href: '#/intents/rueckmeldung-geben' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
