// Copie du calendrier de src/content/health.ts (codes, libellés, âges) pour la
// fonction serveur. Un test vérifie que les deux restent identiques.
export const VACCINE_DOSES = [
  { code: 'hexa-1', label: 'DTCaP-Hib-hépatite B (1re dose)', months: 2 },
  { code: 'pneumo-1', label: 'Pneumocoque (1re dose)', months: 2 },
  { code: 'rota-1', label: 'Rotavirus (1re dose)', months: 2 },
  { code: 'menb-1', label: 'Méningocoque B (1re dose)', months: 3 },
  { code: 'rota-2', label: 'Rotavirus (2e dose)', months: 3 },
  { code: 'hexa-2', label: 'DTCaP-Hib-hépatite B (2e dose)', months: 4 },
  { code: 'pneumo-2', label: 'Pneumocoque (2e dose)', months: 4 },
  { code: 'rota-3', label: 'Rotavirus (3e dose, selon le vaccin)', months: 4 },
  { code: 'menb-2', label: 'Méningocoque B (2e dose)', months: 5 },
  { code: 'menacwy-1', label: 'Méningocoques ACWY (1re dose)', months: 6 },
  { code: 'pneumo-3', label: 'Pneumocoque (3e dose, nouveau schéma)', months: 6 },
  { code: 'hexa-3', label: 'DTCaP-Hib-hépatite B (rappel)', months: 11 },
  { code: 'pneumo-r', label: 'Pneumocoque (rappel)', months: 11 },
  { code: 'ror-1', label: 'ROR (1re dose)', months: 12 },
  { code: 'menacwy-r', label: 'Méningocoques ACWY (rappel)', months: 12 },
  { code: 'menb-r', label: 'Méningocoque B (rappel)', months: 12 },
  { code: 'ror-2', label: 'ROR (2e dose)', months: 16 },
]
