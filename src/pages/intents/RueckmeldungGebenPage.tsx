/**
 * Rückmeldung geben — 4-Schritt-Wizard.
 * Steps: 1) Antrag in Abstimmung wählen → 2) Leitungskraft wählen → 3) Zustimmung, Rückfrage oder Kommentar → 4) Prüfen & absenden.
 * Reads: fortbildungsantraege, personen. Writes: rueckmeldungen_der_leitungskraefte (via useRueckmeldungGebenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useRueckmeldungGebenFlow } from '@/lib/journey/flows/RueckmeldungGeben';
import { tx } from '@/i18n';

export default function RueckmeldungGebenPage() {
  const [step, setStep] = useState(1);
  const flow = useRueckmeldungGebenFlow({
    steps: { antrag: 1, leitungskraft: 2, entscheidung: 3, kommentar: 3 },
    items: {
      antrag: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: ctx.ref('antragsteller'),
        status: fieldLookup(r, 'status') ?? undefined,
      } as { id: string; title: string }),
      leitungskraft: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
      }),
    },
  });
  const form = flow.forms.rueckmeldungen_der_leitungskraefte;

  return (
    <IntentWizardShell
      title={tx('Rückmeldung geben')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Stimme einem Antrag zu, stelle eine Rückfrage oder kommentiere.'),
        needs: [tx('Den Antrag in Abstimmung'), tx('Deinen Namen als Leitungskraft')],
      }}
    >
      <WizardStep label={tx('Antrag')} description={tx('Zu welchem Antrag in Abstimmung möchtest du Rückmeldung geben?')}>
        <EntitySelectStep
          {...flow.picks.antrag.select}
          {...flow.pick('antrag')}
          searchPlaceholder={tx('Titel der Veranstaltung …')}
        />
      </WizardStep>
      <WizardStep label={tx('Leitungskraft')} description={tx('Wer gibt die Rückmeldung?')} needs={['antrag']}>
        <EntitySelectStep
          {...flow.picks.leitungskraft.select}
          {...flow.pick('leitungskraft')}
          searchPlaceholder={tx('Name suchen …')}
        />
      </WizardStep>
      <WizardStep label={tx('Rückmeldung')} description={tx('Wähle Zustimmung, Rückfrage oder Kommentar und ergänze bei Bedarf einen Text.')} needs={['antrag', 'leitungskraft']}>
        <div className="space-y-4">
          <Bound form={form} name="entscheidung" />
          <Bound form={form} name="kommentar" rows={4} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Deine Rückmeldung wird heute datiert beim Antrag vermerkt und ist für die weiteren Leitungskräfte sichtbar.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Antrag genehmigen'), href: '#/intents/antrag-genehmigen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
