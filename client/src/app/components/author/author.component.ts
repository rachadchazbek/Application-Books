import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';

@Component({
  selector: 'app-author-component',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './author.component.html',
  styleUrls: ['./author.component.css']
})
export class AuthorComponent implements OnDestroy {
  books: any;
  filterAuthor: any;
  authorData: any;  
  private destroy$ = new Subject<void>();
  private authorDataSub: Subscription;

  constructor(private route: ActivatedRoute, public socketService: SocketSparqlService) {
    this.init();
  }

  private init() {
    this.subscribeToRouteParams();
    this.subscribeToBooksAuthor();
    this.subscribeToAuthorData();
  }

  private subscribeToRouteParams() {
    this.route.paramMap.subscribe(params => {
      this.filterAuthor = params.get('authorName');
      this.filterBooksByAuthor();
      this.getAuthorInfo();
    });   
  }

  private subscribeToBooksAuthor() {
    this.socketService.booksAuthor$
      .pipe(takeUntil(this.destroy$))
      .subscribe(books => this.books = books);
  }

  private subscribeToAuthorData() {
    this.authorDataSub = this.socketService.authorData$
      .subscribe(data => this.setAuthorData(data));
  }

  private setAuthorData(data: any) {
    if (data && data.length > 0) {
      this.authorData = data[0];  // Taking the first object from the array
    } else {
      this.authorData = null;
    }
  }

  filterBooksByAuthor() {
    this.socketService.filterAuthorBooks(this.filterAuthor);
  }

  getAuthorInfo() {
    this.socketService.getAuthorInfo(this.filterAuthor);
  }

  generateBabelioLink(): string | null {
    if (this.authorData?.personLabel && this.authorData?.babelioAuthorID) {
      const nameFormatted = this.authorData.personLabel.split(' ').join('-');
      return `https://www.babelio.com/auteur/${encodeURIComponent(nameFormatted)}/${this.authorData.babelioAuthorID}`;
    }
    return null;
  } 

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.authorDataSub.unsubscribe();
  }
}
