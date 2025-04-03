import { Injectable } from '@angular/core';
import { booksSource, booksSourceAuthor, booksSourceAward, descriptionAwardSubject } from '../classes/subjects';
import { Award } from '../constants/Award';
import { Book } from '../constants/Book';
import { Binding, SparqlResponse } from '../constants/Response';
import { Review } from '../constants/Review';

@Injectable({
  providedIn: 'root',
})
export class BooksService {
  private bookMap: Record<string, Book> = {};
  private readonly themeCode = 'defaultTheme';
  private inAuthorsComponent = false;
  private inAwardsComponent = false;
  private books: Book[] = [];
  private booksAuthor: Book[] = [];
  private booksAward: Book[] = [];

  /**
   * Called after receiving new data. Processes each binding and then emits the updated list.
   */
  updateData(responseData: SparqlResponse ) {
    // Clear the book map before processing new results
    this.bookMap = {};
    
    console.log(`Processing ${responseData.results.bindings.length} results`);
    
    responseData.results.bindings.forEach((binding: Binding, index: number) => {
      // Notify subscribers about the award description if available.
      if (binding.finalAwardDescription?.value) {
        descriptionAwardSubject.next(binding.finalAwardDescription.value);
      }

      const isbn = binding.isbn?.value;

      if (this.bookMap[isbn]) {
        // Update an existing book.
        this.updateExistingBook(this.bookMap[isbn], binding);
      } else {
        // Create a new book entry.
        this.bookMap[isbn] = this.createBook(binding, index);
      }
    });
    this.emitBooks();
  }

  /**
   * Updates an existing book with new data from a binding.
   */
  private updateExistingBook(book: Book, binding: Binding) {
    // Update authors.
    if (binding.author?.value && !book.authors.includes(binding.author.value)) {
      book.authors.push(binding.author.value);
    }

    // Update illustrators.
    if (binding.illustrator?.value) {
      if (!book.illustrator) {
        book.illustrator = [binding.illustrator.value];
      } else if (!book.illustrator.includes(binding.illustrator.value)) {
        book.illustrator.push(binding.illustrator.value);
      }
    }

    // Update country of origin.
    if (binding.countryOfOrigin?.value) {
      book.countryOfOrigin = binding.countryOfOrigin.value;
    }

    // Append reviews.
    book.reviews = (book.reviews || []).concat(this.parseReviews(binding));

    // Process award information.
    if (binding.award) {
      this.processAward(book, binding);
    }
  }

  /**
   * Creates a new book from a binding.
   */
  private createBook(binding: Binding, index: number): Book {
    const title = binding.name?.value ?? `Empty Title ${index}`;
    const newBook: Book = {
      title,
      authors: binding.author?.value ? [binding.author.value] : [],
      publisher: binding.publisherName?.value,
      datePublished: binding.datePublished?.value ?? '',
      isbn: binding.isbn?.value ?? '',
      subjectThema: binding.subjectThema?.value ?? this.themeCode,
      inLanguage: binding.inLanguage?.value ?? '',
      illustrator: binding.illustrator?.value ? [binding.illustrator.value] : [],
      countryOfOrigin: binding.countryOfOrigin?.value ?? '',
      awards: [],
      reviews: [],
    };

    // Process reviews.
    newBook.reviews = this.parseReviews(binding);

    // Process awards if they exist.
    if (binding.award) {
      this.processAward(newBook, binding);
    }

    return newBook;
  }

  /**
   * Parses reviews from a binding. If multiple reviews are provided (using a delimiter),
   * it returns an array of review objects.
   */
  private parseReviews(binding: Binding): Review[] {
    const reviews: Review[] = [];

    if (binding.reviewAuthor?.value && binding.reviewContent?.value) {
      const authors = binding.reviewAuthor.value.split('@ ');
      const contents = binding.reviewContent.value.split('@ ');
      const dates = binding.reviewDatePublished?.value?.split('@ ') || [];
      const ratings = binding.reviewRating?.value?.split('@ ') || [];
      const thumbs = binding.thumbsUp?.value?.split('@ ') || [];

      if (authors.length > 1) {
        for (let i = 0; i < authors.length; i++) {
          reviews.push({
            reviewContent: contents[i],
            reviewAuthor: authors[i],
            reviewDatePublished: dates[i],
            reviewRating: ratings[i],
            thumbsUp: thumbs[i],
            reviewURL: binding.reviewURL?.value,
            avis: binding.avis?.value,
            source: binding.source?.value,
          });
        }
      } else {
        reviews.push({
          reviewContent: binding.reviewContent.value,
          reviewAuthor: binding.reviewAuthor.value,
          reviewDatePublished: binding.reviewDatePublished?.value,
          reviewRating: binding.reviewRating?.value,
          thumbsUp: binding.thumbsUp?.value,
          reviewURL: binding.reviewURL?.value,
          avis: binding.avis?.value,
          source: binding.source?.value,
        });
      }
    }
    return reviews;
  }

  /**
   * Processes award information for a book. If an award already exists, it updates the age range.
   */
  private processAward(book: Book, binding: Binding) {
    const awardName = binding.finalAwardName?.value;
    const awardGenre = binding.finalGenreName?.value;
    const awardYear = binding.awardYear?.value;

    if (!awardName || !awardGenre || !awardYear) {
      return;
    }

    const existingAward = book.awards?.find(
      (award: Award) =>
        award.name === awardName &&
        award.genre === awardGenre &&
        award.year === awardYear
    );

    if (!existingAward) {
      book.awards?.push({
        year: awardYear,
        name: awardName,
        genre: awardGenre,
        ageRange: binding.ageRange?.value ? [binding.ageRange.value] : [],
      });
    } else if (binding.ageRange?.value && !existingAward.ageRange.includes(binding.ageRange.value)) {
      existingAward.ageRange.push(binding.ageRange.value);
    }
  }

  /**
   * Emits the updated list of books to the appropriate subject.
   */
  private emitBooks() {
    const booksArray = Object.values(this.bookMap);

    if (this.inAuthorsComponent) {
      this.booksAuthor = booksArray;
      booksSourceAuthor.next(this.booksAuthor);
      this.inAuthorsComponent = false;
    } else if (this.inAwardsComponent) {
      this.booksAward = booksArray;
      booksSourceAward.next(this.booksAward);
      this.inAwardsComponent = false;
    } else {
      this.books = booksArray;
      booksSource.next(this.books);
    }
  }
}
