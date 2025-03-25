import { Injectable } from '@angular/core';
import {
  SPARQL_BABELIO,
  SPARQL_QUERY,
  SPARQL_QUERY_BNF,
  SPARQL_QUERY_CONSTELLATIONS,
  SPARQL_WIKIDATA,
  SPARQL_BTLF_FILTER,
  SPARQL_QUERY_LURELU_FILTER,
} from '../constants/sparql';
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
  private themeCode: string;
  private storedIsbns: string | null = null;  
  private themeActive = false;

  inAuthorsComponent = false;
  inAwardsComponent = false;
  
  /**
   * Apply multiple filters at once and execute a query
   * @param filters BookFilter object with all filter criteria
   * @returns Promise that resolves when the query is complete
   */
  applyFilters(filters: BookFilter): Promise<void> {
    // Reset state
    this.bookMap = {};
    this.storedIsbns = null;
    this.themeActive = false;
    this.inAuthorsComponent = false;
    this.inAwardsComponent = false;
    
    // Update filter service with all filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && this.isValidFilterKey(key)) {
        this.enhancedFilterService.updateFilter(key as keyof BookFilter, value);
      }
    });
    
    // Build and execute query
    const query = this.sparqlQueryBuilder.buildComprehensiveQuery(filters);
    return this.httpSparqlService.postQuery(query)
      .then(response => {
        this.booksService.updateData(response);
      })
      .catch((error: Error) => {
        console.error('Error executing query with filters:', error);
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

  runBtlfQuery(filter: string, description: string): void {
    this.bookMap = {};
    this.storedIsbns = null;
    this.themeActive = true;
    this.themeCode = description;
    const sparqlQuery = SPARQL_BTLF_FILTER(filter);
    this.httpSparqlService.postQuery(sparqlQuery);

    // Subscribe to the Observable to handle the response from findCodeByDescription
    this.httpSparqlService.findCodeByDescription(description).then((codeValue) => {
      if (codeValue) {
        this.themeCode = codeValue;
        // Optionally perform further actions if codeValue is successfully retrieved
        console.log(`Found code value: ${codeValue}`);
      } else {
        console.log('No code value found for the given description.');
      }
    }).catch((err) => {
      console.error('Error finding code by description:', err);
    });
  }

  getIsbnsFromBookMap() {
    const isbns = [];
    for (const key in this.bookMap) {
      if (this.bookMap[key]?.isbn) {
        isbns.push(this.bookMap[key].isbn);
      }
    }
    return isbns;
  }

  updateBooksByIsbn() {
    const isbns = this.getIsbnsFromBookMap()
      .map((isbn) => `"${isbn}"`)
      .join(', ');
    console.log(isbns);
    if (!isbns.length) {
      console.log('No ISBNs found in bookMap, aborting query.');
      return;
    }
    let baseQuery;


    const currentFilters = this.enhancedFilterService.getCurrentFilters();
    switch (currentFilters.source) {
      case 'Babelio': { 
        const starRating = parseInt(
          currentFilters.category?.split(' ')[0] ?? '',
          10
        );
        baseQuery = SPARQL_BABELIO(
          `FILTER(?averageReview >= ${starRating} && ?isbn IN (${isbns}))`
        );
        break; }
      case 'Constellation':
        console.log(2222);
        if (currentFilters.category === 'Coup de coeur') {
          baseQuery = SPARQL_QUERY_CONSTELLATIONS(
            `FILTER(?isCoupDeCoeur = true && ?isbn IN (${isbns}))`
          );
          console.log('SPARQL Query: ', baseQuery);
          break;
        } else {
          baseQuery = SPARQL_QUERY_CONSTELLATIONS(
            `FILTER(?isbn IN (${isbns}))`
          );
          console.log('SPARQL Query: ', baseQuery);
          break;
        }
      case 'BNF':
        baseQuery = SPARQL_QUERY_BNF(
          `FILTER(?avis = "${currentFilters.category}" && (?isbn IN (${isbns}) || ?ean IN (${isbns})))`
        );
        break;
      case 'Lurelu':
        baseQuery = SPARQL_QUERY_LURELU_FILTER(`FILTER(?isbn IN (${isbns}))`);
        break;
      case 'BTLF':
        baseQuery = SPARQL_BTLF_FILTER(`FILTER(?isbn IN (${isbns}))`);
        break;
      default:
        console.log('Unhandled source case');
        return;
    }
    this.httpSparqlService.postQuery(baseQuery).then((response) => {
        this.booksService.updateData(response);

    });
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
  }

  ageFilter(age: string) {
    if (this.themeActive) {
      const isbns =
        this.storedIsbns ?? 
        this.getIsbnsFromBookMap()
          .map((isbn) => `"${isbn}"`)
          .join(', ');
      if (!this.storedIsbns) {
        this.storedIsbns = isbns;
      }
      this.bookMap = {};
      const ageString = age.toString();
      const currentFilters = this.enhancedFilterService.getCurrentFilters();
      const currentAgeRange = currentFilters.ageRange || [];
      this.enhancedFilterService.updateFilter('ageRange', [...currentAgeRange, ageString]);
      const updatedFilters = this.enhancedFilterService.getCurrentFilters();
      
      // Combine all age filters into a single expression
      if (updatedFilters.ageRange && updatedFilters.ageRange.length > 0) {
        const ageFilters = updatedFilters.ageRange.map(age => 
          `(STR(?ageRange) = "${age}" || STR(?ageRange) = "${age}," || STR(?ageRange) = ",${age}" || CONTAINS(STR(?ageRange), ",${age},"))`
        );
        
        // Create a single query with all age filters combined
        const combinedAgeFilter = ageFilters.join(' || ');
        
        const query_bnf = SPARQL_QUERY_BNF(`
    FILTER((${combinedAgeFilter}) &&
           ?isbn IN (${isbns}))`);

        const query_constellations = SPARQL_QUERY_CONSTELLATIONS(`
    FILTER((${combinedAgeFilter}) &&
           ?isbn IN (${isbns}))`);

        // Send the combined queries instead of individual ones
        this.httpSparqlService.postQuery(query_bnf);
        this.httpSparqlService.postQuery(query_constellations);
      }
    } else {
      this.bookMap = {};
      const ageString = age.toString();
      const currentFilters = this.enhancedFilterService.getCurrentFilters();
      const currentAgeRange = currentFilters.ageRange || [];
      this.enhancedFilterService.updateFilter('ageRange', [...currentAgeRange, ageString]);
      this.updateBook();
    }
  }

  filterBooksByAppreciation(appreciation: Appreciation) {
    if (this.themeActive) {
      const isbns = this.getIsbnsFromBookMap()
        .map((isbn) => `"${isbn}"`)
        .join(', ');
      this.storedIsbns = null;
      this.bookMap = {};
      this.enhancedFilterService.updateFilter('appreciation', appreciation);
      const currentFilters = this.enhancedFilterService.getCurrentFilters();
      switch (currentFilters.appreciation) {
        case Appreciation.HighlyAppreciated: {
          const query_lurelu = SPARQL_QUERY_LURELU_FILTER(
            `FILTER(?isbn IN (${isbns}))`
          );
          const query_babelio = SPARQL_BABELIO(
            `FILTER(?averageReview >= 4 && ?isbn IN (${isbns}))`
          );
          const query_bnf = SPARQL_QUERY_BNF(
            `FILTER((?avis = "Coup de coeur !" || ?avis = "Bravo !") && ?isbn IN (${isbns}))`
          );
          const query_constellations = SPARQL_QUERY_CONSTELLATIONS(
            `FILTER(?isCoupDeCoeur = true && ?isbn IN (${isbns}))`
          );

          this.httpSparqlService.postQuery(query_lurelu);
          this.httpSparqlService.postQuery(query_babelio);
          this.httpSparqlService.postQuery(query_bnf);
          this.httpSparqlService.postQuery(query_constellations);
          break;
        }
        case 'notHighlyAppreciated': {
          const query_babelio_not_appreciated = SPARQL_BABELIO(
            `FILTER(?averageReview <= 3 && ?isbn IN (${isbns}))`
          );
          const query_bnf_not_appreciated = SPARQL_QUERY_BNF(
            `FILTER((?avis = "Hélas !" || ?avis = "Problème...") && ?isbn IN (${isbns}))`
          );
          this.httpSparqlService.postQuery(query_babelio_not_appreciated).then((response) => {
            this.booksService.updateData(response);
        });
          this.httpSparqlService.postQuery(query_bnf_not_appreciated).then((response) => {
            this.booksService.updateData(response);
        });
          break;
        }
      }
    } else {
      this.bookMap = {};
      this.enhancedFilterService.updateFilter('appreciation', appreciation);
      this.updateBook();
    }
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
   * Filter books by award name
   * @param filterAward The award name to filter by
   */
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

  filterBooksByAward(filterAward: string) {
    this.inAwardsComponent = true;
    // Use SPARQL_QUERY_DESCRIPTION directly instead of going through the builder
    const sparqlQuery = this.sparqlQueryBuilder.buildComprehensiveQuery({ 
      award: filterAward 
    });
    this.httpSparqlService.postQuery(sparqlQuery).then((response) => {
        this.booksService.updateData(response);
    });
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

  /**
   * Filter books by award
   * @param award The award to filter by
   */
  filterAward(award: string) {
    this.applyFilters({ award });
  }

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
      this.storedIsbns = null;
      this.themeActive = false;
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
  
  async updateBook() {
    const currentFilters = this.enhancedFilterService.getCurrentFilters();
    const { source, category, appreciation, ageRange } = currentFilters;
    
    console.log('Updating book data with filters:', currentFilters);
    
    // Source query based on source and category
    if (source) {
      const sourceQuery = this.sparqlQueryBuilder.getSourceQuery(source, category);
      console.log(sourceQuery);

      if (sourceQuery) {
        await this.executeQuery(sourceQuery);
        return; // Return early if we have a source-specific query
      }
    }

    // Appreciation queries
    if (appreciation) {
      const appreciationQueries = this.sparqlQueryBuilder.getAppreciationQueries(appreciation);
      for (const query of appreciationQueries) {
        await this.executeQuery(query);
      }
      return; // Return early if we have appreciation queries
    }

    // Age filter queries
    if (ageRange && ageRange.length > 0) {
      // Combine all age filters into a single expression
      const ageFilters = ageRange.map(age => 
        `(STR(?ageRange) = "${age}" || STR(?ageRange) = "${age}," || STR(?ageRange) = ",${age}" || CONTAINS(STR(?ageRange), ",${age},"))`
      );
      
      // Create a single filter with all age filters combined with OR
      const combinedAgeFilter = `FILTER(${ageFilters.join(' || ')})`;
      
      // Send just two queries (one for each source) with all ages combined
      await this.executeQuery(SPARQL_QUERY_BNF(combinedAgeFilter));
      await this.executeQuery(SPARQL_QUERY_CONSTELLATIONS(combinedAgeFilter));
      
      return; // Return early if we have age filter queries
    }
    
    // If no specific filters, use a general query
    await this.executeQuery(SPARQL_QUERY(''));
  }
}
