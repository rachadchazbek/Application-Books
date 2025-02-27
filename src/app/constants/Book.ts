import { Award } from "./Award";
import { Review } from "./Review";

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
