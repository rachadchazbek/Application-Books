import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { authorData$, booksAuthor$, books$ } from 'src/app/classes/subjects';
import { Book } from 'src/app/constants/Book';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';

// Extended interface for author query results
interface AuthorQueryResult {
  book?: string;
  name?: string;
  birthDate?: string;
  nationality?: string;
  award?: string;
  awardName?: string;
  bookTitle?: string;
  title?: string;
  author?: string;
}

// Define a type for author data from Wikidata
interface AuthorData {
  personLabel?: string;
  dateOfBirth?: string;
  babelioAuthorID?: string;
  countryOfCitizenshipLabel?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-author-component',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './author.component.html',
  styleUrls: ['./author.component.css']
})
export class AuthorComponent implements OnInit, OnDestroy {
  books: Book[] = [];
  filterAuthor = '';
  authorData: AuthorData | null = null;
  authorAwards: string[] = [];
  authorBooks: Book[] = [];
  authorDetails: {
    name: string;
    birthDate?: string;
    nationality?: string;
  } = { name: '' };
  private destroy$ = new Subject<void>();
  private authorDataSub: Subscription;
  private booksSubscription: Subscription;

  constructor(private route: ActivatedRoute, public socketService: SocketSparqlService) { }

  ngOnInit() {
    this.subscribeToRouteParams();
    this.subscribeToBooksAuthor();
    this.subscribeToAuthorData();
    this.subscribeToBooks();
  }

  private subscribeToRouteParams() {
    this.route.paramMap.subscribe(params => {
      this.filterAuthor = params.get('authorName') || '';
      // Use the enhanced author info method
      this.getEnhancedAuthorInfo();
    });   
  }

  private subscribeToBooksAuthor() {
    booksAuthor$
      .pipe(takeUntil(this.destroy$))
      .subscribe(books => this.books = books);
  }

  private subscribeToAuthorData() {
    this.authorDataSub = authorData$
      .subscribe(data => this.setAuthorData(data));
  }

  private subscribeToBooks() {
    this.booksSubscription = books$.subscribe((books: AuthorQueryResult[]) => {
      if (books && books.length > 0) {
        // Process author information from the books response
        this.processAuthorInformation(books);
      }
    });
  }

  private setAuthorData(data: AuthorData[]): void {
    if (data && data.length > 0) {
      this.authorData = data[0];  // Taking the first object from the array
    } else {
      this.authorData = null;
    }
  }

  private processAuthorInformation(books: AuthorQueryResult[]): void {
    if (books.length > 0) {
      const firstBook = books[0] as AuthorQueryResult;
      
      // Extract author details if available
      this.authorDetails = {
        name: this.filterAuthor
      };
      
      if ('birthDate' in firstBook) {
        this.authorDetails.birthDate = firstBook.birthDate;
      }
      
      if ('nationality' in firstBook) {
        this.authorDetails.nationality = firstBook.nationality;
      }
      
      // Extract author books - convert to Book objects if needed
      this.authorBooks = books
        .filter(item => item.title || item.bookTitle)
        .map(item => ({
          title: item.title || item.bookTitle || 'Unknown Title',
          authors: [item.author || this.filterAuthor],
          datePublished: '',
          isbn: '',
          subjectThema: '',
          awards: [],
          inLanguage: ''
        }));
      
      // Extract author awards if available
      if (books.some(book => 'awardName' in book && book.awardName)) {
        this.authorAwards = [...new Set(
          books
            .filter(book => 'awardName' in book && book.awardName)
            .map(book => book.awardName as string)
        )];
      }
    }
  }

  getEnhancedAuthorInfo() {
    // Use the new enhanced author info method
    this.socketService.getEnhancedAuthorInfo(this.filterAuthor);
  }

  generateBabelioLink(): string | null {
    if (this.authorData && this.authorData['personLabel'] && this.authorData['babelioAuthorID']) {
      const nameFormatted = (this.authorData['personLabel'] as string).split(' ').join('-');
      return `https://www.babelio.com/auteur/${encodeURIComponent(nameFormatted)}/${this.authorData['babelioAuthorID']}`;
    }
    return null;
  } 

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.authorDataSub) {
      this.authorDataSub.unsubscribe();
    }
    
    if (this.booksSubscription) {
      this.booksSubscription.unsubscribe();
    }
  }
}
