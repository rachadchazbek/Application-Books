import { Injectable } from '@angular/core';
import { BookFilter } from '../models/book-filter.model';
import { 
  SPARQL_WIKIDATA,
  SPARQL_QUERY_DESCRIPTION,
  UNIFIED_SPARQL_QUERY
} from '../constants/sparql';
import { Appreciation } from '../constants/Appreciation';

/**
 * Enhanced SPARQL Query Builder Service
 * 
 * This service is responsible for building SPARQL queries based on the unified BookFilter model.
 * It provides methods to generate queries for different filter combinations and data sources.
 */
@Injectable({
  providedIn: 'root'
})
export class EnhancedSparqlQueryBuilderService {

  constructor() {
    // No initialization needed
  }

  /**
   * Get standard prefixes used in all queries
   * @returns A string containing all standard SPARQL prefixes
   */
  private getStandardPrefixes(): string {
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX ns1: <http://schema.org/>
PREFIX schema: <http://schema.org/>
PREFIX mcc: <http://example.org/mcc#> 
PREFIX pbs: <http://example.org/pbs#> 
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>`;
  }
  
  /**
   * Build the SELECT clause with all needed variables
   * @returns A string containing the SELECT clause
   */
  private buildSelectClause(): string {
    return `SELECT ?book ?title ?author ?publisherName ?inLanguage ?award ?awardYear 
       ?finalAwardName ?finalGenreName ?ageRange ?illustrator ?countryOfOrigin`;
  }
  
  /**
   * Build the core WHERE clause with all OPTIONAL patterns
   * @returns A string containing the WHERE clause patterns
   */
  private buildWhereClause(): string {
    return `  ?book rdf:type ns1:Book .
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
  BIND (IF(BOUND(?childAgeRange), ?childAgeRange, IF(BOUND(?parentAgeRange), ?parentAgeRange, "")) AS ?ageRange)`;
  }
  
  /**
   * Build the GROUP BY clause if needed
   * @returns A string containing the GROUP BY clause, or empty string if not needed
   */
  private buildGroupByClause(): string {
    return ''; // Default to no GROUP BY, override in specific query methods if needed
  }

  /**
   * Helper method to escape special characters in SPARQL string literals
   * @param value The string to escape
   * @returns The escaped string
   */
  private escapeSparqlString(value: string): string {
    if (!value) return '';
    return value.replace(/"/g, '\\"');
  }

  /**
   * Build unified filter clauses that work across all sources
   * @param filters Complete BookFilter object with all filter criteria
   * @returns A string containing all filter clauses
   */
  buildUnifiedFilterClauses(filters: BookFilter): string[] {
    const clauses: string[] = [];
    
    // Source filter
    if (filters.source) {
      clauses.push(`?book pbs:infoSource pbs:${filters.source}`);
    }
    
    // Basic book properties
    if (filters.title) {
      const escapedTitle = this.escapeSparqlString(filters.title);
      clauses.push(`FILTER(CONTAINS(LCASE(?title), LCASE("${escapedTitle}")))`);
    }
    
    if (filters.isbn) {
      const escapedIsbn = this.escapeSparqlString(filters.isbn);
      clauses.push(`FILTER(LCASE(?isbn) = LCASE("${escapedIsbn}"))`);
    }
    
    if (filters.inLanguage) {
      const escapedLanguage = this.escapeSparqlString(filters.inLanguage);
      clauses.push(`FILTER(LCASE(?inLanguage) = LCASE("${escapedLanguage}"))`);
    }
    
    // Creator properties
    if (filters.author) {
      const escapedAuthor = this.escapeSparqlString(filters.author);
      clauses.push(`FILTER(CONTAINS(LCASE(?author), LCASE("${escapedAuthor}")))`);
    }
    
    if (filters.nationality) {
      const escapedNationality = this.escapeSparqlString(filters.nationality);
      clauses.push(`FILTER(CONTAINS(LCASE(?countryOfOrigin), LCASE("${escapedNationality}")))`);
    }
    
    if (filters.illustrator) {
      const escapedIllustrator = this.escapeSparqlString(filters.illustrator);
      clauses.push(`FILTER(CONTAINS(LCASE(?illustrator), LCASE("${escapedIllustrator}")))`);
    }
    
    // Classification properties
    if (filters.genre) {
      const escapedGenre = this.escapeSparqlString(filters.genre);
      clauses.push(`FILTER(CONTAINS(LCASE(?genreValue), LCASE("${escapedGenre}")))`);
    }
    
    if (filters.subjectThema) {
      const escapedSubject = this.escapeSparqlString(filters.subjectThema);
      clauses.push(`FILTER(CONTAINS(LCASE(?subjectThema), LCASE("${escapedSubject}")))`);
    }
    
    // Age range filter
    if (filters.ageRange && filters.ageRange.length > 0) {
      const ageConditions = filters.ageRange.map(age => 
        `CONTAINS(STR(?typicalAgeRange), "${this.escapeSparqlString(age)}")`
      );
      clauses.push(`FILTER(${ageConditions.join(' || ')})`);
    }
    
    // Additional metadata
    if (filters.publisher) {
      const escapedPublisher = this.escapeSparqlString(filters.publisher);
      clauses.push(`FILTER(CONTAINS(LCASE(?publisherName), LCASE("${escapedPublisher}")))`);
    }
    
    if (filters.datePublished) {
      const escapedDate = this.escapeSparqlString(filters.datePublished);
      clauses.push(`FILTER(?datePublished = "${escapedDate}")`);
    }
    
    if (filters.award) {
      const escapedAward = this.escapeSparqlString(filters.award);
      clauses.push(`FILTER(CONTAINS(LCASE(?awards), LCASE("${escapedAward}")))`);
    }
    
    // Category-specific filters
    if (filters.category) {
      if (filters.source === 'Babelio') {
        const starRating = parseInt(filters.category.split(' ')[0], 10);
        if (!isNaN(starRating)) {
          clauses.push(`FILTER(?averageReview >= ${starRating})`);
        }
      } else if (filters.source === 'Constellation' && filters.category === 'Coup de Coeur') {
        clauses.push(`FILTER(?isCoupDeCoeur = true)`);
      } else if (filters.source === 'BNF') {
        const escapedCategory = this.escapeSparqlString(filters.category);
        clauses.push(`FILTER(?avis = "${escapedCategory}")`);
      }
    }
    
    // Appreciation filters
    if (filters.appreciation === Appreciation.HighlyAppreciated) {
      clauses.push(`
      {
        ?book pbs:infoSource pbs:Babelio .
        FILTER(?averageReview >= 4)
      } UNION {
        ?book pbs:infoSource pbs:BNF .
        FILTER(?avis = "Coup de coeur !" || ?avis = "Bravo !")
      } UNION {
        ?book pbs:infoSource pbs:Constellations .
        FILTER(?isCoupDeCoeur = true)
      } UNION {
        ?book pbs:infoSource pbs:Lurelu
      }
      `);
    } else if (filters.appreciation === Appreciation.NotHighlyAppreciated) {
      clauses.push(`
      {
        ?book pbs:infoSource pbs:Babelio .
        FILTER(?averageReview <= 3)
      } UNION {
        ?book pbs:infoSource pbs:BNF .
        FILTER(?avis = "Hélas !" || ?avis = "Problème...")
      }
      `);
    }
    
    return clauses;
  }

  /**
   * Build a unified query that works across all sources
   * @param filters Complete BookFilter object with all filter criteria
   * @returns A complete SPARQL query string
   */
  buildUnifiedQuery(filters: BookFilter): string {
    // Build filter clauses based on the unified filter model
    const filterClauses = this.buildUnifiedFilterClauses(filters);
    const filterString = filterClauses.length > 0 ? filterClauses.join(' .\n') : '';
    
    // Use the unified query template that works for all sources
    return UNIFIED_SPARQL_QUERY(filterString);
  }

  /**
   * Build a comprehensive query with multiple filters
   * @param filters Complete BookFilter object with all filter criteria
   * @returns A complete SPARQL query string
   */
  buildComprehensiveQuery(filters: BookFilter): string {
    // Use the new unified query approach that works for all sources and filters
    return this.buildUnifiedQuery(filters);
  }

  /**
   * Build filter clauses for the SPARQL query based on the provided filters
   * @param filters The BookFilter object containing all active filters
   * @returns An array of filter clause strings
   */
  private buildFilterClauses(filters: BookFilter): string[] {
    const clauses: string[] = [];
    
    // Basic book properties
    if (filters.title) {
      // Use CONTAINS for partial title matching
      clauses.push(`FILTER(CONTAINS(LCASE(?title), LCASE("${filters.title}")))`);
    }
    
    if (filters.isbn) {
      // ISBN should be exact match but case insensitive
      clauses.push(`FILTER(LCASE(?isbn) = LCASE("${filters.isbn}"))`);
    }
    
    if (filters.inLanguage) {
      // Language should be exact match but case insensitive
      clauses.push(`FILTER(LCASE(?inLanguage) = LCASE("${filters.inLanguage}"))`);
    }
    
    // Creator properties
    if (filters.author) {
      // Use CONTAINS for partial author name matching
      clauses.push(`FILTER(CONTAINS(LCASE(?author), LCASE("${filters.author}")))`);
    }
    
    if (filters.nationality) {
      // Use CONTAINS for nationality matching
      clauses.push(`FILTER(CONTAINS(LCASE(?countryOfOrigin), LCASE("${filters.nationality}")))`);
    }
    
    if (filters.illustrator) {
      // Use CONTAINS for partial illustrator name matching
      clauses.push(`FILTER(CONTAINS(LCASE(?illustrator), LCASE("${filters.illustrator}")))`);
    }
    
    // Classification properties
    if (filters.genre) {
      // Genre should be exact match but case insensitive
      clauses.push(`FILTER(LCASE(?finalGenreName) = LCASE("${filters.genre}"))`);
    }
    
    if (filters.subjectThema) {
      // Use CONTAINS for subject matching
      clauses.push(`FILTER(CONTAINS(LCASE(?subjectThema), LCASE("${filters.subjectThema}")))`);
    }
    
    // Educational properties
    if (filters.ageRange && filters.ageRange.length > 0) {
      const ageFilters = filters.ageRange.map(age => 
        `(STR(?ageRange) = "${age}" || STR(?ageRange) = "${age}," || STR(?ageRange) = ",${age}" || CONTAINS(STR(?ageRange), ",${age},"))`
      );
      clauses.push(`FILTER(${ageFilters.join(' || ')})`);
    }
    
    // Additional metadata
    if (filters.publisher) {
      // Use CONTAINS for partial publisher name matching
      clauses.push(`FILTER(CONTAINS(LCASE(?publisherName), LCASE("${filters.publisher}")))`);
    }
    
    if (filters.datePublished) {
      // Date published should be exact match
      clauses.push(`FILTER(?datePublished = "${filters.datePublished}")`);
    }
    
    if (filters.award) {
      // Use CONTAINS for partial award name matching
      clauses.push(`FILTER(CONTAINS(LCASE(?finalAwardName), LCASE("${filters.award}")))`);
    }
    
    return clauses;
  }

  /**
   * Compatibility method to match SparklQueryBuilderService.getAgeFilter
   * @param age The age value
   * @returns A filter string for the query
   */
  buildAgeFilter(age: string): string {
    return `FILTER(STR(?ageRange) = "${age}" || STR(?ageRange) = "${age}," || STR(?ageRange) = ",${age}" || CONTAINS(STR(?ageRange), ",${age},"))`;
  }

  /**
   * Build a similarity search query for finding books similar to a given book
   * @param bookUri URI of the book to find similar books for
   * @returns A SPARQL query string
   */
  buildSimilaritySearchQuery(bookUri: string): string {
    return `${this.getStandardPrefixes()}
    
SELECT ?similarBook ?title ?author ?publisherName ?genre ?subjectThema
WHERE {
  # Get properties of the source book
  <${bookUri}> schema:genre ?genre .
  OPTIONAL { <${bookUri}> pbs:subjectThema ?subjectThema . }
  
  # Find books with the same genre or subject
  ?similarBook rdf:type schema:Book .
  {
    ?similarBook schema:genre ?genre .
  } UNION {
    ?similarBook pbs:subjectThema ?subjectThema .
  }
  
  # Exclude the source book
  FILTER(?similarBook != <${bookUri}>)
  
  # Get properties of similar books
  OPTIONAL { ?similarBook schema:name ?title . }
  OPTIONAL { ?similarBook schema:author ?author . }
  OPTIONAL { ?similarBook schema:publisher ?publisher .
             ?publisher schema:name ?publisherName . }
}
LIMIT 10`;
  }
  
  /**
   * Build an enhanced author query to get detailed information about an author
   * @param authorName Name of the author to search for
   * @returns A SPARQL query string
   */
  buildEnhancedAuthorQuery(authorName: string): string {
    // First try to get information from our database
    const localQuery = `${this.getStandardPrefixes()}
    
SELECT ?author ?name ?birthDate ?nationality ?award ?awardName ?book ?bookTitle
WHERE {
  ?author rdf:type schema:Person .
  ?author schema:name ?name .
  
  FILTER(CONTAINS(LCASE(?name), LCASE("${authorName}")))
  
  OPTIONAL { ?author schema:birthDate ?birthDate . }
  OPTIONAL { ?author schema:nationality ?nationality . }
  OPTIONAL { ?author schema:award ?award .
             ?award schema:name ?awardName . }
  OPTIONAL { ?book schema:author ?author .
             ?book schema:name ?bookTitle . }
}`;
    
    // For well-known authors, we can also use Wikidata to enrich information
    const useWikidata = this.shouldUseWikidata(authorName);
    if (useWikidata) {
      return SPARQL_WIKIDATA(authorName);
    }
    
    return localQuery;
  }
  
  /**
   * Determine if we should use Wikidata to get author information
   * @param authorName Name of the author
   * @returns True if we should use Wikidata
   */
  private shouldUseWikidata(authorName: string): boolean {
    // Logic to determine if we should use Wikidata
    // For example, we might use Wikidata for well-known authors
    const wellKnownAuthors = ['Victor Hugo', 'Albert Camus', 'Simone de Beauvoir'];
    return wellKnownAuthors.some(author => 
      authorName.toLowerCase().includes(author.toLowerCase())
    );
  }

  /**
   * Build an enhanced query with book description using SPARQL_QUERY_DESCRIPTION
   * @param filter The filter to apply to the query
   * @returns A SPARQL query string
   */
  buildBookWithDescriptionQuery(filter: string): string {
    return SPARQL_QUERY_DESCRIPTION(filter);
  }
}
