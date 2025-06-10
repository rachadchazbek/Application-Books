
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
        (GROUP_CONCAT(DISTINCT ?preferredIllustratorName; separator="; ") AS ?illustratorList)
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

    # Construction of illustrator name
    OPTIONAL {
        ?book schema:illustrator ?illustrator .
        OPTIONAL { ?illustrator schema:name ?sIllustratorName . }
        OPTIONAL { ?illustrator schema:givenName ?gIllustratorName . }
        OPTIONAL { ?illustrator schema:familyName ?fIllustratorName . }

        OPTIONAL {
            FILTER(BOUND(?gIllustratorName) && BOUND(?fIllustratorName))
            BIND(CONCAT(STR(?gIllustratorName), " ", STR(?fIllustratorName)) AS ?constructedFullIllustratorName)
        }

    }
    
    BIND(
    COALESCE(
        ?constructedFullIllustratorName, # Priority 1: "givenName familyName"
        ?sIllustratorName,               # Priority 2: schema:name
        ?fIllustratorName,               # Priority 3: schema:familyName (if sName and constructedFullName are not available)
        ?gIllustratorName                # Priority 4: schema:givenName (if sName, constructedFullName, and fName are not available)
        
    ) AS ?preferredIllustratorName
  )

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

    ${filter}

    BIND(CONCAT(?givenName, " ", ?familyName) AS ?authorName)
}

GROUP BY ?book ?name ?isbn ?datePublished ?publisherName ?premiereCouverture ?typicalAgeRangeBTLF ?typicalAgeRangeConstellations ?typicalAgeRangeBNF ?genre ?language ?collectionName ?locationPublishedName ?numberOfAwards ?isAvailable

`;
