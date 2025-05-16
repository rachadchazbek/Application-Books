import { Injectable } from '@angular/core';
import { booksSource, booksSourceAuthor, booksSourceAward, similarBooksSubject } from '../classes/subjects';
import { Book } from '../interfaces/Book';
import { Binding, SparqlResponse } from '../interfaces/Response';
import { SimilarBook } from '../interfaces/SimilarBook';
import { HttpSparqlService } from './http-sparql.service';
import { BOOK_QUERY } from '../queries/book';

@Injectable({
  providedIn: 'root',
})
export class BooksService {
  constructor(private readonly httpSparqlService: HttpSparqlService) {}

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
    responseData.results.bindings.forEach((binding: Binding) => {


      const datePublished = binding.datePublished?.value;
      if (!datePublished || !/^\d{4}$/.test(datePublished) || datePublished === '') {
        return; // Skip if date is not a valid year
      }

      const isbn = binding.isbn?.value;

      if (this.bookMap[isbn]) {
        // Update an existing book.
        this.updateExistingBook(this.bookMap[isbn], binding);
      } else {
        // Create a new book entry.
        this.bookMap[isbn] = this.createBook(binding);
      }
    });
    this.emitBooks();
  }

  /**
   * Updates an existing book with new data from a binding.
   */
  private updateExistingBook(book: Book, binding: Binding) {
    // Update authors.
    if (binding.author?.value && !book.authorList.includes(binding.author.value)) {
      book.authorList.push(binding.author.value);
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
  }

  /**
   * Creates a new book from a binding.
   */
  private createBook(binding: Binding): Book {
    const title = binding.name?.value ?? ``;
    const newBook: Book = {
      title,
      authorList: binding.authorList?.value ? [binding.authorList.value] : [],
      publisher: binding.publisherName?.value,
      datePublished: binding.datePublished?.value ?? '',
      isbn: binding.isbn?.value ?? '',
      subjectThema: binding.subjectThema?.value ?? this.themeCode,
      inLanguage: binding.inLanguage?.value ?? '',
      illustrator: binding.illustrator?.value ? [binding.illustrator.value] : [],
      countryOfOrigin: binding.countryOfOrigin?.value ?? '',
      awards: [],
      reviews: [],
      premiereCouverture: binding.premiereCouverture?.value ?? '',
    };
    return newBook;
  }

  /**
   * Parses Similar books from bindings and emits them through the similarBooks subject
   */
  async uploadSimilarBooks(response: Binding[]) {
    console.log('Processing similar books bindings:', response);
    
    // Create array to hold similar books
    const similarBooks: SimilarBook[] = [];
    // Process each binding
    for (const binding of response) {
      const similarBookName = binding.similarBookName?.value || '';
      const similarTo = binding.similarTo?.value?.split('/').pop() || '';

      // Get the similar book details with a query
      const similarBookQuery = BOOK_QUERY(similarTo);

      try {
      const response = await this.httpSparqlService.postBookQuery(similarBookQuery);
      console.log('Similar book details:', response);
      const similarBookBinding = response.results.bindings[0];
      if (similarBookBinding) {
        const similarBook: SimilarBook = {
        isbn: similarTo,
        title: similarBookName,
        similarTo: similarTo,
        authorList: similarBookBinding.authorList?.value ? [similarBookBinding.authorList.value] : undefined,
        publisher: similarBookBinding.publisherName?.value,
        datePublished: similarBookBinding.datePublished?.value,
        premiereCouverture: similarBookBinding.premiereCouverture?.value,
        subjectThema: similarBookBinding.subjectThema?.value,
        inLanguage: similarBookBinding.inLanguage?.value
        };

        // Add the book to the array
        similarBooks.push(similarBook);
      }
      } catch (error) {
      console.error(`Error fetching details for similar book with ISBN ${similarTo}:`, error);
      }
    }

    // Emit the similar books through the subject
    console.log(`Emitting ${similarBooks.length} similar books`);
    similarBooksSubject.next(similarBooks);
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
