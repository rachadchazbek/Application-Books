

export const BOOK_QUERY = (isbn: string) => `
PREFIX schema: <http://schema.org/>
PREFIX pbs: <http://www.example.org/pbs#>

Select ?book 
    ?name 
    ?isbn 
    ?premiereCouverture 
    ?datePublished 
    ?description 
    ?infoSource 
    ?publisherName 
    ?similarTo
    ?similarBookName
    ?collectionName

WHERE {
  ?book a schema:Book;
        schema:isbn ?isbn;
        schema:isbn "${isbn}";
        schema:name ?name ;
        schema:datePublished ?datePublished ;
        schema:publisher ?publisher ;
        pbs:infoSource ?infoSource .
    
  ?publisher schema:name ?publisherName .

  OPTIONAL {?book pbs:premiereCouverture ?premiereCouverture }

  OPTIONAL {?book pbs:similarTo  ?similarTo . 
              ?similarTo a schema:Book ;
                  schema:name ?similarBookName .}

  OPTIONAL {
    ?book schema:isPartOf ?collection .
    ?collection schema:name ?collectionName .
  }

  OPTIONAL {?book  schema:description ?description .}
}
  GROUP BY ?book ?name ?isbn ?premiereCouverture ?datePublished ?publisherName ?description ?infoSource ?similarTo ?similarBookName ?collectionName
`

