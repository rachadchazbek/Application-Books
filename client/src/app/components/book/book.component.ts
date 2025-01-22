import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';

@Component({
  selector: 'book-component',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.css']
})
export class BookComponent {

  summaryBook: any;
  ratingBook: any;
  currentBookData: any;
  babelioLink: any;
  private descriptionBook: Subscription;
  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, public socketService: SocketSparqlService) {
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
