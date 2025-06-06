export interface Book {
  title: string;
  authorList: string[];
  datePublished: string;
  isbn: string;
  inLanguage: string;
  publisher?: string;
  illustrator?: string[];
  collectionName?: string;
  
  // Additional fields as requested
  infoSource?: string;
  quatriemeCouverture?: string;
  premiereCouverture?: string;
  description?: string;
  typicalAgeRange?: string[];
  
  // Keep these for backward compatibility
  subjectThema?: string;
  countryOfOrigin?: string;
  isAvailable?: boolean;
  
  // Allow for extensions with additional properties
  [key: string]: string | string[] | undefined | Record<string, unknown> | SparqlBinding[] | boolean;
}

// Define the binding type for SPARQL query results
export type SparqlBinding = Record<string, {
    type: string;
    value: string;
    datatype?: string;
  }>;
