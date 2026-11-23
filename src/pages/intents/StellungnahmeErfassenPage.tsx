/**
 * Stellungnahme erfassen — 8-Schritt-Wizard.
 * Steps: 1) Offenen Antrag wählen → 2) Genehmigung & Kategorie → 3) Tage/Stunden → 4) Kostenübernahme & Eigenanteil
 *        → 5) Restanspruch & Zeitraum → 6) Bemerkung → 7) Weitere Leitungskräfte wählen → 8) Prüfen & speichern.
 * Reads: fortbildungsantraege, personen. Writes: fortbildungsantraege (update, via useStellungnahmeErfassenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, Field, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useStellungnahmeErfassenFlow } from '@/lib/journey/flows/StellungnahmeErfassen';
import { tx } from '@/i18n';

export default function StellungnahmeErfassenPage() {
  const [step, setStep] = useState(1);
  const flow = useStellungnahmeErfassenFlow({
    steps: {
      fortbildungsantraege: 1,
      genehmigung_vorschlag: 2, kategorie: 2,
      fortbildungstage: 3, fortbildungsstunden: 3, dienstbefreiung_tage: 3, dienstbefreiung_stunden: 3,
      kostenuebernahme: 4, eigenanteil: 4,
      restanspruch_tage: 5, beginn_zeitraum: 5,
      bemerkung: 6,
      weitere_leitungskraefte: 7,
    },
    items: {
      fortbildungsantraege: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: ctx.ref('antragsteller'),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
      weitere_leitungskraefte: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldText(r, 'abteilung') || undefined,
      }),
    },
  });
  const f = flow.forms.fortbildungsantraege;

  return (
    <IntentWizardShell
      title={tx('Stellungnahme erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Sichte den Antrag und erfasse deine Stellungnahme als Vorschlag.'),
        needs: [tx('Den offenen Antrag'), tx('Mindestens drei weitere Leitungskräfte')],
      }}
    >
      <WizardStep label={tx('Antrag')} description={tx('Welchen offenen Antrag möchtest du bewerten?')}>
        <EntitySelectStep
          {...flow.picks.fortbildungsantraege.select}
          {...flow.pick('fortbildungsantraege')}
          searchPlaceholder={tx('Titel der Veranstaltung …')}
        />
      </WizardStep>

      <WizardStep label={tx('Genehmigung')} description={tx('Empfiehlst du die Genehmigung? Ordne den Antrag einer Kategorie zu.')} needs={['fortbildungsantraege']}>
        <div className="space-y-4">
          <Bound form={f} name="genehmigung_vorschlag" />
          <Bound form={f} name="kategorie" />
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Tage und Stunden')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Tage & Stunden')} description={tx('Fortbildung und Dienstbefreiung in Tagen oder Stunden.')}>
        <div className="space-y-4">
          <Bound form={f} name="fortbildungstage" />
          <Bound form={f} name="fortbildungsstunden" />
          <Bound form={f} name="dienstbefreiung_tage" />
          <Bound form={f} name="dienstbefreiung_stunden" />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Kosten')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Kosten')} description={tx('Welcher Betrag wird übernommen, was zahlt die Person selbst?')}>
        <div className="space-y-4">
          <Bound form={f} name="kostenuebernahme" />
          <Bound form={f} name="eigenanteil" />
          <StepNav onBack={() => setStep(3)} onNext={() => flow.validateStep(4)} nextStepLabel={tx('Restanspruch')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Restanspruch')} description={tx('Wie viele Fortbildungstage bleiben im 2-Jahres-Zeitraum?')}>
        <div className="space-y-4">
          <Bound form={f} name="restanspruch_tage" />
          <Bound form={f} name="beginn_zeitraum" />
          <StepNav onBack={() => setStep(4)} onNext={() => flow.validateStep(5)} nextStepLabel={tx('Bemerkung')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Bemerkung')} description={tx('Gibt es etwas, das die anderen Leitungskräfte wissen sollten?')}>
        <div className="space-y-4">
          <Bound form={f} name="bemerkung" rows={4} />
          <StepNav onBack={() => setStep(5)} onNext={() => flow.validateStep(6)} nextStepLabel={tx('Leitungskräfte')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Leitungskräfte')} description={tx('Wähle mindestens drei weitere Leitungskräfte für die Abstimmung.')}>
        <div className="space-y-4">
          <Field form={f} name="weitere_leitungskraefte">
            <EntitySelectStep
              {...flow.picks.weitere_leitungskraefte.select}
              {...flow.pickMany('weitere_leitungskraefte')}
              avatar="initials"
              searchPlaceholder={tx('Name suchen …')}
            />
          </Field>
          <StepNav onBack={() => setStep(6)} onNext={() => flow.validateStep(7)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Deine Stellungnahme wird am Antrag gespeichert und die gewählten Leitungskräfte können ihre Rückmeldung geben.')}
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
            { label: tx('Rückmeldung geben'), href: '#/intents/rueckmeldung-geben' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
