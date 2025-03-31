import { Injectable } from '@angular/core';
import { SPARQL_WIKIDATA } from '../constants/sparql';
import axios from 'axios';
import { load } from 'cheerio';
import { HttpSparqlService } from './http-sparql.service';
import { Book } from '../constants/Book';
import { urlBabelioSubject, bookSummarySubject, ratingSubject, currentBookSubject } from '../classes/subjects';
import { BooksService } from './books.service';
import { EnhancedFilterService } from './enhanced-filter.service';
import { EnhancedSparqlQueryBuilderService } from './enhanced-sparql-query-builder.service';
import { Appreciation } from '../constants/Appreciation';
import { BookFilter } from '../models/book-filter.model';

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
      if (value !== undefined && value !== null && this.isValidFilterKey(key)) {
        this.enhancedFilterService.updateFilter(key as keyof BookFilter, value);
      }
    });
    
    // Build and execute unified query that works across all sources
    const query = this.sparqlQueryBuilder.buildUnifiedQuery(filters);
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
  findSimilarBooks(bookUri: string): void {
    const query = this.sparqlQueryBuilder.buildSimilaritySearchQuery(bookUri);
    this.httpSparqlService.postQuery(query).then(response => {
      this.booksService.updateData(response);
    }).catch(error => {
      console.error('Error finding similar books:', error);
    });
  }
  
  /**
   * Get enhanced author information
   * @param authorName Name of the author to search for
   */
  getEnhancedAuthorInfo(authorName: string): void {
    const query = this.sparqlQueryBuilder.buildEnhancedAuthorQuery(authorName);
    this.httpSparqlService.postQuery(query).then(response => {
      this.booksService.updateData(response);
    }).catch(error => {
      console.error('Error getting author info:', error);
    });
  }

  /**
   * Get ISBNs from the current book map
   * @returns Array of ISBNs
   */
  private getIsbnsFromBookMap(): string[] {
    const isbns = [];
    for (const key in this.bookMap) {
      if (this.bookMap[key]?.isbn) {
        isbns.push(this.bookMap[key].isbn);
      }
    }
    return isbns;
  }

  // TODO Change to filter class

  /**
   * Filter books by source and category
   * This method is called when a source is selected in the source tab
   * @param source The source to filter by
   * @param category The category within the source to filter by
   */
  filterBooksByCategory(source: string, category: string) {
    console.log('Filtering by category:', source, category);
    this.applyFilters({
      source: source,
      category: category
    });
  }

  /**
   * Filter books by age
   * @param age The age value to add to the age filter
   */
  ageFilter(age: string) {
    const ageString = age.toString();
    
    // Get current age range and add the new age
    const currentFilters = this.enhancedFilterService.getCurrentFilters();
    const currentAgeRange = currentFilters.ageRange || [];
    const newAgeRange = [...currentAgeRange, ageString];
    
    // Use unified query approach for all cases
    this.applyFilters({ 
      ageRange: newAgeRange
    });
  }

  /**
   * Filter books by appreciation level
   * @param appreciation The appreciation level to filter by
   */
  filterBooksByAppreciation(appreciation: Appreciation) {
    // Use unified query approach for all cases
    this.applyFilters({ 
      appreciation: appreciation 
    });
  }

  /**
   * Filter books by title
   * @param name The title to filter by
   */
  filterName(name: string) {
    this.applyFilters({ title: name });
  }

  /**
   * Filter books by genre
   * @param genre The genre to filter by
   */
  filterGenre(genre: string) {
    this.applyFilters({ 
      genre: genre !== 'No Genre Selected' ? genre : undefined 
    });
  }

  /**
   * Filter books by author
   * @param author The author to filter by
   */
  filterBooksByAuthor(author: string) {
    this.applyFilters({ author });
  }

  /**
   * Check if a key is a valid filter key
   * @param key The key to check
   * @returns True if key is a valid BookFilter key
   */
  private isValidFilterKey(key: string): key is keyof BookFilter {
    return [
      'title', 'isbn', 'inLanguage', 'author', 'nationality', 
      'illustrator', 'genre', 'subjectThema', 'ageRange',
      'educationLevel', 'source', 'category', 'appreciation',
      'publisher', 'datePublished', 'award'
    ].includes(key);
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
   * Filter books by a specific author
   * @param filterAuthor The author name to filter by
   */
  filterAuthorBooks(filterAuthor: string) {
    this.inAuthorsComponent = true;
    this.applyFilters({ author: filterAuthor });
  }

  /**
   * Filter books by age range
   * @param ageRange The age range to filter by
   */
  filterBooksByAge(ageRange: string | string[]) {
    console.log("Filtering by age:", ageRange);
    this.applyFilters({ 
      ageRange: ageRange !== 'No Age Selected' ? 
        (Array.isArray(ageRange) ? ageRange : [ageRange]) : []
    });
  }

  // Duplicate method removed - filterAward was redundant with filterBooksByAward

  /**
   * Filter books by language
   * @param language The language to filter by
   */
  filterLanguage(language: string) {
    this.applyFilters({ 
      inLanguage: language !== 'No Language Selected' ? language : undefined
    });
  }

  getAuthorInfo(filterAuthor: string) {
    const sparqlQuery = SPARQL_WIKIDATA(filterAuthor);
    this.httpSparqlService.postQuery(sparqlQuery).then((response) => {
        this.booksService.updateData(response);
    });
  }

  async bingSearchBook(book: Book) {
    currentBookSubject.next(book);
    const query = `${book.title} ${book.authors[0]} site:babelio.com`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodedQuery}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': '4529dde1556f4695ae08290082c14988',
        },
      });
      const firstLink = response.data.webPages.value[0].url;
      this.scrapeWebsite(firstLink);
      urlBabelioSubject.next(firstLink);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(`An error occurred: ${error.message}`);
    }
  }

  async bingSearchPublisher(publisher: string) {
    const query = `Éditions ${publisher}`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodedQuery}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': '4529dde1556f4695ae08290082c14988',
        },
      });
      const firstLink = response.data.webPages.value[0].url;

      // Open the firstLink in a new browser window or tab
      window.open(firstLink, '_blank');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(`An error occurred: ${error.message}`);
    }
  }

  async scrapeWebsite(url: string): Promise<void> {
    const encodedUrl = encodeURIComponent(url);
    const proxyUrl = `http://localhost:3000/proxy?url=${encodedUrl}`;

    try {
      const response = await axios.get(proxyUrl, { responseType: 'text' });

      const rawHtml = response.data;

      const $ = load(rawHtml, { decodeEntities: false });

      const bookSummary = $('.livre_resume').text().trim();
      bookSummarySubject.next(bookSummary);
      console.log(bookSummary);

      const rating = $('.grosse_note').text().trim();
      ratingSubject.next(rating);
      console.log(rating);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(`An error occurred: ${error.message}`);
    }
  }

  /**
   * Execute a SPARQL query and update the books service with the response
   * @param query The SPARQL query to execute
   * @returns A promise that resolves when the query is complete
   */
  private async executeQuery(query: string): Promise<void> {
    try {
      // Reset state for new query
      this.bookMap = {};
      this.inAuthorsComponent = false;
      this.inAwardsComponent = false;
      
      const response = await this.httpSparqlService.postQuery(query);
      this.booksService.updateData(response);
      return Promise.resolve();
    } catch (error) {
      console.error('Error executing query:', error);
      return;
    }
  }
  
  /**
   * Update books data using the current filters
   * Uses the unified query approach to fetch data from all relevant sources
   */
  async updateBook() {
    const currentFilters = this.enhancedFilterService.getCurrentFilters();
    console.log('Updating book data with filters:', currentFilters);
    
    // Use the unified query approach that works for all filters and sources
    const query = this.sparqlQueryBuilder.buildUnifiedQuery(currentFilters);
    
    try {
      console.log('Executing unified query for updateBook');
      const response = await this.httpSparqlService.postQuery(query);
      console.log(`Unified query returned ${response.results?.bindings?.length || 0} results`);
      this.booksService.updateData(response);
    } catch (error) {
      console.error('Error executing unified query in updateBook:', error);
    }
  }
}
