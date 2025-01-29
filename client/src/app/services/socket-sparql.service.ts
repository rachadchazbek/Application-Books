import { Injectable } from '@angular/core';
import { Award } from '../constants/Award';
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
import { HttpClient } from '@angular/common/http';
import { load } from 'cheerio';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ThemaCodes } from '../constants/thema-codes';
import { HttpSparqlService } from './http-sparql.service';
import { Book } from '../constants/Book';
import { urlBabelioSubject, bookSummarySubject, ratingSubject, currentBookSubject, authorDataSubject, descriptionAwardSubject, booksSourceAuthor, booksSource } from '../classes/subjects';
import { BooksService } from './books.service';

@Injectable({
  providedIn: 'root',
})
export class SocketSparqlService {
  constructor(
    private http: HttpClient,
    private readonly httpSparqlService: HttpSparqlService,
    private readonly booksService: BooksService
  ) {}

  // TODO exoport
  activeFilters = {
    filterName: null,
    filterGenre: null,
    filterAuthor: null,
    filterAge: [] as string[],
    filterAward: null,
    filterLanguage: null,
    filterSource: '',
    filterCategory: '',
    filterAppreciation: '',
  };

  bookMap: Record<string, Book> = {};

  // TODO define ?
  private themeActive = false;
  private themeCode = '';
  private readonly jsonUrl = 'assets/thema_code_dict.json';
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
    this.findCodeByDescription(description).subscribe({
      next: (codeValue) => {
        if (codeValue) {
          this.themeCode = codeValue;
          // Optionally perform further actions if codeValue is successfully retrieved
          console.log(`Found code value: ${codeValue}`);
        } else {
          console.log('No code value found for the given description.');
        }
      },
      error: (err) => {
        console.error('Error finding code by description:', err);
      },
    });
  }

  findCodeByDescription(description: string): Observable<string | undefined> {
    return this.http.get<ThemaCodes>(this.jsonUrl).pipe(
      map((codes: ThemaCodes) => {
        const normalizedDescription = description
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        console.log(`Normalized input description: ${normalizedDescription}`); // Debug input normalization
        for (const key in codes) {
          if (codes[key].CodeDescription === description) {
            // Instead of directly returning, we can use tap to perform side effects
            return codes[key].CodeValue; // Return the code value if found
          }
        }
        return undefined; // Return undefined if not found
      }),
      tap((codeValue) => {
        if (codeValue) {
          // Construct the SPARQL query and send it only if the codeValue is found
          const filter = `FILTER(UCASE(?subjectThema) = "${codeValue.toUpperCase()}")`;
          const sparqlQuery = SPARQL_BTLF_FILTER(filter);
          this.httpSparqlService.postQuery(sparqlQuery);
        }
      })
    );
  }

  onInput(argument: string, value: string) {
    if (!value) {
      switch (argument) {
        case 'title':
          this.activeFilters.filterName = null;
          break;
        case 'author':
          this.activeFilters.filterAuthor = null;
          break;
        case 'award':
          this.activeFilters.filterAward = null;
          break;
        default:
          break;
      }
    }
  }

  getIsbnsFromBookMap() {
    const isbns = [];
    for (const key in this.bookMap) {
      if (this.bookMap[key] && this.bookMap[key].isbn) {
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
    console.log(this.activeFilters);
    console.log(2222);
    console.log(this.activeFilters.filterSource);
    switch (this.activeFilters.filterSource) {
      case 'Babelio': { 
        const starRating = parseInt(
          this.activeFilters.filterCategory.split(' ')[0],
          10
        );
        baseQuery = SPARQL_BABELIO(
          `FILTER(?averageReview >= ${starRating} && ?isbn IN (${isbns}))`
        );
        break; }
      case 'Constellation':
        console.log(2222);
        if (this.activeFilters.filterCategory === 'Coup de coeur') {
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
          `FILTER(?avis = "${this.activeFilters.filterCategory}" && (?isbn IN (${isbns}) || ?ean IN (${isbns})))`
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
      this.activeFilters.filterSource = source ? source : null;
      this.activeFilters.filterCategory = category ? category : null;
      this.storedIsbns = null;
      this.bookMap = {};
    } else {
      this.bookMap = {};
      this.activeFilters.filterSource = source ? source : null;
      this.activeFilters.filterCategory = category ? category : null;
      this.updateBook();
    }
  }

  ageFilter(age: any) {
    if (this.themeActive) {
      const isbns =
        this.storedIsbns ||
        this.getIsbnsFromBookMap()
          .map((isbn) => `"${isbn}"`)
          .join(', ');
      if (!this.storedIsbns) {
        this.storedIsbns = isbns;
      }
      this.bookMap = {};
      const ageString = age.toString();
      this.activeFilters.filterAge.push(ageString);
      for (const age of this.activeFilters.filterAge) {
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
      this.activeFilters.filterAge.push(ageString);
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
      this.activeFilters.filterAppreciation = appreciation
        ? appreciation
        : null;
      switch (this.activeFilters.filterAppreciation) {
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
      this.activeFilters.filterAppreciation = appreciation
        ? appreciation
        : null;
      this.updateBook();
    }
  }

  filterName(filterName: any) {
    this.bookMap = {};
    this.activeFilters.filterName = filterName ? filterName : null;
    this.updateFilters();
  }

  filterGenre(filterGenre: any) {
    this.bookMap = {};
    this.activeFilters.filterGenre =
      filterGenre !== 'No Genre Selected' ? filterGenre : null;
    this.updateFilters();
  }

  filterBooksByAuthor(filterAuthor: any) {
    this.bookMap = {};
    this.activeFilters.filterAuthor = filterAuthor ? filterAuthor : null;
    this.updateFilters();
  }

  filterBooksByAward(filterAward: any) {
    this.bookMap = {};
    this.inAwardsComponent = true;
    const sparqlQuery = SPARQL_QUERY_DESCRIPTION(
      `FILTER(CONTAINS(?finalAwardName, "${filterAward}"))`
    );
    this.httpSparqlService.postQuery(sparqlQuery).then((response) => {
        this.booksService.updateData(response);
    });
  }

  filterAuthorBooks(filterAuthor: any) {
    this.bookMap = {};
    this.inAuthorsComponent = true;
    const sparqlQuery = SPARQL_QUERY(`FILTER(?author = "${filterAuthor}")`);
    this.httpSparqlService.postQuery(sparqlQuery).then((response) => {
        this.booksService.updateData(response);
    });
  }

  filterBooksByAge(filterAge: any) {
    this.bookMap = {};
    this.activeFilters.filterAge =
      filterAge !== 'No Age Selected' ? filterAge : null;
    this.updateFilters();
  }

  filterAward(filterAward: any) {
    this.bookMap = {};
    this.activeFilters.filterAward = filterAward ? filterAward : null;
    this.updateFilters();
  }

  filterLanguage(filterLanguage: any) {
    this.bookMap = {};
    this.activeFilters.filterLanguage =
      filterLanguage !== 'No Language Selected' ? filterLanguage : null;
    this.updateFilters();
  }

  getAuthorInfo(filterAuthor: any) {
    const sparqlQuery = SPARQL_WIKIDATA(filterAuthor);
    this.httpSparqlService.postQuery(sparqlQuery).then((response) => {
        this.booksService.updateData(response);
    });
  }

  async bingSearchBook(book: any) {
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
    } catch (error: any) {
      console.error(`An error occurred: ${error.message}`);
    }
  }

  updateBook() {
    console.log(this.activeFilters);
    const queries = [];
    let baseQuery;
    switch (this.activeFilters.filterSource) {
      case 'Babelio': { 
        const starRating = parseInt(
          this.activeFilters.filterCategory.split(' ')[0]
        );
        baseQuery = SPARQL_BABELIO(`FILTER(?averageReview >= ${starRating})`);
        this.httpSparqlService.postQuery(baseQuery).then((response) => {
        this.booksService.updateData(response);
    });;
        break; }
      case 'Constellation':
        if (this.activeFilters.filterCategory === 'Coup de coeur !') {
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
        console.log(this.activeFilters.filterCategory);
        baseQuery = SPARQL_QUERY_BNF(
          `FILTER(?avis = "${this.activeFilters.filterCategory}")`
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
    switch (this.activeFilters.filterAppreciation) {
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

    if (this.activeFilters.filterAge) {
      for (const age of this.activeFilters.filterAge) {
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

    if (this.activeFilters.filterName) {
      filterQueries.push(`FILTER(?title = "${this.activeFilters.filterName}")`);
    }
    // add else conditions to handle removal of filters
    if (this.activeFilters.filterGenre) {
      filterQueries.push(
        `FILTER(?finalGenreName = "${this.activeFilters.filterGenre}")`
      );
    }
    if (this.activeFilters.filterAuthor) {
      filterQueries.push(
        `FILTER(?author = "${this.activeFilters.filterAuthor}")`
      );
    }
    if (this.activeFilters.filterAge) {
      filterQueries.push(
        `FILTER(?ageRange >= "${this.activeFilters.filterAge}")`
      );
    }
    if (this.activeFilters.filterAward) {
      filterQueries.push(
        `FILTER(?finalAwardName = "${this.activeFilters.filterAward}")`
      );
    }
    if (this.activeFilters.filterLanguage) {
      filterQueries.push(
        `FILTER(?inLanguage = "${this.activeFilters.filterLanguage}")`
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