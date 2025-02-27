import { Injectable } from '@angular/core';
import { Filter } from '../constants/filter';
import { SPARQL_QUERY } from '../constants/sparql';
import { Appreciation } from '../constants/Appreciation';


/**
 * FilterService is responsible for constructing and passing the right arguments
 * of the current filters applied to the page. This service helps manage the state
 * and logic related to filtering data, ensuring that the correct filters are applied
 * and passed to other parts of the application and services.
 */
@Injectable({
  providedIn: 'root'
})
export default class FilterService {
  // The activeFilters object stores the current filters applied to the page
  private _activeFilters: Filter = {
    filterName: "",
    filterGenre: "",
    filterAuthor: "",
    filterAge: [],
    filterAward: "",
    filterLanguage: "",
    filterSource: '',
    filterCategory: '',
    filterAppreciation: Appreciation.unassigned,
  };

  get activeFilters() {
    return this._activeFilters;
  }

  set activeFilters(filters) {
    this._activeFilters = filters;
  }


  updateFilters(): string {
    const filterQueries = [];

    if (this.activeFilters.filterName) {
      filterQueries.push(`FILTER(?title = "${this.activeFilters.filterName}")`);
    }
    // add else conditions to handle removal of filters
    if (this.activeFilters.filterGenre) {
      filterQueries.push(
        `FILTER(?finalGenreName = "${this.activeFilters.filterGenre}")`
      );
    }
    if (this.activeFilters.filterAuthor) {
      filterQueries.push(
        `FILTER(?author = "${this.activeFilters.filterAuthor}")`
      );
    }
    if (this.activeFilters.filterAge) {
      filterQueries.push(
        `FILTER(?ageRange >= "${this.activeFilters.filterAge}")`
      );
    }
    if (this.activeFilters.filterAward) {
      filterQueries.push(
        `FILTER(?finalAwardName = "${this.activeFilters.filterAward}")`
      );
    }
    if (this.activeFilters.filterLanguage) {
      filterQueries.push(
        `FILTER(?inLanguage = "${this.activeFilters.filterLanguage}")`
      );
    }
    return SPARQL_QUERY(filterQueries.join(' '));
  }

  constructor() {}
}
