import { Injectable } from '@angular/core';
import { HttpSparqlService } from './http-sparql.service';
import { Book, SparqlBinding } from '../interfaces/Book';
import { BooksService } from './books.service';
import { EnhancedFilterService } from './enhanced-filter.service';
import { EnhancedSparqlQueryBuilderService } from './enhanced-sparql-query-builder.service';
import { BookFilter } from '../interfaces/book-filter.model';
import { BOOK_QUERY } from '../queries/book';
import { booksSource, currentBookSubject } from '../classes/subjects';
import { similarBooksQuery } from '../queries/similar';
import { AWARDS_QUERY } from '../queries/awards';
import { PRICE_QUERY } from '../queries/price';

@Injectable({
  providedIn: 'root',
})
export class SocketSparqlService {
  constructor(
    private readonly httpSparqlService: HttpSparqlService,
    private readonly booksService: BooksService,
    private readonly enhancedFilterService: EnhancedFilterService,
    private readonly sparqlQueryBuilder: EnhancedSparqlQueryBuilderService
  ) {}

  sparqlQuery : string;
  bookMap: Record<string, Book> = {};

  // TODO define ?
  inAuthorsComponent = false;
  inAwardsComponent = false;
  
  /**
   * Apply multiple filters at once and execute a unified query
   * @param filters BookFilter object with all filter criteria
   * @returns Promise that resolves when the query is complete
   */
  applyFilters(filters: BookFilter): Promise<void> {
    console.log('Applying filters with unified query:', filters);
    
    // Reset state
    this.bookMap = {};
    this.inAuthorsComponent = false;
    this.inAwardsComponent = false;
    
    // Update filter service with all filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        this.enhancedFilterService.updateFilter(key as keyof BookFilter, value);
      }
    });
    
    // Build and execute unified query that works across all sources
    const query = this.sparqlQueryBuilder.buildComprehensiveQuery(filters);
    console.log('Executing unified query:', query.substring(0, 500) + '...');
    
    return this.httpSparqlService.postQuery(query)
      .then(response => {
        console.log(`Unified query returned ${response.results?.bindings?.length || 0} results`);
        this.booksService.updateData(response);
      })
      .catch((error: Error) => {
        console.error('Error executing unified query with filters:', error);
        throw error; // Rethrow to allow caller to handle the error
      });
  }

  /**
   * Find books similar to a given book
   * @param bookUri URI of the book to find similar books for
   */
  async findSimilarBooks(isbn: string) {
    console.log('Finding similar books for ISBN:', isbn);

    const query = similarBooksQuery(isbn);
    try {
      const response = await this.httpSparqlService.postQuery(query);
      console.log(`Similar books query returned ${response.results?.bindings?.length || 0} results`);
      await this.booksService.uploadSimilarBooks(response.results.bindings);
    } catch (error) {
      console.error('Error executing similar books query:', error);
    }
  }

  /**
   * Fetch awards information for a book
   * @param isbn ISBN of the book to fetch awards for
   * @returns Promise with the query response
   */
  async fetchBookAwards(isbn: string) {
    console.log('Fetching awards for book with ISBN:', isbn);
    const query = AWARDS_QUERY(isbn);
    
    try {
      const response = await this.httpSparqlService.postQuery(query);
      console.log(`Awards query returned ${response.results?.bindings?.length || 0} results`);
      return response.results.bindings;
    } catch {
      return [];
    }
  }

  /**
   * Fetch price information for a book
   * @param isbn ISBN of the book to fetch price data for
   * @returns Promise with the query response
   */
  async fetchBookPrices(isbn: string) {
    console.log('Fetching price information for book with ISBN:', isbn);
    const query = PRICE_QUERY(isbn);
    
    try {
      const response = await this.httpSparqlService.postQuery(query);
      return response.results.bindings;
    } catch {
      return [];
    }
  }


  /**
   * Filter books by award name
   * @param filterAward The award name to filter by
   */
  filterBooksByAward(filterAward: string) {
    this.inAwardsComponent = true;
    this.applyFilters({ award: filterAward });
  }

  /**
   * Search for a book using ISBN and dispatch the result to components 
   * using subjects/observables
   * @param isbn The ISBN of the book to search for
   * @returns Promise that resolves to the Book object if found, null otherwise
   */
  async bingSearchBook(isbn: string): Promise<Book | null> {
    console.log('Searching book with ISBN:', isbn);
    const query = BOOK_QUERY(isbn);
    
    try {
      const data = await this.httpSparqlService.postBookQuery(query);
      console.log('Book search data:', data);

      // Extract and transform book data from response
      if (data.results?.bindings?.length > 0) {
        const binding = data.results.bindings[0];

        
        
        // Create a Book object from the binding data
        const book: Book = {
          title: binding.name?.value || '',
          isbn: binding.isbn?.value || isbn,
          authorList: binding.authorList?.value ? [binding.authorList.value] : [],
          datePublished: binding.datePublished?.value ?? '',
          publisher: binding.publisherName?.value || '',
          inLanguage: '',
          premiereCouverture: binding.premiereCouverture?.value ?? '',
          description: binding.description?.value ?? '',
          infoSource: binding.infoSource?.value ?? '',
          collectionName: binding.collectionName?.value 
        };
        
        // Add raw results to allow processing of all bindings
        book['rawResults'] = data.results.bindings as unknown as SparqlBinding[];
        
        console.log('Dispatching book data to component:', book);
        
        // Update the bookMap
        this.bookMap[isbn] = book;
        
        // Dispatch to current book subject
        currentBookSubject.next(book);
        
        // Also update books source with the single book as an array
        booksSource.next([book]);
        
        return book;
      } else {
        console.warn('No book found with ISBN:', isbn);
        return null;
      }
    } catch (error) {
      console.error('Error searching for book:', error);
      return null;
    }
  }

}
