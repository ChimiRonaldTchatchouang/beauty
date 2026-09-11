import type { SimOperator } from '@nextiaa/shared';

/** Numéros FICTIFS de test (identité de l'appelant). Aucun numéro réel. */
export const FICTIONAL_NUMBERS: { label: string; value: string }[] = [
  { label: '+237 6 55 00 00 01 (fictif)', value: '+237655000001' },
  { label: '+237 6 77 00 00 02 (fictif)', value: '+237677000002' },
  { label: '+237 6 99 00 00 03 (fictif)', value: '+237699000003' },
];

export const OPERATORS: { value: SimOperator; label: string }[] = [
  { value: 'orange', label: 'Orange' },
  { value: 'mtn', label: 'MTN' },
];

/** Couleur d'accent indicative par opérateur (pur visuel). */
export const OPERATOR_COLOR: Record<SimOperator, string> = {
  orange: '#FF7100',
  mtn: '#FFCC00',
};
