import { NgFor, NgIf, KeyValuePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { bookSummary$, currentBook$, rating$, similarBooks$, urlBabelio$ } from 'src/app/classes/subjects';
import { Book, SparqlBinding } from 'src/app/interfaces/Book';
import { SimilarBook } from 'src/app/interfaces/SimilarBook';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';
import { Location } from '@angular/common';
import { IsbnStorageService } from 'src/app/services/isbn-storage.service';

@Component({
  selector: 'app-book-component',
  templateUrl: './book.component.html',
  standalone: true,
  imports: [NgIf, NgFor, KeyValuePipe],
  styleUrls: ['./book.component.css']
})
export class BookComponent implements OnInit, OnDestroy {
  // Book data properties
  summaryBook: string | null = null;
  ratingBook: string | null = null;
  currentBookData: Book | null = null;
  babelioLink: string | null = null;
  similarBooks: SimilarBook[] = [];
  bookDescriptions = new Map<string, string[]>(); // Map of source -> descriptions
  bookSources: string[] = []; // All sources where the book is found
  
  // UI state
  activeTab = 'summary'; // Using string type instead of union for flexibility
  loading = true;
  
  // Subscriptions
  private summarySubscription: Subscription;
  private ratingSubscription: Subscription;
  private babelioSubscription: Subscription;
  private bookSubscription: Subscription;
  private similarBooksSubscription: Subscription;
  private readonly destroy$ = new Subject<void>();

  // Track if the current book's ISBN is already saved
  isCurrentBookSaved = false;

  constructor(
    private readonly route: ActivatedRoute, 
    public socketService: SocketSparqlService,
    private router: Router,
    private location: Location,
    private isbnStorageService: IsbnStorageService
  ) {
    this.subscribeToBabelioUrl();
    this.subscribeToBookSummary();
    this.subscribeToBookRating();
    this.subscribeToCurrentBook();
    this.subscribeToSimilarBooks();
  }

  // Flag for expanded image preview
  showImagePreview = false;

  ngOnInit(): void {
      this.loading = true;
  
      (async () => {
        try {
          // Wait for the route params
          const params = await firstValueFrom(this.route.params);
          const isbn = params['isbn'];
  
          if (isbn) {
            // Load the book data using ISBN if coming directly to this page
            await this.socketService.bingSearchBook(isbn);
          }
  
          // Wait for book data to be loaded  
          await this.waitForBookData();
          console.log("Here")
  
          if (this.currentBookData) {
            // Load similar books using the book URI
            await this.loadSimilarBooks();
  
            // Process book descriptions if available
            this.processBookDescriptions();
  
            // Check if this book's ISBN is already saved
            if (this.currentBookData.isbn) {
              this.isCurrentBookSaved = this.isbnStorageService.isIsbnSaved(this.currentBookData.isbn);
            }
          }
        } catch (error) {
          console.error('Error loading book data:', error);
        } finally {
          this.loading = false;
        }
      })();
    }

  /**
   * Save the current book's ISBN to storage
   */
  saveCurrentBookIsbn(): void {
    if (this.currentBookData?.isbn) {
      this.isCurrentBookSaved = this.isbnStorageService.saveIsbn(this.currentBookData.isbn) || true;
      // Could show a success message here if needed
    }
  }

  /**
   * Remove the current book's ISBN from storage
   */
  removeCurrentBookIsbn(): void {
    if (this.currentBookData?.isbn) {
      const removed = this.isbnStorageService.removeIsbn(this.currentBookData.isbn);
      
      if (removed) {
        this.isCurrentBookSaved = false;
        // Could show a success message here
      }
    }
  }

  /**
   * Toggle saving/removing the current book's ISBN
   */
  toggleSaveIsbn(): void {
    if (this.isCurrentBookSaved) {
      this.removeCurrentBookIsbn();
    } else {
      this.saveCurrentBookIsbn();
    }
  }
  
  /**
   * Toggle the image preview
   */
  toggleImagePreview(): void {
    this.showImagePreview = !this.showImagePreview;
  }
  
  /**
   * Process book descriptions and organize them by source
   */
  private processBookDescriptions(): void {
    // Clear existing descriptions
    this.bookDescriptions.clear();
    
    console.log('Processing book data:', this.currentBookData);
    
    // Make sure we have book data
    if (!this.currentBookData) {
      console.warn('No book data available');
      return;
    }

    // For debugging - dump all properties of the book data
    console.log('All Book Properties:');
    for (const prop in this.currentBookData) {
      console.log(`${prop}:`, this.currentBookData[prop]);
    }
    
    // Check if we have raw results from the SPARQL query
    // These would be stored in the book data by the socket service
    if (this.currentBookData['rawResults']) {
      this.processRawBindings(this.currentBookData['rawResults']);
      console.log('Processed raw bindings from book data');
    } else {
      // Process the single description if no raw results
      // Remove test data in production
      if (!this.currentBookData.description) {
        // Only add test data if no real description is available
        this.bookDescriptions.set('Babelio', ['Description de test pour Babelio. Ceci est un livre intéressant avec beaucoup de détails.']);
        this.bookDescriptions.set('BNF', ['Description de test pour BNF. Ce livre est une référence dans son domaine.']);
      }
      
      // Add the main description if available
      if (this.currentBookData.description) {
        const source = this.currentBookData.infoSource ? 
                      this.formatSourceName(this.currentBookData.infoSource) : 
                      'Source inconnue';
        
        console.log('Adding main description from source:', source);
        
        if (!this.bookDescriptions.has(source)) {
          this.bookDescriptions.set(source, []);
        }
        
        const descriptions = this.bookDescriptions.get(source) || [];
        descriptions.push(this.currentBookData.description);
        this.bookDescriptions.set(source, descriptions);
      }
      
      // Also check for quatriemeCouverture (often contains the description)
      if (this.currentBookData.quatriemeCouverture) {
        const source = 'Quatrième de couverture';
        console.log('Adding quatrieme couverture');
        
        if (!this.bookDescriptions.has(source)) {
          this.bookDescriptions.set(source, []);
        }
        
        const descriptions = this.bookDescriptions.get(source) || [];
        descriptions.push(this.currentBookData.quatriemeCouverture);
        this.bookDescriptions.set(source, descriptions);
      }
    }
    
    // Log the final results
    console.log('Final descriptions map size:', this.bookDescriptions.size);
    console.log('Final descriptions map:', Object.fromEntries(this.bookDescriptions));
  }

  /**
   * Process raw bindings from SPARQL query to extract descriptions from multiple sources
   */
  private processRawBindings(bindings: SparqlBinding[]): void {
    if (!bindings || bindings.length === 0) {
      console.warn('No bindings to process');
      return;
    }

    console.log('Processing raw bindings:', bindings);
    
    // Clear the sources array
    this.bookSources = [];
    
    // Process each binding to extract description and source
    bindings.forEach((binding, index) => {
      let source = 'Source inconnue';
      
      // Extract source from infoSource if available
      if (binding['infoSource'] && binding['infoSource'].value) {
        source = this.formatSourceName(binding['infoSource'].value);
        
        // Add to sources list if not already there
        if (!this.bookSources.includes(source)) {
          this.bookSources.push(source);
        }
      }
      
      // Process description if available
      if (binding['description'] && binding['description'].value) {
        const description = binding['description'].value;
        
        console.log(`Binding ${index}: Found description from source ${source}`);
        
        // Add the description to the appropriate source in the map
        if (!this.bookDescriptions.has(source)) {
          this.bookDescriptions.set(source, []);
        }
        
        const descriptions = this.bookDescriptions.get(source) || [];
        descriptions.push(description);
        this.bookDescriptions.set(source, descriptions);
      }
    });
    
    // Sort the sources alphabetically for consistent display
    this.bookSources.sort();
  }
  
  /**
   * Format source name for display
   */
  formatSourceName(source: string): string {
    // For URLs with hash fragments like "http://www.example.org/pbs#Constellations"
    if (source.includes('#')) {
      const fragment = source.split('#').pop() || '';
      return fragment;
    }
    
    // For regular URLs
    // Extract domain name and remove common extensions
    const cleanedSource = source.replace(/^(http|https):\/\//, '')
                               .replace(/^www\./, '')
                               .replace(/\.com$|\.org$|\.net$/, '');
    
    // Capitalize first letter
    return cleanedSource.charAt(0).toUpperCase() + cleanedSource.slice(1);
  }
  
  /**
   * Check if there are any book descriptions available
   */
  hasDescriptions(): boolean {
    return this.bookDescriptions.size > 0;
  }
  
  /**
   * Wait for book data to be loaded
   */
  private async waitForBookData(): Promise<void> {
    // Create a promise that resolves when the book data is available
    return new Promise<void>((resolve) => {
      // Use take(1) to complete after first emission of a non-null value
      currentBook$.pipe(
        filter(book => !!book),
        take(1)
      ).subscribe(() => {
        resolve();
      });
      
      // Add a timeout in case the data never comes
      setTimeout(() => resolve(), 10000);
    });
  }

  /**
   * Load books similar to the current book
   */
  async loadSimilarBooks(): Promise<void> {
    // Find similar books
    this.socketService.findSimilarBooks(this.currentBookData?.isbn ?? '');    
    };

  /**
   * Check if a value is a string
   */
  isString(value: unknown): boolean {
    return typeof value === 'string';
  }

  /**
   * Update the summary with a link to Babelio
   */
  updateSummary() {
    if (this.summaryBook?.includes('>Voir plus')) {
      this.summaryBook = this.summaryBook.replace('>Voir plus', `<a class="view-more-link" href="${this.babelioLink}" target="_blank">Voir plus</a>`);
    } else if (this.summaryBook && this.babelioLink) {
      this.summaryBook = `${this.summaryBook} <a class="view-more-link" href="${this.babelioLink}" target="_blank">Voir plus</a>`;
    }
    return this.summaryBook;
  }

  /**
   * Set the active tab
   */
  setActiveTab(tab: 'summary' | 'similar'): void {
    this.activeTab = tab;
  }
  
  /**
   * Get full image URL
   */
  getFullImageUrl(): string {
    if (!this.currentBookData?.premiereCouverture) {
      return '';
    }
    return 'http://51.79.51.204/' + this.currentBookData.premiereCouverture;
  }

  /**
   * Navigate back to the previous page
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Handle keyboard events for interactive elements
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      // Trigger the click event on the element
      (event.target as HTMLElement).click();
    }
  }

  /**
   * Navigate to book detail page
   * Opens the book in a new tab
   */
  navigateToBook(isbn: string): void {
    if (isbn) {
      window.open(`/book/${isbn}`, '_blank');
    }
  }


  /**
   * Subscribe to book summary data
   */
  private subscribeToBookSummary() {
    this.summarySubscription = bookSummary$
      .subscribe(data => {
        this.summaryBook = data as string;
        this.updateSummary();
      });
  }

  /**
   * Subscribe to book rating data
   */
  private subscribeToBookRating() {
    this.ratingSubscription = rating$
      .subscribe(data => this.ratingBook = data as string);
  }

  /**
   * Subscribe to Babelio URL data
   */
  private subscribeToBabelioUrl() {
    this.babelioSubscription = urlBabelio$
      .subscribe(data => {
        this.babelioLink = data as string;
        if (this.summaryBook) {
          this.updateSummary();
        }
      });
  }

  /**
   * Subscribe to current book data
   */
  private subscribeToCurrentBook() {
    this.bookSubscription = currentBook$
      .subscribe(data => {
        this.currentBookData = data;
        // Process descriptions whenever book data changes
        if (this.currentBookData) {
          this.processBookDescriptions();
        }
      });
  }

  /**
   * Subscribe to similar books data
   */
  private subscribeToSimilarBooks() {
    this.similarBooksSubscription = similarBooks$
      .subscribe(books => {
        if (books && books.length > 0) {
          console.log('Received similar books:', books);
          this.similarBooks = books;
        }
      });
  }

  ngOnDestroy() {
    // Unsubscribe from all subscriptions
    if (this.summarySubscription) this.summarySubscription.unsubscribe();
    if (this.ratingSubscription) this.ratingSubscription.unsubscribe();
    if (this.babelioSubscription) this.babelioSubscription.unsubscribe();
    if (this.bookSubscription) this.bookSubscription.unsubscribe();
    if (this.similarBooksSubscription) this.similarBooksSubscription.unsubscribe();
    
    this.destroy$.next();
    this.destroy$.complete();
  }
}
