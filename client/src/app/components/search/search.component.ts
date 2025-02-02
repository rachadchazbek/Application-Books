import { Component, OnInit, OnDestroy } from '@angular/core';
import {FormsModule, FormControl, ReactiveFormsModule} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { GENRES, TITLES, AWARDS, AUTHORS, LANGUAGES } from 'src/app/constants/constants';
import { SocketSparqlService } from 'src/app/services/socket-sparql.service';
import { NgIf, NgFor } from '@angular/common';
import { books$ } from 'src/app/classes/subjects';

@Component({
  selector: 'app-search-component',
  templateUrl: './search.component.html',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, NgIf, NgFor],
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit, OnDestroy {
[x: string]: any;
  private readonly destroy$ = new Subject<void>();

  // TODO regroup all the filters in a single object
  // From the forms
  books: any[] = [];
  selectedGenre = 'Aucun genre sélectionné';
  selectedLanguage = 'No Language Selected';
  filterAge = 'Aucun age sélectionné';
  filterAuthor = '';
  searchAward = '';
  searchText = '';
  searchTheme = '';
  loader = false;
  

  genres: string[] = GENRES;
  languages: string[] = LANGUAGES;
  ageRanges: number[] = Array.from({ length: 19 }, (_, i) => i);
  titles = TITLES;
  awards = AWARDS;
  authors = AUTHORS;

  myControl = new FormControl();
  myControlAwards = new FormControl();
  myControlTitles = new FormControl();
  
  filteredAuthors: string[];
  filteredAwards: string[];
  filteredTitles: string[];

  isBlurredTitle = false;
  isBlurredAward = false;
  isBlurredAuthor = false;

  selectedSource = '';
  selectedCategory = '';
  bookAppreciation = ''; // 'highlyAppreciated' or 'notHighlyAppreciated'

  // Define the categories for each source
  sourceCategories = {
    Babelio: ['1 étoile', '2 étoiles', '3 étoiles', '4 étoiles', '5 étoiles'],
    Constellation: ['Coup de Coeur', 'Tout'],
    BNF: ['Hélas !', 'Problème...', 'Pourquoi pas ?', 'Intéressant', 'Bravo !', 'Coup de coeur !', 'Réédition à signaler', 'Bibliothèque idéale'],
    Lurelu: ['Coup de coeur']
  };

  constructor(public socketService: SocketSparqlService, private readonly router: Router) {
    books$.pipe(takeUntil(this.destroy$)).subscribe(books => {
      this.books = books;
    });
  }

  searchByTheme(): void {
    if (this.searchTheme) {
      const filter = `FILTER(UCASE(?subjectThema) = "${this.searchTheme.toUpperCase()}")`;
      this.socketService.runBtlfQuery(filter, this.searchTheme);
    }
  }
  
  search(): void {
    this.loader = true;
    this.socketService.queryDB().finally(() => {
      this.loader = false;
    });
  }

  ngOnInit() {
    this.myControl.valueChanges.subscribe(value => {
      this.filteredAuthors = this.authors.filter(author =>
        author.toLowerCase().startsWith(value.toLowerCase()));
    });

    this.myControlAwards.valueChanges.subscribe(value => {
      this.filteredAwards = this.awards.filter(award =>
        award.toLowerCase().includes(value.toLowerCase()));
    });

    this.myControlTitles.valueChanges.subscribe(value => {
      this.filteredTitles = this.titles.filter(title =>
        title.toLowerCase().startsWith(value.toLowerCase()));
    });
  }

  onSelectSource(source: string) {
    this.selectedSource = source;
    this.selectedCategory = ''; // Reset category when source changes
    if (source == 'BTLF') {
      this.socketService.filterBooksByCategory(this.selectedSource, this.selectedCategory);
    }
  }

  onSelectCategory(category: string) {
    this.selectedCategory = category;
    this.socketService.filterBooksByCategory(this.selectedSource, this.selectedCategory);
  }

  onSelectBookAppreciation(appreciation: string) {
    this.bookAppreciation = appreciation;
    this.socketService.filterBooksByAppreciation(this.bookAppreciation);
  }

  navigateToAuthor(authorName: string): void {
    this.router.navigate(['/author', authorName]);
  }

  navigateToAward(awardName: string): void {
    this.router.navigate(['/award', awardName]);
  }

  navigateToBook(book: any): void {
    this.router.navigate(['/book', book.title]);
    this.socketService.bingSearchBook(book);
  }

  navigateToPublisher(publisher: string) {
    this.socketService.bingSearchPublisher(publisher);
  }

  selectGenre() {
    this.socketService.filterGenre(this.selectedGenre);
  }

  filterLanguage() {
    this.socketService.filterLanguage(this.selectedLanguage);
  }

  filterBooksByAuthor() {
    this.socketService.filterBooksByAuthor(this.filterAuthor);
  }

  filterBooksByAge() {
    this.socketService.filterBooksByAge(this.filterAge);
  }

  searchBookByAward() {
    this.socketService.filterAward(this.searchAward);
  }

  searchBookWithName() {
    this.socketService.filterName(this.searchText);
  }

  selectAward(award: string) {
    this.searchAward = award;
    this.searchBookByAward();
    this.myControlAwards.setValue(award);
    this.filteredAwards = [];
  }

  selectAuthor(author: string) {
    this.filterAuthor = author;
    this.filterBooksByAuthor();
    this.myControl.setValue(author);
    this.filteredAuthors = [];
  }

  selectTitle(title: string) {
    this.searchText = title;
    this.searchBookWithName();
    this.myControlTitles.setValue(title);
    this.filteredTitles = [];
  }

  handleCheckboxChange(event: Event, age: number) {
    if ((event.target as HTMLInputElement).checked) {
      this.socketService.ageFilter(age.toString());
    }
  }

  handleKeyDown(event: KeyboardEvent, data: string) {
    console.log('Key down event', event, data);
  }

  onBlurTitle() { setTimeout(() => { this.isBlurredTitle = true; }, 100); } 
  onBlurAward() { setTimeout(() => { this.isBlurredAward = true; }, 100); } 
  onBlurAuthor() { setTimeout(() => { this.isBlurredAuthor = true; }, 100); }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
