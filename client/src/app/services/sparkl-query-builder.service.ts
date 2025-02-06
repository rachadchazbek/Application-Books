import { Injectable } from '@angular/core';
import { SPARQL_BABELIO, SPARQL_QUERY_CONSTELLATIONS, SPARQL_QUERY_BNF, SPARQL_QUERY_LURELU, SPARQL_BTLF } from '../constants/sparql';

@Injectable({
  providedIn: 'root'
})
/**
 * @class SparklQueryBuilderService
 * @description Service to build and manage queries for the Sparkl application.
 *
 * @todo Migrate from the spark.ts file in constants
 * @todo Integrate the builder class usage in some components
 * @todo Facilitate UI construction and API for the class from readability, maintainability
 */
export class SparklQueryBuilderService {

  constructor() { }

  /**
   * Builds a query string based on the filter source and (optional) category.
   * @param filterSource The data source (e.g. 'Babelio', 'Constellation', 'BNF', etc.).
   * @param filterCategory Additional category filter information.
   * @returns A query string.
   */
  getSourceQuery(filterSource: string, filterCategory?: string): string {
    switch (filterSource) {
      case 'Babelio': {
        const starRating = parseInt(filterCategory?.split(' ')[0] ?? '');
        return SPARQL_BABELIO(`FILTER(?averageReview >= ${starRating})`);
      }
      case 'Constellation': {
        const filter = filterCategory === 'Coup de coeur !'
          ? `FILTER(?isCoupDeCoeur = true)`
          : '';
        return SPARQL_QUERY_CONSTELLATIONS(filter);
      }
      case 'BNF': {
        return SPARQL_QUERY_BNF(`FILTER(?avis = "${filterCategory}")`);
      }
      case 'Lurelu': {
        return SPARQL_QUERY_LURELU;
      }
      case 'BTLF': {
        return SPARQL_BTLF;
      }
      default:
        return '';
    }
  }

  /**
   * Returns an array of queries based on the appreciation filter.
   * @param filterAppreciation The appreciation filter (e.g. 'highlyAppreciated', 'notHighlyAppreciated').
   * @returns An array of query strings.
   */
  getAppreciationQueries(filterAppreciation: string): string[] {
    switch (filterAppreciation) {
      case 'highlyAppreciated':
        return [
          SPARQL_QUERY_LURELU,
          SPARQL_BABELIO(`FILTER(?averageReview >= 4)`),
          SPARQL_QUERY_BNF(`FILTER(?avis = "Coup de coeur !" || ?avis = "Bravo !")`),
          SPARQL_QUERY_CONSTELLATIONS(`FILTER(?isCoupDeCoeur = true)`)
        ];
      case 'notHighlyAppreciated':
        return [
          SPARQL_BABELIO(`FILTER(?averageReview <= 3)`),
          SPARQL_QUERY_BNF(`FILTER((?avis = "Hélas !" || ?avis = "Problème..."))`)
        ];
      default:
        return [];
    }
  }

  /**
   * Returns a filter string for a given age.
   * @param age The age value.
   * @returns A filter string for the query.
   */
  getAgeFilter(age: string): string {
    return `FILTER(STR(?ageRange) = "${age}" || STR(?ageRange) = "${age}," || STR(?ageRange) = ",${age}" || CONTAINS(STR(?ageRange), ",${age},"))`;
  }
}
