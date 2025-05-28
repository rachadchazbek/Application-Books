export const AWARDS_QUERY = (isbn: string) => `
PREFIX schema: <http://schema.org/>
PREFIX pbs: <http://www.example.org/pbs#>

Select ?book 
    ?name 
    ?isbn 
    ?award


WHERE {
  ?book a schema:Book;
        schema:isbn ?isbn;
        schema:isbn "${isbn}"; 
        schema:award ?award .
}
  GROUP BY ?book ?name ?isbn ?award
`