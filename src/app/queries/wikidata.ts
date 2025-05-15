
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
