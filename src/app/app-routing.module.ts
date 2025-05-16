import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BookComponent } from './components/book/book.component';
import { HttpClientModule } from '@angular/common/http';
import { MainPageComponent } from './main-page/main-page.component';
import { SavedBooksComponent } from './components/saved-books/saved-books.component';

// Import your components here

const routes: Routes = [
  { path: '', component: MainPageComponent, pathMatch:"full" }, // Default route
  { path: 'book/:isbn', component: BookComponent },
  { path: 'saved-books', component: SavedBooksComponent }, // Route for saved books
  { path: '**', redirectTo: '' }
  // More routes can be added here
];

@NgModule({
  imports: [RouterModule.forRoot(routes), HttpClientModule],
  exports: [RouterModule]
})
export class AppRoutingModule { }
