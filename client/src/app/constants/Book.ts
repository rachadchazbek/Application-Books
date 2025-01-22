import { Award } from './interfaces/Award';

export interface Book {
  title: string;
  authors: string[];
  datePublished: string;
  isbn: string;
  subjectThema: string;
  awards: Award[];
  inLanguage: string;
  publisher?: string;
  illustrator?: string[];
  countryOfOrigin?: string;
  reviews?: Review[];
}

export interface Review {
  reviewContent?: string;
  reviewAuthor?: string;
  reviewDatePublished?: Date;
  reviewRating?: number;
  thumbsUp?: number;
  reviewURL?: string;
  avis?: string;
  source?: string
}

