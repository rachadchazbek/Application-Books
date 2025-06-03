import nationality from './nationality.json';

/**
 * Array of all nationalities extracted from nationality.json
 */
export const NATIONALITIES: string[] = nationality.results.bindings.map(
  (binding) => binding.nationality.value
);

/**
 * Simplified mapping of nationality options
 */
export const COUNTRY_NAMES: Record<string, string> = {
  'QC': 'Québec',
  'OT': 'Non spécifié',
};
