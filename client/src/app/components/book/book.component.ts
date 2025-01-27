import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';

@Component({
  selector: 'app-book-component',
  templateUrl: './book.component.html',
  standalone: true,
  imports: [NgIf, NgFor],
  styleUrls: ['./book.component.css']
})
export class BookComponent implements OnDestroy {

  // TODO : Add the following properties to the class:
  summaryBook: any;
  ratingBook: any;
  currentBookData: any;
  babelioLink: any;
  private descriptionBook: Subscription;
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly route: ActivatedRoute, public socketService: SocketSparqlService) {
    this.subscribeToBabelioUrl();
    this.subscribeToBookSummary();
    this.subscribeToBookRating();
    this.subscribeToCurrentBook();
  }

  isString(value: any): boolean {
    return typeof value === 'string';
}

  updateSummary() {
    if (this.summaryBook?.includes('>Voir plus')) {
      this.summaryBook = this.summaryBook.replace('>Voir plus', `<a class="view-more-link" href="${this.babelioLink}">Voir plus</a>`);
    } else {
      this.summaryBook = `${this.summaryBook} <a class="view-more-link" href="${this.babelioLink}">Voir plus</a>`;
    }
    return this.summaryBook;
  }

  private subscribeToBookSummary() {
    this.summaryBook = this.socketService.bookSummary$
      .subscribe(data => {
        this.summaryBook = data;
        this.updateSummary();
      });
  }


  private subscribeToBookRating() {
    this.ratingBook = this.socketService.rating$
      .subscribe(data => this.ratingBook = data);
  }

  private subscribeToBabelioUrl() {
    this.babelioLink = this.socketService.urlBabelio$
      .subscribe(data => this.babelioLink = data);
  }

  private subscribeToCurrentBook() {
    this.descriptionBook = this.socketService.currentBook$
        .subscribe(data => {
            this.currentBookData = data; 
        }); 
  }



  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
