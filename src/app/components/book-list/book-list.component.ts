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

  // All books from the data source
  allBooks: Book[] = [];
  // Books to display on the current page
  books: Book[] = [];

  // Pagination properties
  currentPage = 1;
  pageSize = 12;
  totalPages = 1;
  
  // View options
  viewMode: 'grid' | 'list' = 'grid';
  sortOption: 'title' | 'author' | 'date' | 'none' = 'none';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(public socketService: SocketSparqlService, private readonly router: Router) {
    books$.pipe(takeUntil(this.destroy$)).subscribe(books => {
      this.allBooks = books;
      this.calculateTotalPages();
      this.applySort();
      this.updateDisplayedBooks();
    });
  }
  
  /**
   * Calculate the total number of pages based on the total books and page size
   */
  calculateTotalPages(): void {
    this.totalPages = Math.ceil((this.allBooks?.length || 0) / this.pageSize);
    // Ensure current page is valid
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
  }

  /**
   * Update the books array to show only the books for the current page
   */
  updateDisplayedBooks(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.allBooks?.length || 0);
    this.books = this.allBooks?.slice(startIndex, endIndex) || [];
  }

  /**
   * Go to a specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayedBooks();
    }
  }
  
  /**
   * Go to the previous page
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayedBooks();
    }
  }
  
  /**
   * Go to the next page
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayedBooks();
    }
  }
  
  /**
   * Change the number of items displayed per page
   */
  changePageSize(size: number): void {
    this.pageSize = size;
    this.calculateTotalPages();
    this.updateDisplayedBooks();
  }
  
  /**
   * Handle page size change event from select element
   */
  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target?.value) {
      this.changePageSize(+target.value);
    }
  }

  /**
   * Toggle between grid and list view
   */
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }
  
  /**
   * Set the sort option and direction
   */
  setSortOption(option: 'title' | 'author' | 'date' | 'none'): void {
    if (this.sortOption === option) {
      // Toggle direction if clicking the same option
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortOption = option;
      this.sortDirection = 'asc';
    }
    this.applySort();
    this.updateDisplayedBooks();
  }
  
  /**
   * Apply the current sort option to the books array
   */
  applySort(): void {
    if (this.sortOption === 'none') {
      return; // No sorting needed
    }
    
    this.allBooks.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortOption) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'author': {
          // Compare first authorList if available
          const authorA = a.authorList && a.authorList.length > 0 ? a.authorList[0] : '';
          const authorB = b.authorList && b.authorList.length > 0 ? b.authorList[0] : '';
          comparison = authorA.localeCompare(authorB);
          break;
        }
        case 'date':
          comparison = a.datePublished.localeCompare(b.datePublished);
          break;
      }
      
      // Reverse for descending order
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }
  navigateToBook(book: Book): void {
    this.router.navigate(['/book', book.title]);
    this.socketService.bingSearchBook(book.isbn);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  navigateToPublisher(publisher: string) {
    return;
    // this.socketService.bingSearchPublisher(publisher);
  }

  navigateToAuthor(authorName: string): void {
    this.router.navigate(['/author', authorName]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleKeyDown(event: KeyboardEvent, data: any) {
    if (event.key === 'Enter' || event.key === ' ') {
      if (typeof data === 'string') {
        // Handle string data (author, award, publisher)
        const element = event.currentTarget as HTMLElement;
        if (element?.classList.contains('award-name')) {
          this.navigateToAward(data);
        } else if (element?.classList.contains('publisher-info')) {
          this.navigateToPublisher(data);
        } else {
          this.navigateToAuthor(data);
        }
      } else if (data && typeof data === 'object') {
        // Handle book object
        this.navigateToBook(data);
      }
    }
  }

  navigateToAward(awardName: string): void {
    this.router.navigate(['/award', awardName]);
  }
  
  /**
   * Get an array of page numbers for pagination display
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      // Show all pages if there are few
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show a subset of pages with current page in the middle when possible
      let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = startPage + maxPagesToShow - 1;
      
      if (endPage > this.totalPages) {
        endPage = this.totalPages;
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
