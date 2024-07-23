import { Award } from './Award';

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

export type Review = {
  reviewContent?: string;
  reviewAuthor?: string;
  reviewDatePublished?: Date;
  reviewRating?: Number;
  thumbsUp?: Number;
  reviewURL?: string;
  avis?: string;
  source?: string
};

