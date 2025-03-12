import { Injectable } from '@angular/core';
import { BookFilter } from '../models/book-filter.model';
import { 
  SPARQL_BABELIO, 
  SPARQL_QUERY, 
  SPARQL_QUERY_BNF, 
  SPARQL_QUERY_CONSTELLATIONS, 
  SPARQL_QUERY_LURELU, 
  SPARQL_BTLF 
} from '../constants/sparql';
import { Categories } from '../constants/Categories';
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
      case Categories.Babelio: {
        const starRating = parseInt(category?.split(' ')[0] ?? '0', 10);
        return SPARQL_BABELIO(`FILTER(?averageReview >= ${starRating})`);
      }
      case Categories.Constellation: {
        const filter = category === 'Coup de coeur !'
          ? `FILTER(?isCoupDeCoeur = true)`
          : '';
        return SPARQL_QUERY_CONSTELLATIONS(filter);
      }
      case Categories.BNF: {
        return SPARQL_QUERY_BNF(`FILTER(?avis = "${category}")`);
      }
      case Categories.Lurelu: {
        return SPARQL_QUERY_LURELU;
      }
      case Categories.BTLF: {
        return SPARQL_BTLF;
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
          SPARQL_QUERY_LURELU,
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
}
