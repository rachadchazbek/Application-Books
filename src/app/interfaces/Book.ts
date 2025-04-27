import { Award } from "./Award";
import { Review } from "./Review";

export interface Book {
  title: string;
  authorList: string[];
  datePublished: string;
  isbn: string;
  inLanguage: string;
  publisher?: string;
  illustrator?: string[];
  
  // Additional fields as requested
  infoSource?: string;
  quatriemeCouverture?: string;
  premiereCouverture?: string;
  description?: string;
  typicalAgeRange?: string[];
  keywords?: string[];
  url?: string;
  genre?: string[];
  
  // Keep these for backward compatibility
  subjectThema?: string;
  awards?: Award[];
  countryOfOrigin?: string;
  reviews?: Review[];
  
  // Allow for extensions with any additional properties
  [key: string]: any;
}

// Define the binding type for SPARQL query results
export type SparqlBinding = Record<string, {
    type: string;
    value: string;
    datatype?: string;
  }>;
