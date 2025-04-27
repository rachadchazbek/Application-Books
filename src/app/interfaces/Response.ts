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
    award?: { value: string };
    awardYear?: { value: string };
    finalAwardName?: { value: string };
    finalGenreName?: { value: string };
    ageRange?: { value: string };
    reviewAuthor?: { value: string };
    reviewContent?: { value: string };
    reviewDatePublished?: { value: string };
    reviewRating?: { value: string };
    thumbsUp?: { value: string };
    reviewURL?: { value: string };
    avis?: { value: string };
    source?: { value: string };
    finalAwardDescription?: { value: string };
    premiereCouverture?: { value: string };
    infoSource?: { value: string };
  }
  
    
  export interface BookBinding {
    results: {
      bindings: Binding[];
    };
  }
