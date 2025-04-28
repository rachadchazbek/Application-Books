import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EnhancedSearchComponent } from "../components/search/enhanced-search.component";
import { BookListComponent } from "../components/book-list/book-list.component";


@Component({
  selector: 'app-main-page',
  standalone: true,
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css'],
  imports: [EnhancedSearchComponent, BookListComponent, RouterLink]
})
export class MainPageComponent {
  // The component now uses the enhanced search component
}
