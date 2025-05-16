export interface SimilarBook {
    isbn: string;
    similarTo: string;
    title: string;           // Renamed from similarBookName to match template
    authorList?: string[];
    publisher?: string;
    datePublished?: string;
    premiereCouverture?: string;
    subjectThema?: string;
    inLanguage?: string;
}
