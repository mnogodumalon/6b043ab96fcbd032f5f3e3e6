import type { Fortbildungsantraege, Personen, RueckmeldungenDerLeitungskraefte } from './app';

export type EnrichedPersonen = Personen & {
  standortName: string;
};

export type EnrichedFortbildungsantraege = Fortbildungsantraege & {
  antragstellerName: string;
  leitungskraftName: string;
  weitere_leitungskraefteName: string;
};

export type EnrichedRueckmeldungenDerLeitungskraefte = RueckmeldungenDerLeitungskraefte & {
  antragName: string;
  leitungskraftName: string;
};
