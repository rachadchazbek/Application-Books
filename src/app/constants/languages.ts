import languages from './languages.json'

export const LANGUAGES = languages.results.bindings.map(
    (binding) => binding.language.value
)