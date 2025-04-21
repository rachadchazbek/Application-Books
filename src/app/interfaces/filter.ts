import { Appreciation } from "../constants/Appreciation";
import { Categories } from "../constants/Categories";

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