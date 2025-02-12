import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { books$ } from 'src/app/classes/subjects';
import { Book } from 'src/app/constants/Book';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';

@Component({
  selector: 'app-book-list',
  imports: [NgIf, NgFor],
  templateUrl: './book-list.component.html',
  styleUrl: './book-list.component.css'
})
export class BookListComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  

  books: Book[] = [];

  constructor(public socketService: SocketSparqlService, private readonly router: Router) {
    books$.pipe(takeUntil(this.destroy$)).subscribe(books => {
      this.books = books;
    });
  }
  navigateToBook(book: Book): void {
    this.router.navigate(['/book', book.title]);
    this.socketService.bingSearchBook(book);
  }

  navigateToPublisher(publisher: string) {
    this.socketService.bingSearchPublisher(publisher);
  }


  navigateToAuthor(authorName: string): void {
    this.router.navigate(['/author', authorName]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleKeyDown(event: KeyboardEvent, data: any) {
    console.log('Key down event', event, data);
  }


  navigateToAward(awardName: string): void {
    this.router.navigate(['/award', awardName]);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
