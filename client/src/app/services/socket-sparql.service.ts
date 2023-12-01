import { Injectable } from '@angular/core';
import { SocketClientService } from './socket-client.service';
import { Book, Review } from '../Book';
import { Award } from '../Award';
import { SPARQL_BABELIO, SPARQL_QUERY, SPARQL_QUERY_BNF, SPARQL_QUERY_CONSTELLATIONS, SPARQL_QUERY_DESCRIPTION, SPARQL_QUERY_LURELU, SPARQL_WIKIDATA } from '../sparql';
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
        filterLanguage: null,
        filterSource: '',
        filterCategory : '',
        filterAppreciation: ''
      }      

    bookMap: {
        [key: string]: Book
    } = {}; 

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

    filterBooksByCategory(source: any, category: any) {
        this.bookMap = {}
        this.activeFilters.filterSource = source ? source : null;
        this.activeFilters.filterCategory = category ? category : null;
        this.updateBook();
      }
    
      filterBooksByAppreciation(appreciation: any) {
        this.bookMap = {}
        this.activeFilters.filterAppreciation = appreciation ? appreciation : null;
        this.updateBook();
      }

    filterName(filterName: any) {
        this.bookMap = {}
        this.activeFilters.filterName = filterName ? filterName : null;
        this.updateFilters();
    }
    
    filterGenre(filterGenre: any) {
        this.bookMap = {}
        this.activeFilters.filterGenre = filterGenre !== 'No Genre Selected' ? filterGenre : null;
        this.updateFilters();
    }
    
    filterBooksByAuthor(filterAuthor: any) {
        this.bookMap = {}
        this.activeFilters.filterAuthor = filterAuthor ? filterAuthor : null;
        this.updateFilters();
    }

    filterBooksByAward(filterAward: any) {
        this.bookMap = {}
        this.inAwardsComponent = true;
        const sparqlQuery = SPARQL_QUERY_DESCRIPTION(`FILTER(CONTAINS(?finalAwardName, "${filterAward}"))`);
        this.socketService.send('getSparqlData', sparqlQuery);
      }      

    filterAuthorBooks(filterAuthor: any) {
        this.bookMap = {}
        this.inAuthorsComponent = true;
        const sparqlQuery =  SPARQL_QUERY(`FILTER(?author = "${filterAuthor}")`);
        this.socketService.send('getSparqlData', sparqlQuery);
    }
    
    filterBooksByAge(filterAge: any) {
        this.bookMap = {}
        this.activeFilters.filterAge = filterAge !== 'No Age Selected' ? filterAge : null;
        this.updateFilters();
    }
    
    filterAward(filterAward: any) {
        this.bookMap = {}
        this.activeFilters.filterAward = filterAward ? filterAward : null;
        this.updateFilters();
    } 
    
    filterLanguage(filterLanguage: any) {
        this.bookMap = {}
        this.activeFilters.filterLanguage = filterLanguage !== 'No Language Selected' ? filterLanguage : null;
        this.updateFilters();
    }   

    ageFilter(age: number) {
        let ageString = age.toString(); 
        let query_bnf = SPARQL_QUERY_BNF(`
            FILTER(CONTAINS(?ageRange, "${ageString}"))
        `);
    
        let query_constellations = SPARQL_QUERY_CONSTELLATIONS(`
            FILTER(CONTAINS(?ageRange, "${ageString}"))
        `);    

        // Send each query separately through the socket service
        this.socketService.send('getSparqlData', query_bnf);
        this.socketService.send('getSparqlData', query_constellations);
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
      
      updateBook() {
        let queries = [];
        let baseQuery;
    switch (this.activeFilters.filterSource) {
        case 'Babelio':
            const starRating = parseInt(this.activeFilters.filterCategory.split(' ')[0]);
            baseQuery = SPARQL_BABELIO(`FILTER(?averageReview >= ${starRating})`);
            break;
        case 'Constellation':
            baseQuery = SPARQL_QUERY_CONSTELLATIONS((`FILTER(?isCoupDeCoeur = true)`));
            break;
        case 'BNF':
            console.log(this.activeFilters.filterCategory)
            baseQuery = SPARQL_QUERY_BNF(`FILTER(?avis = "${this.activeFilters.filterCategory}")`);
            break;
        case 'Lurelu':
            baseQuery = SPARQL_QUERY_LURELU; // No additional filter needed for Lurelu
            break;
        default:
            // Handle default case or error
            break;
      }
      let query;
      switch (this.activeFilters.filterAppreciation) {
        case 'highlyAppreciated':
            let query_lurelu = SPARQL_QUERY_LURELU;
            let query_babelio = SPARQL_BABELIO(`FILTER(?averageReview >= 4)`);
            let query_bnf = SPARQL_QUERY_BNF(`FILTER(?avis = "Coup de coeur !")`);
            let query_constellations = SPARQL_QUERY_CONSTELLATIONS(`FILTER(?isCoupDeCoeur = true)`);

            // Send each query separately through the socket service
            this.socketService.send('getSparqlData', query_lurelu);
            this.socketService.send('getSparqlData', query_babelio);
            this.socketService.send('getSparqlData', query_bnf);
            this.socketService.send('getSparqlData', query_constellations);
            break;
        case 'notHighlyAppreciated':
            baseQuery = SPARQL_BABELIO(`FILTER(?averageReview <= 3)`);
            break;
      }
      
      this.socketService.send('getSparqlData', baseQuery);
    }

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

                responseData.results.bindings.forEach((binding: any, index: number) => {
                    this.descriptionAwardSubject.next(binding.finalAwardDescription?.value);
                    let title = binding.title?.value || `Empty Title ${index}`;
                    if (this.bookMap[title]) {
                        if (!this.bookMap[title].authors.includes(binding.author?.value)) {
                            this.bookMap[title].authors.push(binding.author?.value);
                        }
                        if (binding.illustrator?.value && !this.bookMap[title].illustrator?.includes(binding.illustrator?.value)) {
                            this.bookMap[title].illustrator?.push(binding.illustrator?.value);
                        }
                        if (binding.countryOfOrigin?.value) {
                            this.bookMap[title].countryOfOrigin = binding.countryOfOrigin?.value;
                        }
                        const reviewAuthors = binding.reviewAuthor?.value.split("@ ");
const reviewContents = binding.reviewContent?.value.split("@ ");
const reviewDates = binding.reviewDatePublished?.value.split("@ ");
const reviewRatings = binding.reviewRating?.value.split("@ ");
const thumbsUps = binding.thumbsUp?.value.split("@ ");

// Check if there's more than one review
if (reviewAuthors && reviewAuthors.length > 1) {
    for (let i = 0; i < reviewAuthors.length; i++) {
        // Add each review to the bookMap
        this.bookMap[title]?.reviews?.push({
            reviewContent: reviewContents[i],
            reviewAuthor: reviewAuthors[i],
            reviewDatePublished: reviewDates[i],
            reviewRating: reviewRatings[i],
            thumbsUp: thumbsUps[i],
            // Add other properties if available
            reviewURL: binding.reviewURL?.value,
            avis: binding.avis?.value,
            source: binding.source?.value
        });
    }
} else {
    // Case for a single review
    this.bookMap[title]?.reviews?.push({
        reviewContent: binding.reviewContent?.value,
        reviewAuthor: binding.reviewAuthor?.value,
        reviewDatePublished: binding.reviewDatePublished?.value,
        reviewRating: binding.reviewRating?.value,
        thumbsUp: binding.thumbsUp?.value,
        // Add other properties if available
        reviewURL: binding.reviewURL?.value,
        avis: binding.avis?.value,
        source: binding.source?.value
    });
                        }
                        if (binding.award) {
                            const existingAward = this.bookMap[title].awards.find((award: Award) => award.name === binding.finalAwardName?.value && award.genre === binding.finalGenreName?.value && award.year === binding.awardYear?.value);
                            if (!existingAward) {
                                this.bookMap[title].awards.push({
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
                        this.bookMap[title] = {
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
                            }] : [],
                            reviews: []
                        }
                        const reviewAuthors = binding.reviewAuthor?.value.split("@ ");
const reviewContents = binding.reviewContent?.value.split("@ ");
const reviewDates = binding.reviewDatePublished?.value.split("@ ");
const reviewRatings = binding.reviewRating?.value.split("@ ");
const thumbsUps = binding.thumbsUp?.value.split("@ ");

// Check if there's more than one review
if (reviewAuthors && reviewAuthors.length > 1) {
    for (let i = 0; i < reviewAuthors.length; i++) {
        // Add each review to the bookMap
        this.bookMap[title]?.reviews?.push({
            reviewContent: reviewContents[i],
            reviewAuthor: reviewAuthors[i],
            reviewDatePublished: reviewDates[i],
            reviewRating: reviewRatings[i],
            thumbsUp: thumbsUps[i],
            // Add other properties if available
            reviewURL: binding.reviewURL?.value,
            avis: binding.avis?.value,
            source: binding.source?.value
        });
    }
} else {
    // Case for a single review
    this.bookMap[title]?.reviews?.push({
        reviewContent: binding.reviewContent?.value,
        reviewAuthor: binding.reviewAuthor?.value,
        reviewDatePublished: binding.reviewDatePublished?.value,
        reviewRating: binding.reviewRating?.value,
        thumbsUp: binding.thumbsUp?.value,
        // Add other properties if available
        reviewURL: binding.reviewURL?.value,
        avis: binding.avis?.value,
        source: binding.source?.value
    });
                        }
                    }
                });
            
            if (this.inAuthorsComponent === true) {
                this.booksAuthor = Object.values(this.bookMap);
                this.booksSourceAuthor.next(this.booksAuthor);
                this.inAuthorsComponent = false;
            } 
            else if(this.inAwardsComponent === true) {
                this.booksAward = Object.values(this.bookMap);
                this.booksSourceAward.next(this.booksAward);
                this.inAwardsComponent = false;
            }
            else {
                this.books = Object.values(this.bookMap);
                this.booksSource.next(this.books);
            }
        });
    }
}