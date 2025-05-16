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

    ?book pbs:similarTo  ?similarTo . 
            ?similarTo a schema:Book ;
            schema:name ?similarBookName . 
}
GROUP BY ?book ?similarTo ?similarBookName  
`