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
  private buildFilterClauses(filters: BookFilter): string[] {
    const clauses: string[] = [];
    
    // Basic book properties
    if (filters.title) {
      clauses.push(`FILTER(?title = "${filters.title}")`);
    }
    
    if (filters.isbn) {
      clauses.push(`FILTER(?isbn = "${filters.isbn}")`);
    }
    
    if (filters.inLanguage) {
      clauses.push(`FILTER(?inLanguage = "${filters.inLanguage}")`);
    }
    
    // Creator properties
    if (filters.author) {
      clauses.push(`FILTER(?author = "${filters.author}")`);
    }
    
    if (filters.nationality) {
      clauses.push(`FILTER(?countryOfOrigin = "${filters.nationality}")`);
    }
    
    if (filters.illustrator) {
      clauses.push(`FILTER(?illustrator = "${filters.illustrator}")`);
    }
    
    // Classification properties
    if (filters.genre) {
      clauses.push(`FILTER(?finalGenreName = "${filters.genre}")`);
    }
    
    if (filters.subjectThema) {
      clauses.push(`FILTER(?subjectThema = "${filters.subjectThema}")`);
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
      clauses.push(`FILTER(?publisherName = "${filters.publisher}")`);
    }
    
    if (filters.datePublished) {
      clauses.push(`FILTER(?datePublished = "${filters.datePublished}")`);
    }
    
    if (filters.award) {
      clauses.push(`FILTER(?finalAwardName = "${filters.award}")`);
    }
    
    return clauses;
  }

  /**
   * Build a source-specific query based on the source and category
   * @param source The data source (e.g., Babelio, Constellation, BNF)
   * @param category The category within the source
   * @returns A SPARQL query string
   */
  buildSourceSpecificQuery(source: Categories, category?: string): string {
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
   * Build a filter clause for age range
   * @param age The age value
   * @returns A SPARQL filter clause string
   */
  buildAgeFilter(age: string): string {
    return `FILTER(STR(?ageRange) = "${age}" || STR(?ageRange) = "${age}," || STR(?ageRange) = ",${age}" || CONTAINS(STR(?ageRange), ",${age},"))`;
  }
}
