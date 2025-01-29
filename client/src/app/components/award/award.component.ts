import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { booksAward$, descriptionAward$ } from 'src/app/classes/subjects';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';

@Component({
  selector: 'app-award-component',
  templateUrl: './award.component.html',
  standalone: true,
  imports: [NgIf, NgFor],
  styleUrls: ['./award.component.css']
})
export class AwardComponent implements OnDestroy {
  descriptionAward: any;  
  books: any;
  filterAward: any;
  private descriptionSub: Subscription;
  private destroy$ = new Subject<void>();

  constructor(private readonly route: ActivatedRoute, public socketService: SocketSparqlService) {
    this.init();
  }

  private init() {
    this.subscribeToRouteParams();
    this.subscribeToBooksAward();
    this.subscribeToDescriptionAward();
  }

  private subscribeToRouteParams() {
    this.route.paramMap.subscribe(params => {
      this.filterAward = params.get('awardName');
      this.filterBooksByAward();
    });   
  }

  private subscribeToBooksAward() {
    booksAward$
      .pipe(takeUntil(this.destroy$))
      .subscribe(books => this.books = books);
  }

  private subscribeToDescriptionAward() {
    this.descriptionSub = descriptionAward$
      .subscribe(data => this.descriptionAward = data);
  }

  filterBooksByAward() {
    this.socketService.filterBooksByAward(this.filterAward);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
