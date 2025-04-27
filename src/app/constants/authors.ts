import authors from './authors.json';

/**
 * Array of all author names extracted from the authors.json file
 */
export const AUTHOR_NAMES: string[] = authors.results.bindings.map(
  (binding) => binding.authorName.value
);
