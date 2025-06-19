import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NgIf, NgFor } from '@angular/common';
import { KeyValuePipe } from '@angular/common';
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
  imports: [FormsModule, ReactiveFormsModule, NgIf, NgFor, KeyValuePipe]
})
export class EnhancedSearchComponent implements OnInit, OnDestroy {
  // Tab management - kept for backward compatibility
  activeTab = 'book';
  
  // Form controls
  quickSearchControl = new FormControl('');
  keywordInputControl = new FormControl('');
  titleControl = new FormControl('');
  isbnControl = new FormControl('');
  collectionControl = new FormControl('');
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
  availableSources: string[] = ['Babelio', 'Constellations', 'BNF', 'Lurelu', 'BTLF', 'Kaléidoscope'];
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
  
  // Quebec nationality toggle
  isQuebecSelected = false;
  
  // Award toggle
  isAwardSelected = false;
  
  // UI state
  loader = false;
  
  // Advanced keyword search
  advancedKeywords: {keyword: string, operator?: 'AND' | 'OR' | 'NOT'}[] = [];
  currentOperator: 'AND' | 'OR' | 'NOT' = 'AND';
  
  // Operator mappings between French UI and English filter
  readonly OPERATOR_MAPPING: Record<string, 'AND' | 'OR' | 'NOT'> = {
    'ET': 'AND',
    'OU': 'OR',
    'SAUF': 'NOT'
  };
  
  readonly REVERSE_OPERATOR_MAPPING: Record<string, string> = {
    'AND': 'ET',
    'OR': 'OU',
    'NOT': 'SAUF'
  };
  
  // Active filters for display
  activeFilters: {type: string, label: string, value: string}[] = [];
  
  // Selected ages for education tab
  selectedAges: string[] = [];
  
  // Age range selections - removed 'adult' option
  selectedAgeRanges: Record<string, boolean> = {
    '6plus': false,
    '9plus': false,
    '12plus': false
  };
  
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
    
    // If advanced keywords are used, prioritize them
    if (this.advancedKeywords.length > 0) {
      this.applyAdvancedKeywordFilter();
      return;
    }
    
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
   * Add a keyword to the advanced search
   * @param keyword The keyword to add
   */
  addKeyword(keyword: string): void {
    if (!keyword || keyword.trim() === '') {
      return;
    }
    
    // If this is the first keyword, no operator is needed
    if (this.advancedKeywords.length === 0) {
      this.advancedKeywords.push({ keyword: keyword.trim() });
    } else {
      // For subsequent keywords, add with the selected operator
      this.advancedKeywords.push({
        keyword: keyword.trim(),
        operator: this.currentOperator
      });
    }
    
    // Clear the input field
    this.keywordInputControl.setValue('');
    
    // Apply the filter
    this.applyAdvancedKeywordFilter();
  }
  
  /**
   * Remove a keyword from the advanced search
   * @param index The index of the keyword to remove
   */
  removeKeyword(index: number): void {
    this.advancedKeywords.splice(index, 1);
    
    // If we removed all keywords, clear the filter
    if (this.advancedKeywords.length === 0) {
      this.filterService.clearFilter('advancedKeywords');
      return;
    }
    
    // Ensure the first keyword doesn't have an operator
    if (this.advancedKeywords.length > 0) {
      delete this.advancedKeywords[0].operator;
    }
    
    // Apply the updated filter
    this.applyAdvancedKeywordFilter();
  }
  
  /**
   * Change the operator for a keyword
   * @param index The index of the keyword
   * @param operator The new operator
   */
  changeOperator(index: number, operator: 'AND' | 'OR' | 'NOT'): void {
    // Cannot change operator of the first keyword
    if (index === 0) return;
    
    this.advancedKeywords[index].operator = operator;
    
    // Apply the updated filter
    this.applyAdvancedKeywordFilter();
  }
  
  /**
   * Set the current operator to use for the next keyword
   * @param operator The operator to use
   */
  setCurrentOperator(operator: 'AND' | 'OR' | 'NOT'): void {
    this.currentOperator = operator;
  }
  
  /**
   * Apply the advanced keyword filter
   */
  applyAdvancedKeywordFilter(): void {
    if (this.advancedKeywords.length === 0) {
      this.filterService.clearFilter('advancedKeywords');
      return;
    }
    
    // Apply the advanced keywords filter
    this.applyFilter('advancedKeywords', this.advancedKeywords);
    
    // Clear the basic 'mots' filter as we're using advanced search
    this.filterService.clearFilter('mots');
  }
  
  /**
   * Apply a filter
   * @param filterType The type of filter to apply
   * @param value The filter value
   */
  applyFilter(filterType: keyof BookFilter, value: unknown): void {
    if (value && (typeof value !== 'string' || value.trim() !== '')) {
      this.filterService.updateFilter(filterType, value);
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
   * Toggle Quebec nationality
   * @param event The change event from the checkbox
   */
  toggleQuebecNationality(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.isQuebecSelected = isChecked;
    
    // Apply the appropriate nationality code
    if (isChecked) {
      // Quebec selected
      this.applyFilter('nationality', 'QC');
    } else {
      // Clear the nationality filter when not Quebec
      this.filterService.clearFilter('nationality');
    }
  }
  
  /**
   * Toggle award filter
   * @param event The change event from the checkbox
   */
  toggleAward(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.isAwardSelected = isChecked;
    
    // Apply the award filter based on the checkbox state
    if (isChecked) {
      // Has awards
      this.applyFilter('numberOfAwards', true);
    } else {
      // Clear the award filter
      this.filterService.clearFilter('numberOfAwards');
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
      case 'advancedKeywords':
        this.advancedKeywords = [];
        break;
      case 'mots':
        this.quickSearchControl.setValue('');
        break;
      case 'title':
        this.titleControl.setValue('');
        break;
      case 'isbn':
        this.isbnControl.setValue('');
        break;
      case 'collectionName':
        this.collectionControl.setValue('');
        break;
      case 'author':
        this.authorControl.setValue('');
        break;
      case 'nationality':
        this.nationalityControl.setValue('');
        this.isQuebecSelected = false;
        break;
      case 'award':
        this.awardControl.setValue('');
        break;
      case 'numberOfAwards':
        this.isAwardSelected = false;
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
    this.advancedKeywords = [];
    this.titleControl.setValue('');
    this.isbnControl.setValue('');
    this.collectionControl.setValue('');
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
    
    // Reset the new age range checkboxes
    Object.keys(this.selectedAgeRanges).forEach(key => {
      this.selectedAgeRanges[key] = false;
      const checkbox = document.getElementById(`age-${key}`) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = false;
      }
    });
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
   * Handle age checkbox changes (legacy method, kept for backward compatibility)
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
   * Handle the new simplified age range checkboxes
   * @param event The change event
   * @param rangeType The type of range: '6plus', '9plus', or '12plus'
   */
  handleAgeRangeChange(event: Event, rangeType: string): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    
    // Update the internal state first
    this.selectedAgeRanges[rangeType] = isChecked;
    
    // Clear previous age selections
    this.selectedAges = [];
    
    // Apply filter or clear it based on checkbox state
    if (isChecked) {
      // Ensure only one checkbox is checked at a time
      for (const key in this.selectedAgeRanges) {
        if (key !== rangeType) {
          this.selectedAgeRanges[key] = false;
          const checkbox = document.getElementById(`age-${key}`) as HTMLInputElement;
          if (checkbox) {
            checkbox.checked = false;
          }
        }
      }
      
      // Add the appropriate age range based on which checkbox is checked
      switch (rangeType) {
        case '6plus':
          // Add ages 6-16 to the range
          for (let age = 6; age <= 16; age++) {
            this.selectedAges.push(age.toString());
          }
          break;
        case '9plus':
          // Add ages 9-16 to the range
          for (let age = 9; age <= 16; age++) {
            this.selectedAges.push(age.toString());
          }
          break;
        case '12plus':
          // Add ages 12-16 to the range
          for (let age = 12; age <= 16; age++) {
            this.selectedAges.push(age.toString());
          }
          break;
      }
      
      // Apply the filter with the new range
      this.applyFilter('ageRange', this.selectedAges);
    } else {
      // If all checkboxes are unchecked, clear the filter
      if (!Object.values(this.selectedAgeRanges).some(val => val)) {
        this.filterService.clearFilter('ageRange');
      }
    }
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
