
export const UNIFIED_SPARQL_QUERY = (filter: string) => `
PREFIX schema: <http://schema.org/>
PREFIX pbs: <http://www.example.org/pbs#>
PREFIX luc-index: <http://www.ontotext.com/connectors/lucene/instance#>
PREFIX luc: <http://www.ontotext.com/connectors/lucene#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?book
        ?isbn
       ?name
       (GROUP_CONCAT(DISTINCT ?authorName; separator= ", ") AS ?authorList)
       ?datePublished 
       ?publisherName
       ?premiereCouverture
       ?genre
       ?typicalAgeRangeBTLF
       ?typicalAgeRangeConstellations
       ?typicalAgeRangeBNF
       ?language
       ?collectionName
       ?locationPublishedName
       ?numberOfAwards
       ?isAvailable


WHERE {
  ?book a schema:Book ;
        schema:isbn ?isbn ;
        schema:name ?name ;
        schema:author ?author ;
        schema:datePublished ?datePublished ;
        pbs:infoSource ?infoSource ;
        pbs:infoSource pbs:MainSource ;
        pbs:dataFrom ?dataFrom ;
        schema:publisher ?publisher .
    
  ?author schema:nationality ?nationality ;
        schema:givenName ?givenName ;
        schema:familyName ?familyName .

  ?publisher schema:name ?publisherName .
  
  OPTIONAL {?book schema:offers ?isAvailable .}
  OPTIONAL {?book pbs:premiereCouverture ?premiereCouverture }
  OPTIONAL{?book pbs:typicalAgeRangeBTLF ?typicalAgeRangeBTLF;}
  OPTIONAL {?book pbs:typicalAgeRangeConstellations ?typicalAgeRangeConstellations;}         
  OPTIONAL {?book pbs:typicalAgeRangeBNF ?typicalAgeRangeBNF;}
  OPTIONAL {?book schema:genre ?genreNode. ?genreNode pbs:nomSDM ?genre .}
  OPTIONAL {?book schema:award ?numberOfAwards .}
  OPTIONAL{?book schema:inLanguage ?languageNode. ?languageNode rdfs:label ?language .}

    OPTIONAL {
        ?book schema:isPartOf ?collection .
        ?collection schema:name ?collectionName .
    }
    
    OPTIONAL {
        ?book schema:locationCreated ?locationPublished .
        ?locationPublished schema:name ?locationPublishedName .
    }

    BIND(CONCAT(?givenName, " ", ?familyName) AS ?authorName)

    ${filter}

}

GROUP BY ?book ?name ?isbn ?datePublished ?publisherName ?premiereCouverture ?typicalAgeRangeBTLF ?typicalAgeRangeConstellations ?typicalAgeRangeBNF ?genre ?language ?collectionName ?locationPublishedName ?numberOfAwards ?isAvailable

`;
