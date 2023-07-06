import { Injectable } from '@angular/core';
import { SocketClientService } from './socket-client.service';
import { Book } from '../Book';
import { Award } from '../Award';
import { SPARQL_QUERY, SPARQL_QUERY_DESCRIPTION, SPARQL_WIKIDATA } from '../sparql';
import { BehaviorSubject } from 'rxjs';
import axios from 'axios';
import cheerio, { load } from 'cheerio';

@Injectable({
  providedIn: 'root'
})
export class SocketSparqlService {
    constructor(public socketService: SocketClientService) {
        this.connect();
    }

    activeFilters = {
        filterName: null,
        filterGenre: null,
        filterAuthor: null,
        filterAge: null,
        filterAward: null,
        filterLanguage: null
      }      

    books: any;
    private booksSource = new BehaviorSubject<any>(null);
    books$ = this.booksSource.asObservable();

    inAuthorsComponent: boolean = false;
    booksAuthor: any;
    private booksSourceAuthor = new BehaviorSubject<any>(null);
    booksAuthor$ = this.booksSourceAuthor.asObservable();

    inAwardsComponent: boolean = false;
    booksAward: any;
    private booksSourceAward = new BehaviorSubject<any>(null);
    booksAward$ = this.booksSourceAward.asObservable();

    private authorDataSubject = new BehaviorSubject<any[]>([]);
    authorData$ = this.authorDataSubject.asObservable();

    private descriptionAwardSubject = new BehaviorSubject<any[]>([]);
    descriptionAward$ = this.descriptionAwardSubject.asObservable();

    private bookSummarySubject = new BehaviorSubject<any>([]);
    bookSummary$ = this.bookSummarySubject.asObservable();

    private ratingSubject = new BehaviorSubject<any>([]);
    rating$ = this.ratingSubject.asObservable();

    private currentBookSubject = new BehaviorSubject<any[]>([]);
    currentBook$ = this.currentBookSubject.asObservable();

    private urlBabelioSubject = new BehaviorSubject<any>([]);
    urlBabelio$ = this.urlBabelioSubject.asObservable();

    get socketId() {
        return this.socketService.socket.id ? this.socketService.socket.id : "";
    }

    filterName(filterName: any) {
        this.activeFilters.filterName = filterName ? filterName : null;
        this.updateFilters();
    }
    
    filterGenre(filterGenre: any) {
        this.activeFilters.filterGenre = filterGenre !== 'No Genre Selected' ? filterGenre : null;
        this.updateFilters();
    }
    
    filterBooksByAuthor(filterAuthor: any) {
        this.activeFilters.filterAuthor = filterAuthor ? filterAuthor : null;
        this.updateFilters();
    }

    filterBooksByAward(filterAward: any) {
        this.inAwardsComponent = true;
        const sparqlQuery = SPARQL_QUERY_DESCRIPTION(`FILTER(CONTAINS(?finalAwardName, "${filterAward}"))`);
        this.socketService.send('getSparqlData', sparqlQuery);
      }      

    filterAuthorBooks(filterAuthor: any) {
        this.inAuthorsComponent = true;
        const sparqlQuery =  SPARQL_QUERY(`FILTER(?author = "${filterAuthor}")`);
        this.socketService.send('getSparqlData', sparqlQuery);
    }
    
    filterBooksByAge(filterAge: any) {
        this.activeFilters.filterAge = filterAge !== 'No Age Selected' ? filterAge : null;
        this.updateFilters();
    }
    
    filterAward(filterAward: any) {
        this.activeFilters.filterAward = filterAward ? filterAward : null;
        this.updateFilters();
    } 
    
    filterLanguage(filterLanguage: any) {
        this.activeFilters.filterLanguage = filterLanguage !== 'No Language Selected' ? filterLanguage : null;
        this.updateFilters();
    }   
    
    getAuthorInfo(filterAuthor: any) {
        const sparqlQuery =  SPARQL_WIKIDATA(filterAuthor);
        this.socketService.send('getSparqlAuthorData', sparqlQuery);
     }

     async bingSearchBook(book: any) {
        this.currentBookSubject.next(book);
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
          this.urlBabelioSubject.next(firstLink);
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
    
      async scrapeWebsite (url: string): Promise<void> {
        const encodedUrl = encodeURIComponent(url);
        const proxyUrl = `http://localhost:3000/proxy?url=${encodedUrl}`;
      
        try {
          const response = await axios.get(proxyUrl, { responseType: 'text' });
      
          const rawHtml = response.data;
          console.log(rawHtml);
      
          const $ = load(rawHtml, { decodeEntities: false });
      
          const bookSummary = $('.livre_resume').text().trim();
          this.bookSummarySubject.next(bookSummary);
          console.log(bookSummary);
      
          const rating = $('.grosse_note').text().trim();
          this.ratingSubject.next(rating);
          console.log(rating);
        } catch (error: any) {
          console.error(`An error occurred: ${error.message}`);
        }
      };
      
    

    updateFilters() {
        let filterQueries = [];

        if (this.activeFilters.filterName) {
            filterQueries.push(`FILTER(?title = "${this.activeFilters.filterName}")`);
        }
        // add else conditions to handle removal of filters 
        if (this.activeFilters.filterGenre) {
            filterQueries.push(`FILTER(?finalGenreName = "${this.activeFilters.filterGenre}")`);
        }
        if (this.activeFilters.filterAuthor) {
            filterQueries.push(`FILTER(?author = "${this.activeFilters.filterAuthor}")`);
        }
        if (this.activeFilters.filterAge) {
            filterQueries.push(`FILTER(?ageRange >= "${this.activeFilters.filterAge}")`);
        }
        if (this.activeFilters.filterAward) {
            filterQueries.push(`FILTER(?finalAwardName = "${this.activeFilters.filterAward}")`);
        }
        if (this.activeFilters.filterLanguage) {
            filterQueries.push(`FILTER(?inLanguage = "${this.activeFilters.filterLanguage}")`);
        }

        const sparqlQuery = SPARQL_QUERY(filterQueries.join(" "));
        this.socketService.send('getSparqlData', sparqlQuery);
    }
    
    connect() {
        if (!this.socketService.isSocketAlive()) {
            this.socketService.connect();
            this.configureBaseSocketFeatures();
        }
    }

    configureBaseSocketFeatures() {
            this.socketService.on('sparqlResultsAuthor', (responseData: any) => {
                const formattedData = responseData.results.bindings.map((binding: any) => {
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
                });
                console.log(formattedData);
                this.authorDataSubject.next(formattedData);
            });

            this.socketService.on('sparqlResults', (responseData: any) => {
                let bookMap: {
                    [key: string]: Book
                } = {};
                responseData.results.bindings.forEach((binding: any, index: number) => {
                    this.descriptionAwardSubject.next(binding.finalAwardDescription?.value);
                    let title = binding.title?.value || `Empty Title ${index}`;
                    if (bookMap[title]) {
                        if (!bookMap[title].authors.includes(binding.author?.value)) {
                            bookMap[title].authors.push(binding.author?.value);
                        }
                        if (binding.illustrator?.value && !bookMap[title].illustrator?.includes(binding.illustrator?.value)) {
                            bookMap[title].illustrator?.push(binding.illustrator?.value);
                        }
                        if (binding.countryOfOrigin?.value) {
                            bookMap[title].countryOfOrigin = binding.countryOfOrigin?.value;
                        }
                        if (binding.award) {
                            const existingAward = bookMap[title].awards.find((award: Award) => award.name === binding.finalAwardName?.value && award.genre === binding.finalGenreName?.value && award.year === binding.awardYear?.value);
                            if (!existingAward) {
                                bookMap[title].awards.push({
                                    year: binding.awardYear?.value,
                                    name: binding.finalAwardName?.value,
                                    genre: binding.finalGenreName?.value,
                                    ageRange: binding.ageRange?.value ? [binding.ageRange?.value] : []
                                });
                            } else {
                                if (binding.ageRange?.value && !existingAward.ageRange.includes(binding.ageRange?.value)) {
                                    existingAward.ageRange.push(binding.ageRange?.value);
                                }
                            }
                        }
                    } else {
                        bookMap[title] = {
                            title: binding.title?.value || "",
                            authors: [binding.author?.value],
                            publisher: binding.publisherName?.value,
                            inLanguage: binding.inLanguage?.value,
                            illustrator: binding.illustrator?.value ? [binding.illustrator?.value] : [],
                            countryOfOrigin: binding.countryOfOrigin?.value || "",
                            awards: binding.award ? [{
                                year: binding.awardYear?.value,
                                name: binding.finalAwardName?.value,
                                genre: binding.finalGenreName?.value,
                                ageRange: binding.ageRange?.value ? [binding.ageRange?.value] : []
                            }] : []
                        }
                    }
                });
            
            if (this.inAuthorsComponent === true) {
                this.booksAuthor = Object.values(bookMap);
                this.booksSourceAuthor.next(this.booksAuthor);
                this.inAuthorsComponent = false;
            } 
            else if(this.inAwardsComponent === true) {
                this.booksAward = Object.values(bookMap);
                this.booksSourceAward.next(this.booksAward);
                this.inAwardsComponent = false;
            }
            else {
                this.books = Object.values(bookMap);
                this.booksSource.next(this.books);
            }
        });
    }
}
