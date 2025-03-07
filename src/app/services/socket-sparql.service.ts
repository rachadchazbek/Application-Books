import { Injectable } from '@angular/core';
import {
  SPARQL_BABELIO,
  SPARQL_QUERY,
  SPARQL_QUERY_BNF,
  SPARQL_QUERY_CONSTELLATIONS,
  SPARQL_QUERY_DESCRIPTION,
  SPARQL_QUERY_LURELU,
  SPARQL_WIKIDATA,
  SPARQL_BTLF,
  SPARQL_BTLF_FILTER,
  SPARQL_QUERY_LURELU_FILTER,
} from '../constants/sparql';
import axios from 'axios';
import { load } from 'cheerio';
import { HttpSparqlService } from './http-sparql.service';
import { Book } from '../constants/Book';
import { urlBabelioSubject, bookSummarySubject, ratingSubject, currentBookSubject } from '../classes/subjects';
import { BooksService } from './books.service';
import FilterService from './filter.service';
import { SparklQueryBuilderService } from './sparkl-query-builder.service';
import { Categories } from '../constants/Categories';
import { Appreciation } from '../constants/Appreciation';

@Injectable({
  providedIn: 'root',
})
export class SocketSparqlService {
  constructor(
    private readonly httpSparqlService: HttpSparqlService,
    private readonly booksService: BooksService,
    private readonly filterService: FilterService,
    private readonly sparklQueryBuilder: SparklQueryBuilderService
  ) {}

  sparqlQuery : string;
  bookMap: Record<string, Book> = {};

  // TODO define ?
  private themeCode: string;
  private storedIsbns: string | null = null;  
  private themeActive = false;

  inAuthorsComponent = false;
  inAwardsComponent = false;

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


    switch (this.filterService.activeFilters.filterSource) {
      case 'Babelio': { 
        const starRating = parseInt(
          this.filterService.activeFilters.filterCategory?.split(' ')[0] ?? '',
          10
        );
        baseQuery = SPARQL_BABELIO(
          `FILTER(?averageReview >= ${starRating} && ?isbn IN (${isbns}))`
        );
        break; }
      case 'Constellation':
        console.log(2222);
        if (this.filterService.activeFilters.filterCategory === 'Coup de coeur') {
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
          `FILTER(?avis = "${this.filterService.activeFilters.filterCategory}" && (?isbn IN (${isbns}) || ?ean IN (${isbns})))`
        );
        break;
      case 'Lurelu':
        baseQuery = SPARQL_QUERY_LURELU + ` FILTER(?isbn IN (${isbns}))`;
        break;
      case 'BTLF':
        baseQuery = SPARQL_BTLF + ` FILTER(?isbn IN (${isbns}))`;
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

  filterBooksByCategory(source: string, category: Categories) {
    if (this.themeActive) {
      console.log(11111);
      this.updateBooksByIsbn();
      this.filterService.activeFilters.filterSource = source;
      this.filterService.activeFilters.filterCategory = category;
      this.storedIsbns = null;
      this.bookMap = {};
    } else {
      this.bookMap = {};
      this.filterService.activeFilters.filterSource = source;
      this.filterService.activeFilters.filterCategory = category;
      this.updateBook();
    }
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
      this.filterService.activeFilters.filterAge.push(ageString);
      for (const age of this.filterService.activeFilters.filterAge) {
        const query_bnf = SPARQL_QUERY_BNF(`
    FILTER((STR(?ageRange) = "${age}" || STR(?ageRange) = "${age}," || STR(?ageRange) = ",${age}" || CONTAINS(STR(?ageRange), ",${age},")) &&
           ?isbn IN (${isbns}))`);

        const query_constellations = SPARQL_QUERY_CONSTELLATIONS(`
    FILTER((STR(?ageRange) = "${age}" || STR(?ageRange) = "${age}," || STR(?ageRange) = ",${age}" || CONTAINS(STR(?ageRange), ",${age},")) &&
           ?isbn IN (${isbns}))`);

        // Send each query separately through the socket service
        // this.socketService.send('getSparqlData', query_bnf);
        // this.socketService.send('getSparqlData', query_constellations);
        this.httpSparqlService.postQuery(query_bnf);
        this.httpSparqlService.postQuery(query_constellations);
      }
    } else {
      this.bookMap = {};
      const ageString = age.toString();
      this.filterService.activeFilters.filterAge.push(ageString);
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
      this.filterService.activeFilters.filterAppreciation = appreciation;
      switch (this.filterService.activeFilters.filterAppreciation) {
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
      this.filterService.activeFilters.filterAppreciation = appreciation;
      this.updateBook();
    }
  }

  filterName(filterName: string) {
    this.bookMap = {};
    this.filterService.activeFilters.filterName = filterName;
    this.sparqlQuery = this.filterService.updateFilters();

  }

  filterGenre(filterGenre: string) {
    this.bookMap = {};
    this.filterService.activeFilters.filterGenre =
      filterGenre !== 'No Genre Selected' ? filterGenre : "";
    this.sparqlQuery = this.filterService.updateFilters();
  }

  filterBooksByAuthor(filterAuthor: string) {
    this.bookMap = {};
    this.filterService.activeFilters.filterAuthor = filterAuthor;
    this.sparqlQuery = this.filterService.updateFilters();

  }

  filterBooksByAward(filterAward: string) {
    this.bookMap = {};
    this.inAwardsComponent = true;
    const sparqlQuery = SPARQL_QUERY_DESCRIPTION(
      `FILTER(CONTAINS(?finalAwardName, "${filterAward}"))`
    );
    this.httpSparqlService.postQuery(sparqlQuery).then((response) => {
        this.booksService.updateData(response);
    });
  }

  filterAuthorBooks(filterAuthor: string) {
    this.bookMap = {};
    this.inAuthorsComponent = true;
    const sparqlQuery = SPARQL_QUERY(`FILTER(?author = "${filterAuthor}")`);
    this.httpSparqlService.postQuery(sparqlQuery).then((response) => {
        this.booksService.updateData(response);
    });
  }

  /**
   * Filter books by age range
   * @param filterAge The age range to filter by
   */
  filterBooksByAge(filterAge: string | string[]) {
    this.bookMap = {};
    console.log("Filtering by age:", filterAge);
    this.filterService.activeFilters.filterAge =
      filterAge !== 'No Age Selected' ? (Array.isArray(filterAge) ? filterAge : [filterAge]) : [];
    this.sparqlQuery = this.filterService.updateFilters();
  }

  filterAward(filterAward: string) {
    this.bookMap = {};
    this.filterService.activeFilters.filterAward = filterAward;
    this.sparqlQuery = this.filterService.updateFilters();

  }

  filterLanguage(filterLanguage: string) {
    this.bookMap = {};
    this.filterService.activeFilters.filterLanguage =
      filterLanguage !== 'No Language Selected' ? filterLanguage : "";
    this.sparqlQuery = this.filterService.updateFilters();
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
  async executeQuery(query: string): Promise<void> {
    try {
      // Reset state for new query
      this.bookMap = {}; 
      this.storedIsbns = null;
      this.themeActive = false;
      this.inAuthorsComponent = false;
      this.inAwardsComponent = false;
      
      console.log('Executing query:', query);
      const response = await this.httpSparqlService.postQuery(query);
      this.booksService.updateData(response);
      return Promise.resolve();
    } catch (error) {
      console.error('Error executing query:', error);
      return Promise.reject(error);
    }
  }
  
  async updateBook() {
    const { filterSource, filterCategory, filterAppreciation, filterAge } = this.filterService.activeFilters;
    
    // Source query based on filterSource and filterCategory
    const sourceQuery = this.sparklQueryBuilder.getSourceQuery(filterSource, filterCategory);
    if (sourceQuery) {
      await this.executeQuery(sourceQuery);
    }

    // Appreciation queries
    const appreciationQueries = this.sparklQueryBuilder.getAppreciationQueries(filterAppreciation);
    appreciationQueries.forEach(query => this.executeQuery(query));

    // Age filter queries
    if (filterAge) {
      filterAge.forEach(age => {
        const ageFilter = this.sparklQueryBuilder.getAgeFilter(age);
        this.executeQuery(SPARQL_QUERY_BNF(ageFilter));
        this.executeQuery(SPARQL_QUERY_CONSTELLATIONS(ageFilter));
      });
    }
  }
  
  async queryDB() {
    const response = await this.httpSparqlService.postQuery(this.sparqlQuery);
    this.booksService.updateData(response);
  }
}
