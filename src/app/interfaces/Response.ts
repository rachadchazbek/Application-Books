export interface SparqlResponse {
    results: {
      bindings: Binding[];
    };
  }
  
  export interface Binding {
    name: { value: string };
    author: { value: string };
    authorList?: { value: string };
    authorName: { value: string };
    illustrator: { value: string };
    publisherName: { value: string };
    description?: { value: string };
    datePublished?: { value: string };
    isbn: { value: string };
    subjectThema?: { value: string };
    inLanguage?: { value: string };
    countryOfOrigin?: { value: string };
    premiereCouverture?: { value: string };
    infoSource?: { value: string };
    similarTo?: { value: string };
    collectionName?: { value: string };
    similarBookName?: { value: string };
    isAvailable?: { value: string };
  }
  
    
  export interface BookBinding {
    results: {
      bindings: Binding[];
    };
  }
