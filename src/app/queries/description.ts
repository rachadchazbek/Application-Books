
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
