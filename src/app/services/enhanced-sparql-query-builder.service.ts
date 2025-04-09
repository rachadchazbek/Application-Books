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
    if (filters.keywords) {
      clauses.push(`
      ?search a luc-index:all_fields_2 ;
        luc:query "${filters.keywords}" ;
        luc:entities ?book . 
      ?book luc:score ?score .
      `);
    }

    if (filters.source) {
      const escapedSource = this.escapeSparqlString(filters.source);
      clauses.push(`?book a schema:Book ; pbs:dataFrom pbs:${escapedSource}`);
    }
    
    // Basic book properties
    if (filters.title) {
      const escapedTitle = this.escapeSparqlString(filters.title);
      clauses.push(`FILTER(CONTAINS(LCASE(?name), LCASE("${escapedTitle}"))) .`);
      // clauses.push(`schema:name schema:"${escapedTitle}"`);
    }
    
    if (filters.isbn) {
      const escapedIsbn = this.escapeSparqlString(filters.isbn);
      clauses.push(`FILTER(LCASE(?isbn) = LCASE("${escapedIsbn}")) .`);
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
      } else if (filters.source === 'Constellations' && filters.category === 'Coup de Coeur') {
        clauses.push(`FILTER(?isCoupDeCoeur = true)`);
      } else if (filters.source === 'BNF') {
        const escapedCategory = this.escapeSparqlString(filters.category);
        clauses.push(`FILTER(?avis = "${escapedCategory}")`);
      }
    }
    
    // // Appreciation filters
    // if (filters.appreciation === Appreciation.HighlyAppreciated) {
    //   clauses.push(`
    //   {
    //     ?book pbs:infoSource pbs:Babelio .
    //     FILTER(?averageReview >= 4)
    //   } UNION {
    //     ?book pbs:infoSource pbs:BNF .
    //     FILTER(?avis = "Coup de coeur !" || ?avis = "Bravo !")
    //   } UNION {
    //     ?book pbs:infoSource pbs:Constellationss .
    //     FILTER(?isCoupDeCoeur = true)
    //   } UNION {
    //     ?book pbs:infoSource pbs:Lurelu
    //   }
    //   `);
    // } else if (filters.appreciation === Appreciation.NotHighlyAppreciated) {
    //   clauses.push(`
    //   {
    //     ?book pbs:infoSource pbs:Babelio .
    //     FILTER(?averageReview <= 3)
    //   } UNION {
    //     ?book pbs:infoSource pbs:BNF .
    //     FILTER(?avis = "Hélas !" || ?avis = "Problème...")
    //   }
    //   `);
    // }
    
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

  

}
