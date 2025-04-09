import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { bookSummary$, books$, currentBook$, rating$, urlBabelio$ } from 'src/app/classes/subjects';
import { Book } from 'src/app/constants/Book';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-book-component',
  templateUrl: './book.component.html',
  standalone: true,
  imports: [NgIf, NgFor],
  styleUrls: ['./book.component.css']
})
export class BookComponent implements OnInit, OnDestroy {
  // Book data properties
  summaryBook: string | null = null;
  ratingBook: string | null = null;
  currentBookData: Book | null = null;
  babelioLink: string | null = null;
  similarBooks: Book[] = [];
  
  // UI state
  activeTab: 'summary' | 'awards' | 'details' | 'similar' = 'summary';
  
  // Subscriptions
  private summarySubscription: Subscription;
  private ratingSubscription: Subscription;
  private babelioSubscription: Subscription;
  private bookSubscription: Subscription;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute, 
    public socketService: SocketSparqlService,
    private router: Router,
    private location: Location
  ) {
    this.subscribeToBabelioUrl();
    this.subscribeToBookSummary();
    this.subscribeToBookRating();
    this.subscribeToCurrentBook();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const bookId = params['id'];
      if (bookId && this.currentBookData) {
        // Load similar books using the book URI
        this.loadSimilarBooks(bookId);
      }
    });
  }

  /**
   * Load books similar to the current book
   * @param bookId The ID of the current book
   */
  loadSimilarBooks(bookId: string) {
    // Construct the book URI based on the book ID
    const bookUri = `http://schema.org/Book${bookId}`;
    
    // Find similar books
    this.socketService.findSimilarBooks(bookUri);
    
    // Subscribe to the books observable to get the similar books
    const booksSubscription = books$.subscribe((books: Book[]) => {
      if (books && books.length > 0) {
        this.similarBooks = books.filter((book: Book) => 
          book.title !== this.currentBookData?.title
        );
      }
    });
    
    // Add the subscription to be cleaned up on destroy
    this.destroy$.subscribe(() => {
      booksSubscription.unsubscribe();
    });
  }

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
  setActiveTab(tab: 'summary' | 'awards' | 'details' | 'similar'): void {
    this.activeTab = tab;
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
   * Navigate to author page
   */
  navigateToAuthor(authorName: string): void {
    this.router.navigate(['/author', authorName]);
  }

  /**
   * Navigate to publisher info
   */
  navigateToPublisher(publisher: string): void {
    // if (publisher) {
      // this.socketService.bingSearchPublisher(publisher);
    // }
    return
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
        this.currentBookData = data as Book; 
      }); 
  }

  ngOnDestroy() {
    // Unsubscribe from all subscriptions
    if (this.summarySubscription) this.summarySubscription.unsubscribe();
    if (this.ratingSubscription) this.ratingSubscription.unsubscribe();
    if (this.babelioSubscription) this.babelioSubscription.unsubscribe();
    if (this.bookSubscription) this.bookSubscription.unsubscribe();
    
    this.destroy$.next();
    this.destroy$.complete();
  }
}
