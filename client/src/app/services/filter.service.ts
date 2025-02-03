import { Injectable } from '@angular/core';
import { Filter } from '../constants/filter';


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
    filterAppreciation: '',
  };

  get activeFilters() {
    return this._activeFilters;
  }

  set activeFilters(filters) {
    this._activeFilters = filters;
  }


  constructor() { }
}
