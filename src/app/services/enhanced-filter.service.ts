import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BookFilter } from '../interfaces/book-filter.model';
import { Appreciation } from '../constants/Appreciation';
import { COUNTRY_NAMES } from '../constants/nationalities';

/**
 * Enhanced FilterService that uses the unified BookFilter model
 * and implements reactive state management with BehaviorSubject.
 * 
 * This service is responsible for managing the state of all filters
 * applied to the book search and providing methods to update, clear,
 * and track active filters.
 */
@Injectable({
  providedIn: 'root'
})
export class EnhancedFilterService {
  // BehaviorSubject to store and emit filter changes
  private filterSubject = new BehaviorSubject<BookFilter>({});
  
  // Observable that components can subscribe to
  public filters$ = this.filterSubject.asObservable();
  
  // BehaviorSubject to track active filters for UI display
  private activeFiltersSubject = new BehaviorSubject<{type: string, label: string, value: string}[]>([]);
  
  // Observable for active filters that components can subscribe to
  public activeFilters$ = this.activeFiltersSubject.asObservable();
  
  constructor() {
    // No initialization needed
  }
  
  /**
   * Get the current filters
   * @returns The current BookFilter object
   */
  getCurrentFilters(): BookFilter {
    return this.filterSubject.getValue();
  }
  
  /**
   * Update a specific filter
   * @param filterType The filter property to update
   * @param value The new value for the filter
   */
  updateFilter(filterType: keyof BookFilter, value: unknown): void {
    const currentFilters = this.filterSubject.getValue();
    const newFilters = { ...currentFilters, [filterType]: value };
    
    // Update active filters list for UI
    this.updateActiveFiltersList(filterType, value);
    
    this.filterSubject.next(newFilters);
  }
  
  /**
   * Clear a specific filter
   * @param filterType The filter property to clear
   */
  clearFilter(filterType: keyof BookFilter): void {
    const currentFilters = this.filterSubject.getValue();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [filterType]: removed, ...newFilters } = currentFilters;
    
    // Update active filters list for UI
    this.removeFromActiveFiltersList(filterType);
    
    this.filterSubject.next(newFilters as BookFilter);
  }
  
  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.filterSubject.next({});
    this.activeFiltersSubject.next([]);
  }
  
  /**
   * Update the list of active filters for UI display
   * @param filterType The filter property being updated
   * @param value The new value for the filter
   */
  private updateActiveFiltersList(filterType: keyof BookFilter, value: unknown): void {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      this.removeFromActiveFiltersList(filterType);
      return;
    }
    
    const currentActiveFilters = this.activeFiltersSubject.getValue();
    const filterLabel = this.getFilterLabel(filterType);
    const filterValue = this.formatFilterValue(filterType, value);
    
    // Check if this filter is already in the list
    const existingIndex = currentActiveFilters.findIndex(f => f.type === filterType);
    
    if (existingIndex >= 0) {
      // Update existing filter
      const updatedFilters = [...currentActiveFilters];
      updatedFilters[existingIndex] = { type: filterType as string, label: filterLabel, value: filterValue };
      this.activeFiltersSubject.next(updatedFilters);
    } else {
      // Add new filter
      this.activeFiltersSubject.next([
        ...currentActiveFilters,
        { type: filterType as string, label: filterLabel, value: filterValue }
      ]);
    }
  }
  
  /**
   * Remove a filter from the active filters list
   * @param filterType The filter property to remove
   */
  private removeFromActiveFiltersList(filterType: keyof BookFilter): void {
    const currentActiveFilters = this.activeFiltersSubject.getValue();
    const updatedFilters = currentActiveFilters.filter(f => f.type !== filterType);
    this.activeFiltersSubject.next(updatedFilters);
  }
  
  /**
   * Get a human-readable label for a filter type
   * @param filterType The filter property
   * @returns A human-readable label
   */
  private getFilterLabel(filterType: keyof BookFilter): string {
    const labels: Record<string, string> = {
      title: 'Titre',
      isbn: 'ISBN',
      inLanguage: 'Langue',
      author: 'Auteur',
      nationality: 'Nationalité',
      illustrator: 'Illustrateur',
      genre: 'Genre',
      subjectThema: 'Thème',
      ageRange: 'Âge',
      educationLevel: 'Niveau scolaire',
      source: 'Source',
      category: 'Catégorie',
      appreciation: 'Appréciation',
      publisher: 'Éditeur',
      datePublished: 'Date de publication',
      award: 'Prix',
      numberOfAwards: 'Prix',
      collectionName: 'Collection'
    };
    
    return labels[filterType as string] || filterType as string;
  }
  
  /**
   * Format a filter value for display
   * @param filterType The filter property
   * @param value The filter value
   * @returns A formatted string representation of the value
   */
  private formatFilterValue(filterType: keyof BookFilter, value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (filterType === 'source' && typeof value === 'string') {
      return value;
    }
    
    if (filterType === 'appreciation') {
      switch (value) {
        case Appreciation.HighlyAppreciated:
          return 'Très apprécié';
        case Appreciation.NotHighlyAppreciated:
          return 'Peu apprécié';
        default:
          return 'Non spécifié';
      }
    }
    
    // Convert nationality codes to full country names
    if (filterType === 'nationality' && typeof value === 'string') {
      return COUNTRY_NAMES[value] || value;
    }
    
    // Format boolean filter for numberOfAwards
    if (filterType === 'numberOfAwards' && typeof value === 'boolean') {
      return value ? 'Prix gagné' : 'Non spécifié';
    }
    
    return value?.toString() ?? '';
  }
}
