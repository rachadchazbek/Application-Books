import { BehaviorSubject } from 'rxjs';
import { Book } from '../constants/Book';


export const booksSourceAward = new BehaviorSubject<Book[]>([]);
export const booksAward$ = booksSourceAward.asObservable();

export const authorDataSubject = new BehaviorSubject<any[]>([]);
export const authorData$ = authorDataSubject.asObservable();

export const descriptionAwardSubject = new BehaviorSubject<string>("");
export const descriptionAward$ = descriptionAwardSubject.asObservable();

export const bookSummarySubject = new BehaviorSubject<any>([]);
export const bookSummary$ = bookSummarySubject.asObservable();

export const ratingSubject = new BehaviorSubject<any>([]);
export const rating$ = ratingSubject.asObservable();

export const currentBookSubject = new BehaviorSubject<any[]>([]);
export const currentBook$ = currentBookSubject.asObservable();

export const urlBabelioSubject = new BehaviorSubject<any>([]);
export const urlBabelio$ = urlBabelioSubject.asObservable();

export const booksSourceAuthor = new BehaviorSubject<any>(null);
export const booksAuthor$ = booksSourceAuthor.asObservable();

export const booksSource = new BehaviorSubject<any>(null);
export const books$ = booksSource.asObservable();