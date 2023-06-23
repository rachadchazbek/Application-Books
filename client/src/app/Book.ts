import { Award } from './Award';

export interface Book {
  title: string;
  authors: string[];
  publisher: string;
  inLanguage: string;
  awards: Award[];
}
