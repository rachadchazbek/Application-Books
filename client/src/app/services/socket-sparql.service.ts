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
import { urlBabelioSubject, bookSummarySubject, ratingSubject, currentBookSubject, authorDataSubject, descriptionAwardSubject, booksSourceAuthor, booksSource } from '../classes/subjects';
import { BooksService } from './books.service';
import FilterService from './filter.service';

@Injectable({
  providedIn: 'root',
})
export class SocketSparqlService {
  constructor(
    private readonly httpSparqlService: HttpSparqlService,
    private readonly booksService: BooksService,
    private readonly filterService: FilterService
  ) {}

  bookMap: Record<string, Book> = {};

  // TODO define ?
  private themeActive = false;
  private themeCode: string;
  private storedIsbns: string | null = null;
  books: any; // todo fix any
  

  // TODO find a better handling method
  // Type everythoing
  inAuthorsComponent = false;
  booksAuthor: any;

  inAwardsComponent = false;
  booksAward: any;

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

  onInput(argument: string, value: string) {
    if (!value) {
      switch (argument) {
        case 'title':
          this.filterService.activeFilters.filterName = null;
          break;
        case 'author':
          this.filterService.activeFilters.filterAuthor = null;
          break;
        case 'award':
          this.filterService.activeFilters.filterAward = null;
          break;
        default:
          break;
      }
    }
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
    console.log(this.filterService.activeFilters);
    console.log(2222);
    console.log(this.filterService.activeFilters.filterSource);
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

  filterBooksByCategory(source: any, category: any) {
    if (this.themeActive) {
      console.log(11111);
      this.updateBooksByIsbn();
      this.filterService.activeFilters.filterSource = source ? source : null;
      this.filterService.activeFilters.filterCategory = category ? category : null;
      this.storedIsbns = null;
      this.bookMap = {};
    } else {
      this.bookMap = {};
      this.filterService.activeFilters.filterSource = source ? source : null;
      this.filterService.activeFilters.filterCategory = category ? category : null;
      this.updateBook();
    }
  }

  ageFilter(age: any) {
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

  filterBooksByAppreciation(appreciation: any) {
    if (this.themeActive) {
      const isbns = this.getIsbnsFromBookMap()
        .map((isbn) => `"${isbn}"`)
        .join(', ');
      this.storedIsbns = null;
      this.bookMap = {};
      this.filterService.activeFilters.filterAppreciation = appreciation
        ? appreciation
        : null;
      switch (this.filterService.activeFilters.filterAppreciation) {
        case 'highlyAppreciated': {
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
      this.filterService.activeFilters.filterAppreciation = appreciation
        ? appreciation
        : null;
      this.updateBook();
    }
  }

  filterName(filterName: string) {
    this.bookMap = {};
    this.filterService.activeFilters.filterName = filterName ? filterName : null;
    this.updateFilters();
  }

  filterGenre(filterGenre: string) {
    this.bookMap = {};
    this.filterService.activeFilters.filterGenre =
      filterGenre !== 'No Genre Selected' ? filterGenre : null;
    this.updateFilters();
  }

  filterBooksByAuthor(filterAuthor: string) {
    this.bookMap = {};
    this.filterService.activeFilters.filterAuthor = filterAuthor ? filterAuthor : null;
    this.updateFilters();
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

  filterBooksByAge(filterAge: any) {
    this.bookMap = {};
    this.filterService.activeFilters.filterAge =
      filterAge !== 'No Age Selected' ? filterAge : null;
    this.updateFilters();
  }

  filterAward(filterAward: any) {
    this.bookMap = {};
    this.filterService.activeFilters.filterAward = filterAward ? filterAward : null;
    this.updateFilters();
  }

  filterLanguage(filterLanguage: any) {
    this.bookMap = {};
    this.filterService.activeFilters.filterLanguage =
      filterLanguage !== 'No Language Selected' ? filterLanguage : null;
    this.updateFilters();
  }

  getAuthorInfo(filterAuthor: any) {
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
      console.log(rawHtml);

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

  updateBook() {
    console.log(this.filterService.activeFilters);
    let baseQuery;
    switch (this.filterService.activeFilters.filterSource) {
      case 'Babelio': { 
        const starRating = parseInt(
          this.filterService.activeFilters.filterCategory?.split(' ')[0] ?? ''
        );
        baseQuery = SPARQL_BABELIO(`FILTER(?averageReview >= ${starRating})`);
        this.httpSparqlService.postQuery(baseQuery).then((response) => {
        this.booksService.updateData(response);
    });;
        break; }
      case 'Constellation':
        if (this.filterService.activeFilters.filterCategory === 'Coup de coeur !') {
          baseQuery = SPARQL_QUERY_CONSTELLATIONS(
            `FILTER(?isCoupDeCoeur = true)`
          );
          this.httpSparqlService.postQuery(baseQuery).then((response) => {
        this.booksService.updateData(response);
    });;
          break;
        } else {
          baseQuery = SPARQL_QUERY_CONSTELLATIONS('');
          this.httpSparqlService.postQuery(baseQuery).then((response) => {
        this.booksService.updateData(response);
    });;
          break;
        }
      case 'BNF':
        console.log(this.filterService.activeFilters.filterCategory);
        baseQuery = SPARQL_QUERY_BNF(
          `FILTER(?avis = "${this.filterService.activeFilters.filterCategory}")`
        );
        this.httpSparqlService.postQuery(baseQuery).then((response) => {
        this.booksService.updateData(response);
    });;
        break;
      case 'Lurelu':
        baseQuery = SPARQL_QUERY_LURELU; // No additional filter needed for Lurelu
        this.httpSparqlService.postQuery(baseQuery).then((response) => {
        this.booksService.updateData(response);
    });;
        break;
      case 'BTLF':
        baseQuery = SPARQL_BTLF;
        this.httpSparqlService.postQuery(baseQuery).then((response) => {
        this.booksService.updateData(response);
    });;
        break;
      default:
        // Handle default case or error
        break;
    }
    switch (this.filterService.activeFilters.filterAppreciation) {
      case 'highlyAppreciated': {
        const query_lurelu = SPARQL_QUERY_LURELU;
        const query_babelio = SPARQL_BABELIO(`FILTER(?averageReview >= 4)`);
        const query_bnf = SPARQL_QUERY_BNF(
          `FILTER(?avis = "Coup de coeur !" || ?avis = "Bravo !")`
        );
        const query_constellations = SPARQL_QUERY_CONSTELLATIONS(
          `FILTER(?isCoupDeCoeur = true)`
        );

        this.httpSparqlService.postQuery(query_lurelu).then((response) => {
            this.booksService.updateData(response);
        });
        this.httpSparqlService.postQuery(query_babelio).then((response) => {
            this.booksService.updateData(response);
        });
        this.httpSparqlService.postQuery(query_bnf).then((response) => {
            this.booksService.updateData(response);
        });
        this.httpSparqlService.postQuery(query_constellations).then((response) => {
            this.booksService.updateData(response);
        });

        break;
      }
      case 'notHighlyAppreciated': {
        const query_babelio_not_appreciated = SPARQL_BABELIO(
          `FILTER(?averageReview <= 3)`
        );
        const query_bnf_not_appreciated = SPARQL_QUERY_BNF(
          `FILTER((?avis = "Hélas !" || ?avis = "Problème..."))`
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

    if (this.filterService.activeFilters.filterAge) {
      for (const age of this.filterService.activeFilters.filterAge) {
        const query_bnf = SPARQL_QUERY_BNF(`
      FILTER(STR(?ageRange) = "${age}" || STR(?ageRange) = "${age}," || STR(?ageRange) = ",${age}" || CONTAINS(STR(?ageRange), ",${age},")) 
          `);

        const query_constellations = SPARQL_QUERY_CONSTELLATIONS(`
      FILTER(STR(?ageRange) = "${age}" || STR(?ageRange) = "${age}," || STR(?ageRange) = ",${age}" || CONTAINS(STR(?ageRange), ",${age},")) 
          `);

        this.httpSparqlService.postQuery(query_bnf).then((response) => {
            this.booksService.updateData(response);
        });
        this.httpSparqlService.postQuery(query_constellations).then((response) => {
            this.booksService.updateData(response);
        });
      }
    }
  }

  updateFilters() {
    const filterQueries = [];

    if (this.filterService.activeFilters.filterName) {
      filterQueries.push(`FILTER(?title = "${this.filterService.activeFilters.filterName}")`);
    }
    // add else conditions to handle removal of filters
    if (this.filterService.activeFilters.filterGenre) {
      filterQueries.push(
        `FILTER(?finalGenreName = "${this.filterService.activeFilters.filterGenre}")`
      );
    }
    if (this.filterService.activeFilters.filterAuthor) {
      filterQueries.push(
        `FILTER(?author = "${this.filterService.activeFilters.filterAuthor}")`
      );
    }
    if (this.filterService.activeFilters.filterAge) {
      filterQueries.push(
        `FILTER(?ageRange >= "${this.filterService.activeFilters.filterAge}")`
      );
    }
    if (this.filterService.activeFilters.filterAward) {
      filterQueries.push(
        `FILTER(?finalAwardName = "${this.filterService.activeFilters.filterAward}")`
      );
    }
    if (this.filterService.activeFilters.filterLanguage) {
      filterQueries.push(
        `FILTER(?inLanguage = "${this.filterService.activeFilters.filterLanguage}")`
      );
    }

    const sparqlQuery = SPARQL_QUERY(filterQueries.join(' '));
    this.httpSparqlService.postQuery(sparqlQuery).then((response) => {
        this.booksService.updateData(response);
    });
  }

  updateAuthorData(responseData: any) {
    const formattedData = responseData.results.bindings.map(
        (binding: any) => {
          return {
            person: binding.person?.value,
            personLabel: binding.personLabel?.value,
            dateOfBirth: binding.dateOfBirth?.value,
            placeOfBirth: binding.placeOfBirth?.value,
            placeOfBirthLabel: binding.placeOfBirthLabel?.value,
            occupation: binding.occupation?.value,
            occupationLabel: binding.occupationLabel?.value,
            countryOfCitizenship: binding.countryOfCitizenship?.value,
            countryOfCitizenshipLabel: binding.countryOfCitizenshipLabel?.value,
            education: binding.education?.value,
            educationLabel: binding.educationLabel?.value,
            website: binding.website?.value,
            gender: binding.gender?.value,
            genderLabel: binding.genderLabel?.value,
            languageSpoken: binding.languageSpoken?.value,
            languageSpokenLabel: binding.languageSpokenLabel?.value,
            notableWork: binding.notableWork?.value,
            notableWorkLabel: binding.notableWorkLabel?.value,
            awardReceived: binding.awardReceived?.value,
            awardReceivedLabel: binding.awardReceivedLabel?.value,
            babelioAuthorID: binding.babelioAuthorID?.value,
            wikidataLink: binding.wikidataLink?.value,
          };
        }
      );
      console.log(formattedData);
      authorDataSubject.next(formattedData);
    }
  
}