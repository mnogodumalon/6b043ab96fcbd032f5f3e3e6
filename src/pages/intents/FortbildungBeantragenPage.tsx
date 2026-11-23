/**
 * Fortbildung beantragen — 8-Schritt-Wizard.
 * Steps: 1) Antragsteller/in → 2) Veranstaltung → 3) Beginn & Ende → 4) Arbeitsbefreiung → 5) Kosten
 *        → 6) Ausschreibung → 7) Leitungskraft → 8) Prüfen & absenden.
 * Reads: personen. Writes: fortbildungsantraege (status = antrag_gestellt).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText } from '@/lib/journey';
import { useFortbildungBeantragenFlow } from '@/lib/journey/flows/FortbildungBeantragen';
import { tx } from '@/i18n';

export default function FortbildungBeantragenPage() {
  const [step, setStep] = useState(1);
  const flow = useFortbildungBeantragenFlow({
    steps: {
      antragsteller: 1,
      titel: 2, veranstalter: 2, ort: 2, zielgruppe: 2,
      beginn: 3, ende: 3,
      arbeitsbefreiung_tage: 4, arbeitsbefreiung_stunden: 4,
      kosten_unterkunft_verpflegung: 5, kursgebuehren: 5, fahrtkosten: 5, gesamtkosten: 5,
      tatsaechliche_kosten: 5, kostenuebernahme: 5,
      ausschreibung: 6, ausschreibung_link: 6,
      leitungskraft: 7,
    },
    items: {
      antragsteller: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldText(r, 'abteilung'),
      }),
      leitungskraft: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldText(r, 'abteilung'),
      }),
    },
  });
  const f = flow.forms.fortbildungsantraege;

  return (
    <IntentWizardShell
      title={tx('Fortbildung beantragen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Stelle deinen Fortbildungsantrag mit Kosten und Ausschreibung.'),
        needs: [tx('Titel und Veranstalter'), tx('Zeitraum und Kosten'), tx('Ausschreibung als Datei oder Link')],
      }}
    >
      <WizardStep label={tx('Antragsteller/in')} description={tx('Wer beantragt die Fortbildung?')}>
        <EntitySelectStep {...flow.picks.antragsteller.select} {...flow.pick('antragsteller')} searchPlaceholder={tx('Name suchen …')} />
      </WizardStep>

      <WizardStep label={tx('Veranstaltung')} description={tx('Worum geht es und wer richtet sie aus?')}>
        <div className="space-y-4">
          <Bound form={f} name="titel" />
          <Bound form={f} name="veranstalter" />
          <Bound form={f} name="ort" />
          <Bound form={f} name="zielgruppe" />
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Zeitraum')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Zeitraum')} description={tx('Wann beginnt und endet die Veranstaltung?')}>
        <div className="space-y-4">
          <Bound form={f} name="beginn" />
          <Bound form={f} name="ende" />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Arbeitsbefreiung')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Arbeitsbefreiung')} description={tx('Wie viel Zeit brauchst du dafür frei?')}>
        <div className="space-y-4">
          <Bound form={f} name="arbeitsbefreiung_tage" />
          <Bound form={f} name="arbeitsbefreiung_stunden" />
          <StepNav onBack={() => setStep(3)} onNext={() => flow.validateStep(4)} nextStepLabel={tx('Kosten')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Kosten')} description={tx('Was kostet die Fortbildung?')}>
        <div className="space-y-4">
          <Bound form={f} name="kosten_unterkunft_verpflegung" />
          <Bound form={f} name="kursgebuehren" />
          <Bound form={f} name="fahrtkosten" />
          <Bound form={f} name="gesamtkosten" />
          <Bound form={f} name="tatsaechliche_kosten" />
          <Bound form={f} name="kostenuebernahme" />
          <StepNav onBack={() => setStep(4)} onNext={() => flow.validateStep(5)} nextStepLabel={tx('Ausschreibung')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Ausschreibung')} description={tx('Füge die Ausschreibung als Datei oder Link bei.')}>
        <div className="space-y-4">
          <Bound form={f} name="ausschreibung" />
          <Bound form={f} name="ausschreibung_link" />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => {
              if (!f.get('ausschreibung') && !f.get('ausschreibung_link')) {
                return tx('Bitte eine Ausschreibung als Datei oder Link beifügen.');
              }
              return flow.validateStep(6);
            }}
            nextStepLabel={tx('Leitungskraft')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Leitungskraft')} description={tx('Wer ist die zuständige Leitungskraft?')}>
        <EntitySelectStep {...flow.picks.leitungskraft.select} {...flow.pick('leitungskraft')} searchPlaceholder={tx('Name suchen …')} />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'status', label: tx('Status'), value: tx('Antrag gestellt') }]}
            whatHappensNext={tx('Die zuständige Leitungskraft erfasst danach ihre Stellungnahme.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Stellungnahme erfassen'), href: '#/intents/stellungnahme-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
