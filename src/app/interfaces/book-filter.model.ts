import { Appreciation } from '../constants/Appreciation';
/**
 * Enhanced filter model aligned with schema.org
 * This interface represents all possible filters that can be applied
 * to search for books in the graph database.
 */
export interface BookFilter {
  mots?: string;
  // Advanced keyword search with operators
  advancedKeywords?: {
    keyword: string;
    operator?: 'AND' | 'OR' | 'NOT';
  }[];

  // Basic book properties (schema:Book)
  title?: string;
  isbn?: string;
  inLanguage?: string;
  collectionName?: string;
  
  // Creator properties
  author?: string;
  nationality?: string;
  illustrator?: string;
  
  // Classification properties
  genre?: string;
  subjectThema?: string;
  
  // Educational properties
  ageRange?: string[];
  educationLevel?: string[];
  
  // Source and rating properties
  source?: string[];
  category?: string;
  appreciation?: Appreciation;
  
  // Additional metadata
  publisher?: string;
  datePublished?: string;
  award?: string;
  numberOfAwards?: boolean;
}
