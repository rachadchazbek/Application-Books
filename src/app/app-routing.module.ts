import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthorComponent } from './components/author/author.component';
import { AwardComponent } from './components/award/award.component';
import { BookComponent } from './components/book/book.component';
import { HttpClientModule } from '@angular/common/http';
import { MainPageComponent } from './main-page/main-page.component';

// Import your components here

const routes: Routes = [
  { path: '', component: MainPageComponent, pathMatch:"full" }, // Default route
  { path: 'author/:authorName', component: AuthorComponent },
  { path: 'award/:awardName', component: AwardComponent },
  { path: 'book/:bookName', component: BookComponent },
  { path: '**', redirectTo: '' }
  // More routes can be added here
];

@NgModule({
  imports: [RouterModule.forRoot(routes), HttpClientModule],
  exports: [RouterModule]
})
export class AppRoutingModule { }
