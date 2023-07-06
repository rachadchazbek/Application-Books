import { Award } from './Award';

export interface Book {
  title: string;
  authors: string[];
  awards: Award[];
  inLanguage: string;
  publisher?: string;
  illustrator?: string[];
  countryOfOrigin?: string;
}
