

export const BOOK_QUERY = (isbn: string) => `
PREFIX schema: <http://schema.org/>
PREFIX pbs: <http://www.example.org/pbs#>

Select ?book ?name ?isbn ?premiereCouverture ?datePublished ?description ?publisherName
WHERE {
  ?book a schema:Book;
        schema:isbn ?isbn;
        schema:isbn "${isbn}";
        schema:name ?name ;
        schema:datePublished ?datePublished ;
        schema:description ?description .

  ?publisher schema:name ?publisherName .

  OPTIONAL {?book pbs:premiereCouverture ?premiereCouverture }
}
`


export const UNIFIED_SPARQL_QUERY = (filter: string) => `
PREFIX schema: <http://schema.org/>
PREFIX pbs: <http://www.example.org/pbs#>
PREFIX luc-index: <http://www.ontotext.com/connectors/lucene/instance#>
PREFIX luc: <http://www.ontotext.com/connectors/lucene#>
SELECT ?book
        ?isbn
       ?name
        (GROUP_CONCAT(DISTINCT ?authorName; separator= ", ") AS ?authorList)
       ?datePublished 
       ?publisherName
       ?premiereCouverture
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

  OPTIONAL {?book pbs:premiereCouverture ?premiereCouverture }

    ${filter}
    
    BIND(CONCAT(?givenName, " ", ?familyName) AS ?authorName)  
}

GROUP BY ?book ?name ?isbn ?datePublished ?publisherName ?premiereCouverture

`;

/**
 * Wikidata query to get author information - different structure from the book queries
 */
export const SPARQL_WIKIDATA = (authorName: string) => `
SELECT 
  ?person 
  ?personLabel 
  ?dateOfBirth 
  ?placeOfBirth ?placeOfBirthLabel 
  ?occupation ?occupationLabel 
  ?countryOfCitizenship ?countryOfCitizenshipLabel 
  ?education ?educationLabel
  ?website
  ?gender ?genderLabel
  ?languageSpoken ?languageSpokenLabel
  ?notableWork ?notableWorkLabel
  ?awardReceived ?awardReceivedLabel
  ?babelioAuthorID
  ?wikidataLink
WHERE {
  ?person wdt:P31 wd:Q5;            # instance of human
          rdfs:label "${authorName}"@fr. # label is the author's name
  
  OPTIONAL { ?person wdt:P569 ?dateOfBirth. }       # date of birth
  OPTIONAL { ?person wdt:P19 ?placeOfBirth. }       # place of birth
  OPTIONAL { 
    ?person wdt:P106 ?occupation.                   # occupation
    ?occupation wdt:P279* wd:Q36180.                # occupation is a subclass of writer
  }
  OPTIONAL { ?person wdt:P27 ?countryOfCitizenship. } # country of citizenship
  OPTIONAL { ?person wdt:P69 ?education. }            # educated at
  OPTIONAL { ?person wdt:P856 ?website. }             # official website
  OPTIONAL { ?person wdt:P21 ?gender. }               # gender
  OPTIONAL { ?person wdt:P1412 ?languageSpoken. }     # languages spoken
  OPTIONAL { ?person wdt:P800 ?notableWork. }         # notable work
  OPTIONAL { ?person wdt:P166 ?awardReceived. }       # awards received
  OPTIONAL { ?person wdt:P3630 ?babelioAuthorID. }    # Babelio author ID

  BIND(IRI(CONCAT("https://www.wikidata.org/wiki/", STRAFTER(STR(?person), "http://www.wikidata.org/entity/"))) AS ?wikidataLink)

  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],fr". }
}
`;

/**
 * Query for book descriptions and award information
 */
export const SPARQL_QUERY_DESCRIPTION = (filter: string) => `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX ns1: <http://schema.org/>
PREFIX schema: <http://schema.org/>
PREFIX mcc: <http://example.org/mcc#> 
PREFIX pbs: <http://example.org/pbs#> 
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        
SELECT ?book ?title ?author ?publisherName ?inLanguage ?award ?awardYear ?finalAwardName ?finalGenreName ?ageRange ?finalAwardDescription ?illustrator  ?countryOfOrigin
WHERE {
  ?book rdf:type ns1:Book .
  OPTIONAL { ?book ns1:name ?title . }
  OPTIONAL { ?book ns1:author ?author . }
  OPTIONAL { ?book ns1:illustrator ?illustrator . }
  OPTIONAL { ?book ns1:countryOfOrigin ?countryOfOrigin . }
  OPTIONAL { ?book ns1:publisher ?publisher .
    ?publisher ns1:name ?publisherName . }
  OPTIONAL { ?book ns1:inLanguage ?inLanguage . }
  
  OPTIONAL {
    ?award mcc:R37 ?book .
    ?award mcc:MCC-R35-4 ?awardYear .
    ?award pbs:award ?awardName .
    OPTIONAL {
      ?awardName schema:name ?name .
    }
    OPTIONAL {
      ?awardName schema:description ?description .
    }
    OPTIONAL {
      ?awardName pbs:genreLittéraire ?awardGenre .
      ?awardGenre rdfs:label ?genreName .
    }
    OPTIONAL {
      ?awardName pbs:groupeAge ?childAgeRange .
    }
    OPTIONAL {
      ?parentAward skos:narrower ?awardName .
      OPTIONAL {
        ?parentAward schema:name ?parentName .
      }
      OPTIONAL {
        ?parentAward schema:description ?parentDescription .
      }
      OPTIONAL {
        ?parentAward pbs:groupeAge ?parentAgeRange .
      }
      OPTIONAL {
        ?parentAward pbs:genreLittéraire ?parentGenre .
        ?parentGenre rdfs:label ?parentGenreName .
      }
    }
  }

  BIND (COALESCE(?name, ?parentName, "") AS ?finalAwardName)
  BIND (IF(BOUND(?genreName), ?genreName, IF(BOUND(?parentGenreName), ?parentGenreName, "")) AS ?finalGenreName)
  BIND (IF(BOUND(?childAgeRange), ?childAgeRange, IF(BOUND(?parentAgeRange), ?parentAgeRange, "")) AS ?ageRange)
  BIND (COALESCE(?description, ?parentDescription, "") AS ?finalAwardDescription)

  ${filter}
}
`;
