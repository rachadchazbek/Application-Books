import { Injectable } from '@angular/core';
import { HttpSparqlService } from './http-sparql.service';
import { Book } from '../constants/Book';
import { BooksService } from './books.service';
import { EnhancedFilterService } from './enhanced-filter.service';
import { EnhancedSparqlQueryBuilderService } from './enhanced-sparql-query-builder.service';
import { BookFilter } from '../models/book-filter.model';
import { BOOK_QUERY } from '../constants/sparql';

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
  findSimilarBooks(): void {
    // const query = this.sparqlQueryBuilder.buildSimilaritySearchQuery(bookUri);
    // this.httpSparqlService.postQuery(query).then(response => {
    //   this.booksService.updateData(response);
    // }).catch(error => {
    //   console.error('Error finding similar books:', error);
    // });
  }
  
  // /**
  //  * Get enhanced author information
  //  * @param authorName Name of the author to search for
  //  */
  // getEnhancedAuthorInfo(authorName: string): void {
  //   const query = this.sparqlQueryBuilder.buildEnhancedAuthorQuery(authorName);
  //   this.httpSparqlService.postQuery(query).then(response => {
  //     this.booksService.updateData(response);
  //   }).catch(error => {
  //     console.error('Error getting author info:', error);
  //   });
  // }



  /**
   * Filter books by award name
   * @param filterAward The award name to filter by
   */
  filterBooksByAward(filterAward: string) {
    this.inAwardsComponent = true;
    this.applyFilters({ award: filterAward });
  }

  async bingSearchBook(isbn: string) {
    console.log('Bing search book with ISBN:', isbn);
    const query = BOOK_QUERY(isbn);
    
    console.log('Bing search book query:', query);
    const data = await this.httpSparqlService.postBookQuery(query);
    console.log('Bing search book data:', data);

    //TODO Dispatch data to the component
    

    }


  // async bingSearchBook(book: Book) {
  //   currentBookSubject.next(book);
  //   const query = `${book.title} ${book.authorList[0]} site:babelio.com`;
  //   const encodedQuery = encodeURIComponent(query);
  //   const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodedQuery}`;

  //   try {
  //     const response = await axios.get(url, {
  //       headers: {
  //         'Ocp-Apim-Subscription-Key': '4529dde1556f4695ae08290082c14988',
  //       },
  //     });
  //     const firstLink = response.data.webPages.value[0].url;
  //     this.scrapeWebsite(firstLink);
  //     urlBabelioSubject.next(firstLink);
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   } catch (error: any) {
  //     console.error(`An error occurred: ${error.message}`);
  //   }
  // }

  // async bingSearchPublisher(publisher: string) {
  //   const query = `Éditions ${publisher}`;
  //   const encodedQuery = encodeURIComponent(query);
  //   const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodedQuery}`;

  //   try {
  //     const response = await axios.get(url, {
  //       headers: {
  //         'Ocp-Apim-Subscription-Key': '4529dde1556f4695ae08290082c14988',
  //       },
  //     });
  //     const firstLink = response.data.webPages.value[0].url;

  //     // Open the firstLink in a new browser window or tab
  //     window.open(firstLink, '_blank');
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   } catch (error: any) {
  //     console.error(`An error occurred: ${error.message}`);
  //   }
  // }

  // async scrapeWebsite(url: string): Promise<void> {
  //   const encodedUrl = encodeURIComponent(url);
  //   const proxyUrl = `http://localhost:3000/proxy?url=${encodedUrl}`;

  //   try {
  //     const response = await axios.get(proxyUrl, { responseType: 'text' });

  //     const rawHtml = response.data;

  //     const $ = load(rawHtml, { decodeEntities: false });

  //     const bookSummary = $('.livre_resume').text().trim();
  //     bookSummarySubject.next(bookSummary);
  //     console.log(bookSummary);

  //     const rating = $('.grosse_note').text().trim();
  //     ratingSubject.next(rating);
  //     console.log(rating);
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   } catch (error: any) {
  //     console.error(`An error occurred: ${error.message}`);
  //   }
  // }
}
