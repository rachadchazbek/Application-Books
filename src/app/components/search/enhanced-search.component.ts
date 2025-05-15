import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NgIf, NgFor } from '@angular/common';
import { TITLES } from 'src/app/constants/titles';
import { Appreciation } from 'src/app/constants/Appreciation';
import { SOURCE_Categories } from 'src/app/constants/Categories';
import { EnhancedFilterService } from 'src/app/services/enhanced-filter.service';
import { EnhancedSparqlQueryBuilderService } from 'src/app/services/enhanced-sparql-query-builder.service';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';
import { BookFilter } from 'src/app/interfaces/book-filter.model';
import { AUTHOR_NAMES } from 'src/app/constants/authors';
import { AWARDS } from 'src/app/constants/award';
import { GENRES } from 'src/app/constants/genres';
import { LANGUAGES } from 'src/app/constants/languages';
import { NATIONALITIES, COUNTRY_NAMES } from 'src/app/constants/nationalities';

@Component({
  selector: 'app-enhanced-search',
  templateUrl: './enhanced-search.component.html',
  styleUrls: ['./enhanced-search.component.css'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, NgIf, NgFor]
})
export class EnhancedSearchComponent implements OnInit, OnDestroy {
  // Tab management - kept for backward compatibility
  activeTab = 'book';
  
  // Form controls
  quickSearchControl = new FormControl('');
  titleControl = new FormControl('');
  isbnControl = new FormControl('');
  authorControl = new FormControl('');
  nationalityControl = new FormControl('');
  awardControl = new FormControl('');
  
  // Dropdown selections
  selectedGenre = '';
  selectedLanguage = '';
  selectedSource = '';
  selectedCategory = '';
  selectedAppreciation = '';
  
  // Multi-select sources
  availableSources: string[] = ['Babelio', 'Constellations', 'BNF', 'Lurelu', 'BTLF', 'Kaleidoscope'];
  selectedSources: string[] = [];
  
  // Data lists
  genres: string[] = GENRES;
  languages: string[] = LANGUAGES;
  titles = TITLES;
  awards = AWARDS;
  authors = AUTHOR_NAMES;
  nationalities = NATIONALITIES;
  countryNames = COUNTRY_NAMES;
  sourceCategories = SOURCE_Categories;
  
  // Filtered lists for autocomplete
  filteredTitles: string[] = [];
  filteredAuthors: string[] = [];
  filteredAwards: string[] = [];
  filteredNationalities: string[] = [];
  
  // Blur state for autocomplete
  isBlurredTitle = false;
  isBlurredAuthor = false;
  isBlurredAward = false;
  isBlurredNationality = false;
  
  // UI state
  loader = false;
  
  // Active filters for display
  activeFilters: {type: string, label: string, value: string}[] = [];
  
  // Selected ages for education tab
  selectedAges: string[] = [];
  
  // Constants
  Appreciation = Appreciation;
  
  /**
   * Get categories for a specific source
   * @param source The source name
   * @returns An array of categories for the source
   */
  getSourceCategories(source: string): string[] {
    // Type assertion to allow string indexing
    return (this.sourceCategories as Record<string, string[]>)[source] || [];
  }
  
  // Cleanup subject
  private destroy$ = new Subject<void>();
  
  constructor(
    private filterService: EnhancedFilterService,
    private sparqlQueryBuilder: EnhancedSparqlQueryBuilderService,
    private socketService: SocketSparqlService
  ) {}
  
  ngOnInit(): void {
    // Subscribe to filter changes
    this.filterService.activeFilters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        this.activeFilters = filters;
      });
    
    // Set up autocomplete for title search
    this.titleControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.filteredTitles = this.titles.filter(title =>
            title.toLowerCase().startsWith(value.toLowerCase())
          );
        } else {
          this.filteredTitles = [];
        }
      });
    
    // Set up autocomplete for author search
    this.authorControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.filteredAuthors = this.authors.filter(author =>
            author.toLowerCase().startsWith(value.toLowerCase())
          );
        } else {
          this.filteredAuthors = [];
        }
      });
    
    // Set up autocomplete for award search
    this.awardControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          this.filteredAwards = this.awards.filter(award =>
            award.toLowerCase().includes(value.toLowerCase())
          );
        } else {
          this.filteredAwards = [];
        }
      });
    
    // Set up autocomplete for nationality search
    this.nationalityControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value) {
          const searchValue = value.toLowerCase();
          // Search in both country codes and full country names
          this.filteredNationalities = this.nationalities.filter(code => {
            const countryName = this.countryNames[code] || code;
            return code.toLowerCase().includes(searchValue) || 
                  countryName.toLowerCase().includes(searchValue);
          });
        } else {
          this.filteredNationalities = [];
        }
      });
  }
  
  /**
   * Set the active tab - keeping for backward compatibility
   * @param tab The tab to activate
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
  
  /**
   * Perform a quick search using the main search bar
   * Filter out common French articles: les, un, une, l'
   */
  quickSearch(): void {
    const searchTerm = this.quickSearchControl.value;
    if (searchTerm) {
      // Filter out common French articles using regex
      const filteredTerm = searchTerm.replace(/\b(les|un|une|l'|la|le)\b/gi, '').trim();
      
      // Replace multiple spaces with a single space
      const cleanedTerm = filteredTerm.replace(/\s+/g, ' ');
      
      // Only apply filter if there are meaningful terms left
      if (cleanedTerm) {
        this.applyFilter('mots', cleanedTerm);
      } else {
        this.filterService.clearFilter('mots');
      }
    } else {
      this.filterService.clearFilter('mots');
    }
  }
  
  /**
   * Apply a filter
   * @param filterType The type of filter to apply
   * @param value The filter value
   */
  applyFilter(filterType: keyof BookFilter, value: unknown): void {
    if (value && (typeof value !== 'string' || value.trim() !== '')) {
      // Special handling for nationality to store the code but display the country name
      if (filterType === 'nationality' && typeof value === 'string') {
        // Store the original two-letter code
        this.filterService.updateFilter(filterType, value);
      } else {
        this.filterService.updateFilter(filterType, value);
      }
    } else {
      this.filterService.clearFilter(filterType);
    }
  }
  
  /**
   * Get full country name from nationality code
   * @param code The two-letter nationality code
   * @returns The full country name or the code if not found
   */
  getCountryName(code: string): string {
    return this.countryNames[code] || code;
  }
  
  /**
   * Check if a source is selected
   * @param source The source to check
   * @returns True if the source is selected
   */
  isSourceSelected(source: string): boolean {
    return this.selectedSources.includes(source);
  }
  
  /**
   * Toggle a source selection
   * @param source The source to toggle
   */
  toggleSource(source: string): void {
    const index = this.selectedSources.indexOf(source);
    if (index > -1) {
      // Remove source if already selected
      this.selectedSources.splice(index, 1);
    } else {
      // Add source if not selected
      this.selectedSources.push(source);
    }
    
    // Apply filter with all selected sources
    if (this.selectedSources.length > 0) {
      this.filterService.updateFilter('source', this.selectedSources);
    } else {
      this.filterService.clearFilter('source');
    }
  }
  
  /**
   * Remove a filter
   * @param filterType The type of filter to remove
   */
  removeFilter(filterType: string): void {
    this.filterService.clearFilter(filterType as keyof BookFilter);
    
    // Reset UI controls based on the removed filter
    switch (filterType) {
      case 'title':
        this.titleControl.setValue('');
        break;
      case 'isbn':
        this.isbnControl.setValue('');
        break;
      case 'author':
        this.authorControl.setValue('');
        break;
      case 'nationality':
        this.nationalityControl.setValue('');
        break;
      case 'award':
        this.awardControl.setValue('');
        break;
      case 'genre':
        this.selectedGenre = '';
        break;
      case 'inLanguage':
        this.selectedLanguage = '';
        break;
      case 'source':
        this.selectedSource = '';
        this.selectedCategory = '';
        this.selectedSources = [];
        break;
      case 'category':
        this.selectedCategory = '';
        break;
      case 'appreciation':
        this.selectedAppreciation = '';
        break;
      case 'ageRange':
        this.selectedAges = [];
        // Reset checkboxes
        this.resetAgeCheckboxes();
        break;
    }
  }
  
  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.filterService.clearAllFilters();
    
    // Reset all UI controls
    this.quickSearchControl.setValue('');
    this.titleControl.setValue('');
    this.isbnControl.setValue('');
    this.authorControl.setValue('');
    this.nationalityControl.setValue('');
    this.awardControl.setValue('');
    this.selectedGenre = '';
    this.selectedLanguage = '';
    this.selectedSource = '';
    this.selectedCategory = '';
    this.selectedAppreciation = '';
    this.selectedAges = [];
    this.selectedSources = [];
    
    // Reset checkboxes
    this.resetAgeCheckboxes();
  }
  
  /**
   * Reset all age checkboxes
   */
  private resetAgeCheckboxes(): void {
    // Reset all checkboxes for ages
    for (let age = 4; age <= 16; age++) {
      const checkbox = document.getElementById(`${this.getAgeGroupPrefix(age)}-${age}`) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = false;
      }
    }
  }
  
  /**
   * Get the prefix for an age group
   * @param age The age
   * @returns The prefix for the age group
   */
  private getAgeGroupPrefix(age: number): string {
    if (age <= 5) return 'preschool';
    if (age <= 11) return 'primary';
    return 'secondary';
  }
  
  /**
   * Handle age checkbox changes
   * @param event The change event
   * @param age The age value
   */
  handleAgeCheckboxChange(event: Event, age: string): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    
    if (isChecked) {
      // Add age to selected ages if not already present
      if (!this.selectedAges.includes(age)) {
        this.selectedAges = [...this.selectedAges, age];
      }
    } else {
      // Remove age from selected ages
      this.selectedAges = this.selectedAges.filter(a => a !== age);
    }
    
    // Update the filter
    this.applyFilter('ageRange', this.selectedAges);
  }
  
  /**
   * Handle source selection - kept for backward compatibility
   */
  onSelectSource(): void {
    if (this.selectedSource) {
      this.applyFilter('source', this.selectedSource);
      
      console.log('Selected source:', this.selectedSource);
      // Reset category when source changes
      this.selectedCategory = '';
      this.filterService.clearFilter('category');
      
    } else {
      this.filterService.clearFilter('source');
    }
  }
  
  /**
   * Handle category selection
   */
  onSelectCategory(): void {
    if (this.selectedCategory) {
      this.applyFilter('category', this.selectedCategory);
      
    } else {
      this.filterService.clearFilter('category');
    }
  }
  
  /**
   * Handle book appreciation selection
   * @param appreciation The appreciation value
   */
  onSelectBookAppreciation(appreciation: Appreciation): void {
    this.selectedAppreciation = appreciation;
    this.applyFilter('appreciation', appreciation);
  }
  
  /**
   * Execute the search
   */
  search(): void {
    this.loader = true;
    
    try {
      // Get current filters
      const filters = this.filterService.getCurrentFilters();
      
      // Use applyFilters instead of updateBook to ensure all filters are applied
      this.socketService.applyFilters(filters)
        .then(() => {
          console.log('Search completed successfully');
        })
        .catch(error => {
          console.error('Search failed:', error);
          // You could add user-facing error handling here
        })
        .finally(() => {
          this.loader = false;
        });
    } catch (error) {
      console.error('Error preparing search:', error);
      this.loader = false;
      // You could add user-facing error handling here
    }
  }
  
  /**
   * Handle blur event for title input
   */
  onBlurTitle(): void {
    setTimeout(() => {
      this.isBlurredTitle = true;
    }, 100);
  }
  
  /**
   * Handle blur event for author input
   */
  onBlurAuthor(): void {
    setTimeout(() => {
      this.isBlurredAuthor = true;
    }, 100);
  }
  
  /**
   * Handle blur event for award input
   */
  onBlurAward(): void {
    setTimeout(() => {
      this.isBlurredAward = true;
    }, 100);
  }
  
  /**
   * Handle blur event for nationality input
   */
  onBlurNationality(): void {
    setTimeout(() => {
      this.isBlurredNationality = true;
    }, 100);
  }
  
  /**
   * Handle keyboard navigation in autocomplete lists
   * @param event The keyboard event
   * @param item The selected item
   */
  handleKeyDown(event: KeyboardEvent, item: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      // Determine which autocomplete list is active
      if (!this.isBlurredTitle) {
        this.applyFilter('title', item);
        this.isBlurredTitle = true;
      } else if (!this.isBlurredAuthor) {
        this.applyFilter('author', item);
        this.isBlurredAuthor = true;
      } else if (!this.isBlurredAward) {
        this.applyFilter('award', item);
        this.isBlurredAward = true;
      } else if (!this.isBlurredNationality) {
        this.applyFilter('nationality', item);
        this.isBlurredNationality = true;
      }
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
