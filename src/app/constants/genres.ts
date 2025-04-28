import genres from './genres.json';

export const GENRES = genres.results.bindings.map(
    (binding) => binding.genre.value
)