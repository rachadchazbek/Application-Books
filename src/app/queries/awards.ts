// export const AWARDS_QUERY = (isbn: string) => `
// PREFIX schema: <http://schema.org/>
// PREFIX pbs: <http://www.example.org/pbs#>

// Select ?book 
//     ?name 
//     ?isbn 
//     ?award


// WHERE {
//   ?book a schema:Book;
//         schema:isbn ?isbn;
//         schema:isbn "${isbn}"; 
//         schema:award ?award .
// }
//   GROUP BY ?book ?name ?isbn ?award
// `

export const AWARDS_QUERY = (isbn: string) => `
PREFIX schema: <http://schema.org/>
PREFIX pbs: <http://www.example.org/pbs#>
PREFIX mcc: <http://example.org/mcc#>
select DISTINCT ?awardName ?year ?award where {
    ?book a schema:Book  ;
        schema:isbn "${isbn}" .
    
    []  mcc:MCC-R37 ?book ;
        mcc:MCC-R35-4 ?year ;
        pbs:award ?award .       
        
        ?award a pbs:Award;
    schema:name ?awardName.
} 
  GROUP BY ?awardName ?year ?award
`