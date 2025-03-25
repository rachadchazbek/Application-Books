import { Injectable } from '@angular/core';
import { BookFilter } from '../models/book-filter.model';
import { 
  SPARQL_BABELIO, 
  SPARQL_QUERY, 
  SPARQL_QUERY_BNF, 
  SPARQL_QUERY_CONSTELLATIONS, 
  SPARQL_BTLF_FILTER,
  SPARQL_QUERY_LURELU_FILTER,
  SPARQL_QUERY_DESCRIPTION
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
   * Build a comprehensive query with multiple filters
   * @param filters Complete BookFilter object with all filter criteria
   * @returns A complete SPARQL query string
   */
  buildComprehensiveQuery(filters: BookFilter): string {
    // Start with base query parts
    const prefixes = this.getStandardPrefixes();
    const selectClause = this.buildSelectClause();
    const whereClause = this.buildWhereClause();
    const filterClauses = this.buildFilterClauses(filters);
    const groupByClause = this.buildGroupByClause();
    
    // Combine all parts
    return `${prefixes}
${selectClause}
WHERE {
${whereClause}
${filterClauses.length > 0 ? filterClauses.join('\n') : ''}
}${groupByClause ? '\n' + groupByClause : ''}`;
  }

  /**
   * Build a SPARQL query based on the provided filters
   * @param filters The BookFilter object containing all active filters
   * @returns A SPARQL query string
   */
  buildQuery(filters: BookFilter): string {
    // Build filter clauses based on the unified filter model
    const filterClauses = this.buildFilterClauses(filters);
    
    // If no filters are applied, return a base query
    if (filterClauses.length === 0) {
      return SPARQL_QUERY('');
    }
    
    // Combine filter clauses and return the query
    return SPARQL_QUERY(filterClauses.join(' '));
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
   * Build a source-specific query based on the source and category
   * @param source The data source (e.g., Babelio, Constellation, BNF)
   * @param category The category within the source
   * @returns A SPARQL query string
   */
  buildSourceSpecificQuery(source: string, category?: string): string {
    switch (source) {
      case 'Babelio': {
        const starRating = parseInt(category?.split(' ')[0] ?? '0', 10);
        return SPARQL_BABELIO(`FILTER(?averageReview >= ${starRating})`);
      }
      case 'Constellation': {
        const filter = category === 'Coup de Coeur'
          ? `FILTER(?isCoupDeCoeur = true)`
          : '';
        return SPARQL_QUERY_CONSTELLATIONS(filter);
      }
      case 'BNF': {
        return SPARQL_QUERY_BNF(`FILTER(?avis = "${category}")`);
      }
      case 'Lurelu': {
        // Use the filter-specific template for Lurelu
        return SPARQL_QUERY_LURELU_FILTER('');
      }
      case 'BTLF': {
        // Use the filter-specific template for BTLF
        return SPARQL_BTLF_FILTER('');
      }
      default:
        return SPARQL_QUERY('');
    }
  }

  /**
   * Build queries for appreciation filters
   * @param appreciation The appreciation filter value
   * @returns An array of SPARQL query strings
   */
  buildAppreciationQueries(appreciation: Appreciation): string[] {
    switch (appreciation) {
      case Appreciation.HighlyAppreciated:
        return [
          SPARQL_QUERY_LURELU_FILTER(''), // Use the filter-specific template
          SPARQL_BABELIO(`FILTER(?averageReview >= 4)`),
          SPARQL_QUERY_BNF(`FILTER(?avis = "Coup de coeur !" || ?avis = "Bravo !")`),
          SPARQL_QUERY_CONSTELLATIONS(`FILTER(?isCoupDeCoeur = true)`)
        ];
      case Appreciation.NotHighlyAppreciated:
        return [
          SPARQL_BABELIO(`FILTER(?averageReview <= 3)`),
          SPARQL_QUERY_BNF(`FILTER((?avis = "Hélas !" || ?avis = "Problème..."))`)
        ];
      default:
        return [];
    }
  }

  /**
   * Compatibility method to match SparklQueryBuilderService.getSourceQuery
   * @param filterSource The data source (e.g. 'Babelio', 'Constellation', 'BNF', etc.)
   * @param filterCategory Additional category filter information
   * @returns A query string
   */
  getSourceQuery(filterSource: string, filterCategory?: string): string {
    return this.buildSourceSpecificQuery(filterSource, filterCategory);
  }

  /**
   * Compatibility method to match SparklQueryBuilderService.getAppreciationQueries
   * @param filterAppreciation The appreciation filter (e.g. 'highlyAppreciated', 'notHighlyAppreciated')
   * @returns An array of query strings
   */
  getAppreciationQueries(filterAppreciation: Appreciation): string[] {
    return this.buildAppreciationQueries(filterAppreciation);
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
    return `${this.getStandardPrefixes()}
    
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
