import { Appreciation } from "../constants/Appreciation";

export interface Filter {
    filterAge: string[];
    filterAppreciation: Appreciation;
    filterAuthor: string;
    filterAward: string;
    filterCategory: string;
    filterGenre: string;
    filterLanguage: string;
    filterName: string;
    filterSource: string
}