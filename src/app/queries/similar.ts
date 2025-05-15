export const similarBooksQuery = (isbn: string) => `
PREFIX schema: <http://schema.org/>
PREFIX pbs: <http://www.example.org/pbs#>

Select ?book 
    ?similarTo
    ?similarBookName
    


WHERE {
    ?book a schema:Book ;
            schema:isbn ?isbn ;
            schema:isbn "${isbn}" .

    OPTIONAL {?book pbs:similarTo  ?similarTo . 
              ?similarTo a schema:Book ;
                  schema:name ?similarBookName . }
  OPTIONAL {?book  schema:description ?description . }
}
GROUP BY ?book ?similarTo ?similarBookName  
`
// This query retrieves books that are similar to the one with the specified ISBN.
// It selects the book, its similar books, and their names.
// The query uses the `OPTIONAL` keyword to include similar books and their names if they exist.
    