import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NgIf, NgFor } from '@angular/common';
import { GENRES, TITLES, AWARDS, AUTHORS, LANGUAGES } from 'src/app/constants/constants';
import { Appreciation } from 'src/app/constants/Appreciation';
import { Categories, SOURCE_Categories } from 'src/app/constants/Categories';
import { EnhancedFilterService } from 'src/app/services/enhanced-filter.service';
import { EnhancedSparqlQueryBuilderService } from 'src/app/services/enhanced-sparql-query-builder.service';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';
import { BookFilter } from 'src/app/models/book-filter.model';

@Component({
  selector: 'app-enhanced-search',
  templateUrl: './enhanced-search.component.html',
  styleUrls: ['./enhanced-search.component.css'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, NgIf, NgFor]
})
export class EnhancedSearchComponent implements OnInit, OnDestroy {
  // Tab management
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
  
  // Data lists
  genres: string[] = GENRES;
  languages: string[] = LANGUAGES;
  titles = TITLES;
  awards = AWARDS;
  authors = AUTHORS;
  sourceCategories = SOURCE_Categories;
  
  // Filtered lists for autocomplete
  filteredTitles: string[] = [];
  filteredAuthors: string[] = [];
  filteredAwards: string[] = [];
  
  // Blur state for autocomplete
  isBlurredTitle = false;
  isBlurredAuthor = false;
  isBlurredAward = false;
  
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
  }
  
  /**
   * Set the active tab
   * @param tab The tab to activate
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
  
  /**
   * Perform a quick search using the main search bar
   */
  quickSearch(): void {
    const searchTerm = this.quickSearchControl.value;
    if (searchTerm) {
      // Clear existing filters
      this.filterService.clearAllFilters();
      
      // Try to determine what the search term is (title, author, ISBN)
      if (/^[0-9-]+$/.test(searchTerm)) {
        // Looks like an ISBN
        this.applyFilter('isbn', searchTerm);
      } else {
        // Default to title search
        this.applyFilter('title', searchTerm);
      }
      
      // Execute the search
      this.search();
    }
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
   * Handle source selection
   */
  onSelectSource(): void {
    if (this.selectedSource) {
      this.applyFilter('source', this.selectedSource as Categories);
      
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
      
      // Build query
      const query = this.sparqlQueryBuilder.buildQuery(filters);
      
      console.log('Executing search with filters:', filters);
      
      // Execute query
      this.socketService.executeQuery(query)
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
   * Handle keyboard navigation in autocomplete lists
   * @param event The keyboard event
   * @param item The selected item
   */
  handleKeyDown(event: KeyboardEvent, item: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      // Determine which autocomplete list is active
      if (this.activeTab === 'book' && !this.isBlurredTitle) {
        this.applyFilter('title', item);
        this.isBlurredTitle = true;
      } else if (this.activeTab === 'author' && !this.isBlurredAuthor) {
        this.applyFilter('author', item);
        this.isBlurredAuthor = true;
      } else if (this.activeTab === 'author' && !this.isBlurredAward) {
        this.applyFilter('award', item);
        this.isBlurredAward = true;
      }
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
