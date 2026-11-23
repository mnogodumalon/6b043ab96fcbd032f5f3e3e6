import type { EnrichedFortbildungsantraege, EnrichedPersonen, EnrichedRueckmeldungenDerLeitungskraefte } from '@/types/enriched';
import type { Fortbildungsantraege, Personen, RueckmeldungenDerLeitungskraefte, Standorte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import { displayPart } from '@/lib/journey/rules';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => displayPart(r.fields[f])).filter(Boolean).join(' ').trim();
}

interface PersonenMaps {
  standorteMap: Map<string, Standorte>;
}

export function enrichPersonen(
  personen: Personen[],
  maps: PersonenMaps
): EnrichedPersonen[] {
  return personen.map(r => ({
    ...r,
    standortName: resolveDisplay(r.fields.standort, maps.standorteMap, 'bezeichnung'),
  }));
}

interface FortbildungsantraegeMaps {
  personenMap: Map<string, Personen>;
}

export function enrichFortbildungsantraege(
  fortbildungsantraege: Fortbildungsantraege[],
  maps: FortbildungsantraegeMaps
): EnrichedFortbildungsantraege[] {
  return fortbildungsantraege.map(r => ({
    ...r,
    antragstellerName: resolveDisplay(r.fields.antragsteller, maps.personenMap, 'vorname', 'nachname'),
    leitungskraftName: resolveDisplay(r.fields.leitungskraft, maps.personenMap, 'vorname', 'nachname'),
    weitere_leitungskraefteName: resolveDisplay(r.fields.weitere_leitungskraefte, maps.personenMap, 'vorname', 'nachname'),
  }));
}

interface RueckmeldungenDerLeitungskraefteMaps {
  fortbildungsantraegeMap: Map<string, Fortbildungsantraege>;
  personenMap: Map<string, Personen>;
}

export function enrichRueckmeldungenDerLeitungskraefte(
  rueckmeldungenDerLeitungskraefte: RueckmeldungenDerLeitungskraefte[],
  maps: RueckmeldungenDerLeitungskraefteMaps
): EnrichedRueckmeldungenDerLeitungskraefte[] {
  return rueckmeldungenDerLeitungskraefte.map(r => ({
    ...r,
    antragName: resolveDisplay(r.fields.antrag, maps.fortbildungsantraegeMap, 'titel'),
    leitungskraftName: resolveDisplay(r.fields.leitungskraft, maps.personenMap, 'vorname', 'nachname'),
  }));
}
