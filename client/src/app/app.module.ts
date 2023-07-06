import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { SearchComponent } from './components/components/search/search.component';
import { AuthorComponent } from './components/components/author/author.component';
import { AwardComponent } from './components/components/award/award.component';
import { BookComponent } from './components/components/book/book.component';

@NgModule({
  declarations: [
    AppComponent,
    AuthorComponent,
    SearchComponent,
    AwardComponent,
    BookComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
