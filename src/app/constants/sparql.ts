export const SPARQL_QUERY = (filter: string) => `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX ns1: <http://schema.org/>
PREFIX schema: <http://schema.org/>
PREFIX mcc: <http://example.org/mcc#> 
PREFIX pbs: <http://example.org/pbs#> 
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        
SELECT ?book ?title ?author ?publisherName ?inLanguage ?award ?awardYear ?finalAwardName ?finalGenreName ?ageRange ?illustrator  ?countryOfOrigin
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

  ${filter}
}
     `;
export const SPARQL_BABELIO = (filter: string) => `
     PREFIX ns1: <http://schema.org/>
PREFIX pbs: <http://www.example.org/pbs#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?book (SAMPLE(?title) AS ?title) (SAMPLE(?author) AS ?author) (SAMPLE(?publisherName) AS ?publisherName) 
       (SAMPLE(?inLanguage) AS ?inLanguage) (SAMPLE(?illustrator) AS ?illustrator) (SAMPLE(?countryOfOrigin) AS ?countryOfOrigin) 
       (GROUP_CONCAT(DISTINCT ?citation; separator=", ") AS ?citation) (GROUP_CONCAT(DISTINCT ?pressReview; separator=", ") AS ?pressReview) 
       (GROUP_CONCAT(DISTINCT ?review; separator=", ") AS ?review) (SAMPLE(?datePublished) AS ?datePublished) 
       (GROUP_CONCAT(DISTINCT ?genre; separator=", ") AS ?genre) (SAMPLE(?ean) AS ?ean) (SAMPLE(?averageReview) AS ?averageReview)
       (GROUP_CONCAT(DISTINCT ?keywords; separator=", ") AS ?keywords) (SAMPLE(?url) AS ?url) 
       (GROUP_CONCAT(DISTINCT ?distribution; separator=", ") AS ?distribution)
       (GROUP_CONCAT(DISTINCT ?reviewAuthor; separator="@ ") AS ?reviewAuthor)
       (GROUP_CONCAT(DISTINCT ?reviewContent; separator="@ ") AS ?reviewContent)
       (GROUP_CONCAT(DISTINCT ?reviewDatePublished; separator="@ ") AS ?reviewDatePublished)
       (GROUP_CONCAT(DISTINCT ?reviewRating; separator="@ ") AS ?reviewRating)
       (GROUP_CONCAT(DISTINCT ?thumbsUp; separator="@ ") AS ?thumbsUp)
WHERE {
  ?book rdf:type ns1:Book ;
        pbs:infoSource pbs:Babelio .
  OPTIONAL { ?book ns1:name ?title . }
  OPTIONAL { ?book ns1:author ?author . }
  OPTIONAL { ?book ns1:illustrator ?illustrator . }
  OPTIONAL { ?book ns1:countryOfOrigin ?countryOfOrigin . }
  OPTIONAL { 
    ?book ns1:publisher ?publisher .
    ?publisher ns1:name ?publisherName . 
  }
  OPTIONAL { ?book ns1:inLanguage ?inLanguage . }
  OPTIONAL { ?book ns1:datePublished ?datePublished . }
  OPTIONAL { ?book ns1:genre ?genre . }
  OPTIONAL { ?book pbs:averageBabelioReview ?averageReview . } 
  OPTIONAL { ?book pbs:ean ?ean . }
  OPTIONAL { ?book ns1:keywords ?keywords . }
  OPTIONAL { ?book ns1:url ?url . }
  OPTIONAL { 
    ?book pbs:review ?review .
    OPTIONAL { ?review ns1:author ?reviewAuthor . }
    OPTIONAL { ?review ns1:review ?reviewContent . }
    OPTIONAL { ?review ns1:datePublished ?reviewDatePublished . }
    OPTIONAL { ?review pbs:reviewRating ?reviewRating . }
    OPTIONAL { ?review pbs:thumbsUp ?thumbsUp . }
        }
     ${filter}
    }
    GROUP BY ?book
         `;


export const SPARQL_BTLF = `
         PREFIX schema: <http://schema.org/>
         PREFIX pbs: <http://www.example.org/pbs#>
         
         SELECT ?book (SAMPLE(?title) AS ?title) 
                (GROUP_CONCAT(DISTINCT ?author; separator=", ") AS ?author) 
                (SAMPLE(?datePublished) AS ?datePublished) 
                (SAMPLE(?isbn) AS ?isbn) 
                (SAMPLE(?inLanguage) AS ?inLanguage) 
                (GROUP_CONCAT(DISTINCT ?age; separator=", ") AS ?ageRange) 
                (SAMPLE(?mainSubjectThema) AS ?mainSubjectThema) 
                (GROUP_CONCAT(DISTINCT ?subjectThema; separator=", ") AS ?subjectThema)
         WHERE {
           ?book rdf:type schema:Book ;
                 pbs:infoSource pbs:BTLF .
           OPTIONAL { ?book schema:name ?title . }
           OPTIONAL { ?book schema:isbn ?isbn . }
           OPTIONAL { ?book schema:datePublished ?datePublished . }
           OPTIONAL { ?book schema:inLanguage ?inLanguage . }
           OPTIONAL { ?book pbs:age ?age . }
           OPTIONAL { ?book pbs:authorString ?author . }
           OPTIONAL { ?book pbs:mainSubjectThema ?mainSubjectThema . }
           OPTIONAL { ?book pbs:subjectThema ?subjectThema . }
         }
         GROUP BY ?book
         `;

export const SPARQL_BTLF_FILTER = (filter: string) => `
         PREFIX schema: <http://schema.org/>
         PREFIX pbs: <http://www.example.org/pbs#>
         
         SELECT ?book (SAMPLE(?title) AS ?title) 
                (GROUP_CONCAT(DISTINCT ?author; separator=", ") AS ?author) 
                (SAMPLE(?datePublished) AS ?datePublished) 
                (SAMPLE(?isbn) AS ?isbn) 
                (SAMPLE(?inLanguage) AS ?inLanguage) 
                (SAMPLE(?authorURL) AS ?authorURL) 
                (SAMPLE(?illustrator) AS ?illustrator) 
                (SAMPLE(?publisherURL) AS ?publisherURL)
                (GROUP_CONCAT(DISTINCT ?age; separator=", ") AS ?ageRange) 
                (SAMPLE(?mainSubjectThema) AS ?mainSubjectThema) 
                (GROUP_CONCAT(DISTINCT ?subjectThema; separator=", ") AS ?subjectThema)
         WHERE {
           ?book rdf:type schema:Book ;
                 pbs:infoSource pbs:BTLF .
           OPTIONAL { ?book schema:name ?title . }
           OPTIONAL { ?book schema:isbn ?isbn . }
           OPTIONAL { ?book schema:datePublished ?datePublished . }
           OPTIONAL { ?book schema:inLanguage ?inLanguage . }
           OPTIONAL { ?book schema:author ?authorURL . }
           OPTIONAL { ?book schema:illustrator ?illustrator . }
           OPTIONAL { ?book schema:publisher ?publisherURL . }
           OPTIONAL { ?book pbs:age ?age . }
           OPTIONAL { ?book pbs:authorString ?author . }
           OPTIONAL { ?book pbs:mainSubjectThema ?mainSubjectThema . }
           OPTIONAL { ?book pbs:subjectThema ?subjectThema . }
           ${filter}  
         }
         GROUP BY ?book
         `;




export const SPARQL_QUERY_CONSTELLATIONS = (filter: string) => `
          PREFIX ns1: <http://schema.org/>
          PREFIX pbs: <http://www.example.org/pbs#>
          PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
          
          SELECT ?book (SAMPLE(?name) AS ?title) 
                 (GROUP_CONCAT(DISTINCT ?author; separator=", ") AS ?author) 
                 (SAMPLE(?datePublished) AS ?datePublished) 
                 (SAMPLE(?isbn) AS ?isbn) 
                 (GROUP_CONCAT(DISTINCT ?keyword; separator=", ") AS ?keywords) 
                 (SAMPLE(?numberOfPages) AS ?numberOfPages) 
                 (SAMPLE(?publisherName) AS ?publisherName) 
                 (GROUP_CONCAT(DISTINCT ?ageRange; separator=", ") AS ?ageRange) 
                 (SAMPLE(?constellationLink) AS ?constellationLink) 
                 (SAMPLE(?dateEdition) AS ?dateEdition) 
                 (SAMPLE(?isCoupDeCoeur) AS ?isCoupDeCoeur) 
                 (SAMPLE(?reviewAuthor) AS ?reviewAuthor) 
                 (SAMPLE(?reviewContent) AS ?reviewContent) 
                 (SAMPLE(?reviewURL) AS ?reviewURL)
          WHERE {
            ?book rdf:type ns1:Book ;
                  pbs:infoSource pbs:Constellations .
            OPTIONAL { ?book ns1:name ?name . }
            OPTIONAL { ?book ns1:author ?author . }
            OPTIONAL { 
              ?book ns1:publisher ?publisher .
              ?publisher ns1:name ?publisherName . 
            }
            OPTIONAL { ?book ns1:datePublished ?datePublished . }
            OPTIONAL { ?book ns1:isbn ?isbn . }
            OPTIONAL { ?book ns1:keywords ?keyword . }
            OPTIONAL { ?book ns1:numberOfPages ?numberOfPages . }
            OPTIONAL { ?book pbs:ageRange ?ageRange . }
            OPTIONAL { ?book pbs:constellationLink ?constellationLink . }
            OPTIONAL { ?book pbs:dateEdition ?dateEdition . }
            OPTIONAL { ?book pbs:isCoupDeCoeur ?isCoupDeCoeur . }
            OPTIONAL {
              ?review a pbs:Review .
              OPTIONAL { ?review ns1:author ?reviewAuthor . }
              OPTIONAL { ?review ns1:review ?reviewContent . }
              OPTIONAL { ?review ns1:url ?reviewURL . }
              ?book pbs:review ?review .
            }
          ${filter}
          }
          GROUP BY ?book
               `;

export const SPARQL_QUERY_BNF = (filter: string) => `
                PREFIX ns1: <http://schema.org/>
                PREFIX pbs: <http://www.example.org/pbs#>
                PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

                SELECT 
                  ?book 
                  (GROUP_CONCAT(DISTINCT ?author; separator=", ") AS ?author) 
                  (SAMPLE(?bookFormat) AS ?bookFormat)
                  (SAMPLE(?datePublished) AS ?datePublished)
                  (SAMPLE(?description) AS ?description)
                  (SAMPLE(?genre) AS ?genre)
                  (SAMPLE(?language) AS ?inLanguage)
                  (SAMPLE(?isbn) AS ?isbn)
                  (SAMPLE(?name) AS ?title)
                  (SAMPLE(?publisherName) AS ?publisherName)
                  (GROUP_CONCAT(DISTINCT ?ageRange; separator=", ") AS ?ageRange) 
                  (SAMPLE(?bnfLink) AS ?bnfLink)
                  (SAMPLE(?ean) AS ?ean)
                  (SAMPLE(?reviewDatePublished) AS ?reviewDatePublished)
                  (SAMPLE(?reviewContent) AS ?reviewContent)
                  (SAMPLE(?reviewURL) AS ?reviewURL)
                  (SAMPLE(?avis) AS ?avis)
                  (SAMPLE(?source) AS ?source)
                  (SAMPLE(?reviewAuthor) AS ?reviewAuthor)
                WHERE {
                  ?book rdf:type ns1:Book;
                        pbs:infoSource pbs:BNF.
                        
                  OPTIONAL { ?book ns1:author ?author. }
                  OPTIONAL { ?book ns1:bookFormat ?bookFormat. }
                  OPTIONAL { ?book ns1:datePublished ?datePublished. }
                  OPTIONAL { ?book ns1:description ?description. }
                  OPTIONAL { ?book ns1:genre ?genre. }
                  OPTIONAL { ?book ns1:inLanguage ?language. }
                  OPTIONAL { ?book ns1:isbn ?isbn. }
                  OPTIONAL { ?book ns1:name ?name. }
                  OPTIONAL {
                    ?book ns1:publisher ?publisher.
                    ?publisher ns1:name ?publisherName.
                  }
                  OPTIONAL { ?book pbs:ageRange ?ageRange. }
                  OPTIONAL { ?book pbs:bnfLink ?bnfLink. }
                  OPTIONAL { ?book pbs:ean ?ean. }
                  OPTIONAL {
                    ?book pbs:review ?review.
                    ?review rdf:type pbs:Review.
                    OPTIONAL { ?review ns1:author ?reviewAuthor. }
                    OPTIONAL { ?review ns1:datePublished ?reviewDatePublished. }
                    OPTIONAL { ?review ns1:review ?reviewContent. }
                    OPTIONAL { ?review ns1:url ?reviewURL. }
                    OPTIONAL { ?review pbs:avis ?avis. }
                    OPTIONAL { ?review pbs:source ?source. }
                  }
               ${filter}
               }
               GROUP BY ?book
                    `;



export const SPARQL_QUERY_LURELU = `
                    PREFIX ns1: <http://schema.org/>
                    PREFIX pbs: <http://www.example.org/pbs#>
                    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                    
                    SELECT 
                      (SAMPLE(?name) AS ?title) 
                      (GROUP_CONCAT(DISTINCT ?bookAuthor; separator=", ") AS ?author) 
                      (GROUP_CONCAT(DISTINCT ?illustrator; separator=", ") AS ?illustrator)
                      (SAMPLE(?datePublished) AS ?datePublished) 
                      (SAMPLE(?isbn) AS ?isbn) 
                      (SAMPLE(?language) AS ?inLanguage)
                      (SAMPLE(?publisherName) AS ?publisherName) 
                      (SAMPLE(?eruditLink) AS ?eruditLink)
                      (SAMPLE(?lureluLink) AS ?lureluLink)
                      (GROUP_CONCAT(DISTINCT ?reviewAuthor; separator=", ") AS ?reviewAuthor)
                      (GROUP_CONCAT(DISTINCT ?reviewContent; separator=" || ") AS ?reviewContent)
                    WHERE {
                      ?book rdf:type ns1:Book ;
                            pbs:infoSource pbs:Lurelu .
                      
                      OPTIONAL { ?book ns1:author ?bookAuthor . }
                      OPTIONAL { ?book ns1:illustrator ?illustrator . }
                      OPTIONAL { ?book ns1:datePublished ?datePublished . }
                      OPTIONAL { ?book ns1:isbn ?isbn . }
                      OPTIONAL { ?book ns1:inLanguage ?language . }
                      OPTIONAL { ?book ns1:name ?name . }
                      OPTIONAL { ?book ns1:publisher ?publisher . ?publisher ns1:name ?publisherName . }
                      OPTIONAL { ?book pbs:eruditLink ?eruditLink . }
                      OPTIONAL { ?book pbs:lureluLink ?lureluLink . }
                      OPTIONAL {
                        ?book pbs:review ?review .
                        ?review a pbs:Review .
                        OPTIONAL { ?review ns1:author ?reviewAuthor . }
                        OPTIONAL { ?review ns1:review ?reviewContent . }
                      }
                    }
                    GROUP BY ?book
                         `;

export const SPARQL_QUERY_LURELU_FILTER = (filter: string) => `
                    PREFIX ns1: <http://schema.org/>
                    PREFIX pbs: <http://www.example.org/pbs#>
                    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                    
                    SELECT 
                      (SAMPLE(?name) AS ?title) 
                      (GROUP_CONCAT(DISTINCT ?bookAuthor; separator=", ") AS ?author) 
                      (GROUP_CONCAT(DISTINCT ?illustrator; separator=", ") AS ?illustrator)
                      (SAMPLE(?datePublished) AS ?datePublished) 
                      (SAMPLE(?isbn) AS ?isbn) 
                      (SAMPLE(?language) AS ?inLanguage)
                      (SAMPLE(?publisherName) AS ?publisherName) 
                      (SAMPLE(?eruditLink) AS ?eruditLink)
                      (SAMPLE(?lureluLink) AS ?lureluLink)
                      (GROUP_CONCAT(DISTINCT ?reviewAuthor; separator=", ") AS ?reviewAuthor)
                      (GROUP_CONCAT(DISTINCT ?reviewContent; separator=" || ") AS ?reviewContent)
                    WHERE {
                      ?book rdf:type ns1:Book ;
                            pbs:infoSource pbs:Lurelu .
                      
                      OPTIONAL { ?book ns1:author ?bookAuthor . }
                      OPTIONAL { ?book ns1:illustrator ?illustrator . }
                      OPTIONAL { ?book ns1:datePublished ?datePublished . }
                      OPTIONAL { ?book ns1:isbn ?isbn . }
                      OPTIONAL { ?book ns1:inLanguage ?language . }
                      OPTIONAL { ?book ns1:name ?name . }
                      OPTIONAL { ?book ns1:publisher ?publisher . ?publisher ns1:name ?publisherName . }
                      OPTIONAL { ?book pbs:eruditLink ?eruditLink . }
                      OPTIONAL { ?book pbs:lureluLink ?lureluLink . }
                      OPTIONAL {
                        ?book pbs:review ?review .
                        ?review a pbs:Review .
                        OPTIONAL { ?review ns1:author ?reviewAuthor . }
                        OPTIONAL { ?review ns1:review ?reviewContent . }
                      }
                      ${filter}
                    }
                    GROUP BY ?book
                         `;

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


