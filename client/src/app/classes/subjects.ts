import { BehaviorSubject } from 'rxjs';


const booksSourceAward = new BehaviorSubject<any>(null);
export const booksAward$ = booksSourceAward.asObservable();

const authorDataSubject = new BehaviorSubject<any[]>([]);
export const authorData$ = authorDataSubject.asObservable();

const descriptionAwardSubject = new BehaviorSubject<any[]>([]);
export const descriptionAward$ = descriptionAwardSubject.asObservable();

const bookSummarySubject = new BehaviorSubject<any>([]);
export const bookSummary$ = bookSummarySubject.asObservable();

const ratingSubject = new BehaviorSubject<any>([]);
export const rating$ = ratingSubject.asObservable();

const currentBookSubject = new BehaviorSubject<any[]>([]);
export const currentBook$ = currentBookSubject.asObservable();

const urlBabelioSubject = new BehaviorSubject<any>([]);
export const urlBabelio$ = urlBabelioSubject.asObservable();