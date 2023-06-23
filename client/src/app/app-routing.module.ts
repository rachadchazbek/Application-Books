import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthorComponent } from './components/components/author/author.component';
import { SearchComponent } from './components/components/search/search.component';
import { AwardComponent } from './components/components/award/award.component';

// Import your components here

const routes: Routes = [
  { path: '', component: SearchComponent }, // Default route
  { path: 'author/:authorName', component: AuthorComponent },
  { path: 'award/:awardName', component: AwardComponent }
  // More routes can be added here
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
