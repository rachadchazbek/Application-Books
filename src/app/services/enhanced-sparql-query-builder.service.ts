import { Injectable } from '@angular/core';
import { BookFilter } from '../interfaces/book-filter.model';
import { 
  UNIFIED_SPARQL_QUERY
} from '../queries/unified';

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
    if (filters.mots) {
      clauses.push(`
      ?search a luc-index:all_fields_3 ;
        luc:query "${filters.mots}" ;
        luc:entities ?book . 
      ?book luc:score ?score .
      `);
    }

    if (filters.source) {
      // Handle array of sources with UNION pattern
      if (Array.isArray(filters.source) && filters.source.length > 0) {
        clauses.push(`{ ?book a schema:Book ; `);
        const sourceConditions = filters.source.map(source => {
          const escapedSource = this.escapeSparqlString(source);
          return `{ ?book pbs:dataFrom pbs:${escapedSource} }`;
        });
        // Combine all source conditions with UNION
        clauses.push(sourceConditions.join(' \n'));
        clauses.push( "} .");

      } 
      // Fallback for backward compatibility if a single string is passed
      else if (typeof filters.source === 'string') {
        const escapedSource = this.escapeSparqlString(filters.source as string);
        clauses.push(`?book a schema:Book ; pbs:dataFrom pbs:${escapedSource} .`);
      }
    }
    
    // Basic book properties
    if (filters.title) {
      const escapedTitle = this.escapeSparqlString(filters.title);
      clauses.push(`FILTER(CONTAINS(LCASE(?name), LCASE("${escapedTitle}"))) .`);
    }
    
    if (filters.isbn) {
      const escapedIsbn = this.escapeSparqlString(filters.isbn);
      clauses.push(`FILTER(LCASE(?isbn) = LCASE("${escapedIsbn}")) .`);
    }
    
    if (filters.inLanguage) {
      const escapedLanguage = this.escapeSparqlString(filters.inLanguage);
      clauses.push(`FILTER(LCASE(?language) = LCASE("${escapedLanguage}")) .`);
    }
    
    // Creator properties
    if (filters.author) {
      const escapedAuthor = this.escapeSparqlString(filters.author);
      clauses.push(`FILTER(CONTAINS(LCASE(?authorName), LCASE("${escapedAuthor}"))) .`);
    }
    
    if (filters.nationality) {
      const escapedNationality = this.escapeSparqlString(filters.nationality);
      if (escapedNationality === 'QC') {
        clauses.push("?author schema:nationality ?nationality ; pbs:fromQuebec true .")
      }
    }
    
    if (filters.illustrator) {
      const escapedIllustrator = this.escapeSparqlString(filters.illustrator);
      clauses.push(`FILTER(CONTAINS(LCASE(?illustrator), LCASE("${escapedIllustrator}"))) .`);
    }
    
    // Classification properties
    if (filters.genre) {
      const escapedGenre = this.escapeSparqlString(filters.genre);
      clauses.push(`FILTER(CONTAINS(LCASE(?genre), LCASE("${escapedGenre}"))) .`);
    }
    
    // Age range filter
    if (filters.ageRange && filters.ageRange.length > 0) {
      const ageConditions = filters.ageRange.map(age => 
        `CONTAINS(STR(?typicalAgeRangeConstellations), "${this.escapeSparqlString(age)}") ||
        CONTAINS(STR(?typicalAgeRangeBTLF), "${this.escapeSparqlString(age)}") ||
        CONTAINS(STR(?typicalAgeRangeBNF), "${this.escapeSparqlString(age)}")`
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
    
    // Filter by presence of awards (numberOfAwards)
    if (filters.numberOfAwards === true) {
      clauses.push(`FILTER(bound(?numberOfAwards))`);
    }

    
    // Category-specific filters
    if (filters.category) {
      // Helper function to check if source array includes a specific source
      const hasSource = (sourceToCheck: string): boolean => {
        if (Array.isArray(filters.source)) {
          return filters.source.includes(sourceToCheck);
        } else if (typeof filters.source === 'string') {
          return filters.source === sourceToCheck;
        }
        return false;
      };

      if (hasSource('Babelio')) {
        const starRating = parseInt(filters.category.split(' ')[0], 10);
        if (!isNaN(starRating)) {
          clauses.push(`FILTER(?averageReview >= ${starRating})`);
        }
      } else if (hasSource('Constellations') && filters.category === 'Coup de Coeur') {
        clauses.push(`FILTER(?isCoupDeCoeur = true)`);
      } else if (hasSource('BNF')) {
        const escapedCategory = this.escapeSparqlString(filters.category);
        clauses.push(`FILTER(?avis = "${escapedCategory}")`);
      }
    }
    
    // Appreciation filters
    if (filters.appreciation) {
      const hasSource = (sourceToCheck: string): boolean => {
        if (Array.isArray(filters.source)) {
          return filters.source.includes(sourceToCheck);
        } else if (typeof filters.source === 'string') {
          return filters.source === sourceToCheck;
        }
        return false;
      };
      
      // Build appreciation filters based on selected sources
      const appreciationClauses: string[] = [];
      
      // Convert appreciation value to string for comparison
      const appreciationValue = String(filters.appreciation);
      
      if (appreciationValue === 'HighlyAppreciated') {
        if (hasSource('Babelio') || !filters.source) {
          appreciationClauses.push(`
            {
              ?book pbs:dataFrom pbs:Babelio .
              FILTER(?averageReview >= 4)
            }`);
        }
        
        if (hasSource('BNF') || !filters.source) {
          appreciationClauses.push(`
            {
              ?book pbs:dataFrom pbs:BNF .
              FILTER(?avis = "Coup de coeur !" || ?avis = "Bravo !")
            }`);
        }
        
        if (hasSource('Constellations') || !filters.source) {
          appreciationClauses.push(`
            {
              ?book pbs:dataFrom pbs:Constellations .
              FILTER(?isCoupDeCoeur = true)
            }`);
        }
        
        if (hasSource('Lurelu') || !filters.source) {
          appreciationClauses.push(`
            {
              ?book pbs:dataFrom pbs:Lurelu
            }`);
        }
      } else if (appreciationValue === 'notHighlyAppreciated') {
        if (hasSource('Babelio') || !filters.source) {
          appreciationClauses.push(`
            {
              ?book pbs:dataFrom pbs:Babelio .
              FILTER(?averageReview <= 3)
            }`);
        }
        
        if (hasSource('BNF') || !filters.source) {
          appreciationClauses.push(`
            {
              ?book pbs:dataFrom pbs:BNF .
              FILTER(?avis = "Hélas !" || ?avis = "Problème...")
            }`);
        }
      }
      
      // If we have appreciation clauses, combine them with UNION
      if (appreciationClauses.length > 0) {
        clauses.push(appreciationClauses.join(' UNION '));
      }
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
    const filterString = filterClauses.length > 0 ? filterClauses.join(' \n') : '';
    
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

  

}
