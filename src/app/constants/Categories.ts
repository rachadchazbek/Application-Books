export enum Babelio {
    OneStar = '1 étoile',
    TwoStars = '2 étoiles',
    ThreeStars = '3 étoiles',
    FourStars = '4 étoiles',
    FiveStars = '5 étoiles'
}

export enum Source {
    Babelio = 'Babelio',
    Constellation = 'Constellation',
    BNF = 'BNF',
    BTLF = 'BTLF',
    Lurelu = 'Lurelu',
    Kaleidoscope = 'Kaleidoscope',
    Unassigned = 'Unassigned'
}

export enum Constellation {
    Favorite = 'Coup de Coeur',
    All = 'Tout'
}

export enum BNF {
    Alas = 'Hélas !',
    Problem = 'Problème...',
    WhyNot = 'Pourquoi pas ?',
    Interesting = 'Intéressant',
    Bravo = 'Bravo !',
    Favorite = 'Coup de coeur !',
    Reissue = 'Réédition à signaler',
    IdealLibrary = 'Bibliothèque idéale'
}

export enum Lurelu {
    Favorite = 'Coup de coeur'
}

// Define the Categories for each source
export const Categories = {
    Babelio: ['1 étoile', '2 étoiles', '3 étoiles', '4 étoiles', '5 étoiles'],
    Constellation: ['Coup de Coeur', 'Tout'],
    BNF: ['Hélas !', 'Problème...', 'Pourquoi pas ?', 'Intéressant', 'Bravo !', 'Coup de coeur !', 'Réédition à signaler', 'Bibliothèque idéale'],
    Lurelu: ['Coup de coeur'],
    BTLF: [],
    Kaleidoscope: [],
    Unassigned: []
};

// Define the mapping between sources and their categories for the Source tab
export const SOURCE_Categories = {
    Babelio: ['1 étoile', '2 étoiles', '3 étoiles', '4 étoiles', '5 étoiles'],
    Constellation: ['Coup de Coeur', 'Tout'],
    BNF: ['Hélas !', 'Problème...', 'Pourquoi pas ?', 'Intéressant', 'Bravo !', 'Coup de coeur !', 'Réédition à signaler', 'Bibliothèque idéale'],
    Lurelu: ['Coup de coeur'],
    BTLF: [],
    Kaleidoscope: [],
    Unassigned: []
};
