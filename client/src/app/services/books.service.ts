import { Injectable } from '@angular/core';
import { booksSource, booksSourceAuthor, booksSourceAward, descriptionAwardSubject } from '../classes/subjects';
import { Award } from '../constants/Award';
import { Book } from '../constants/Book';


@Injectable({
    providedIn: 'root',
})
export class BooksService {
    private bookMap: Record<string, Book> = {};
    private readonly themeCode = 'defaultTheme';
    private inAuthorsComponent = false;
    private inAwardsComponent = false;
    private books: Book[] = [];
    private booksAuthor: Book[] = [];
    private booksAward: Book[] = [];

    // TODO: Add proper typing for responseData
    updateData(responseData: any) {
        responseData.results.bindings.forEach((binding: any, index: number) => {
            // Notify subscribers about the award description
            descriptionAwardSubject.next(binding.finalAwardDescription?.value);
            const title = binding.title?.value || `Empty Title ${index}`;

            // Check if the book already exists in the map
            if (this.bookMap[title]) {
                // Update authors if not already present
                if (!this.bookMap[title].authors.includes(binding.author?.value)) {
                    this.bookMap[title].authors.push(binding.author?.value);
                }
                // Update illustrators if not already present
                if (
                    binding.illustrator?.value &&
                    !this.bookMap[title].illustrator?.includes(binding.illustrator?.value)
                ) {
                    this.bookMap[title].illustrator?.push(binding.illustrator?.value);
                }
                // Update country of origin
                if (binding.countryOfOrigin?.value) {
                    this.bookMap[title].countryOfOrigin = binding.countryOfOrigin?.value;
                }

                // Process reviews
                const reviewAuthors = binding.reviewAuthor?.value.split('@ ');
                const reviewContents = binding.reviewContent?.value.split('@ ');
                const reviewDates = binding.reviewDatePublished?.value.split('@ ');
                const reviewRatings = binding.reviewRating?.value.split('@ ');
                const thumbsUps = binding.thumbsUp?.value.split('@ ');

                if (reviewAuthors && reviewAuthors.length > 1) {
                    for (let i = 0; i < reviewAuthors.length; i++) {
                        this.bookMap[title].reviews?.push({
                            reviewContent: reviewContents[i],
                            reviewAuthor: reviewAuthors[i],
                            reviewDatePublished: reviewDates[i],
                            reviewRating: reviewRatings[i],
                            thumbsUp: thumbsUps[i],
                            reviewURL: binding.reviewURL?.value,
                            avis: binding.avis?.value,
                            source: binding.source?.value,
                        });
                    }
                } else {
                    this.bookMap[title].reviews?.push({
                        reviewContent: binding.reviewContent?.value,
                        reviewAuthor: binding.reviewAuthor?.value,
                        reviewDatePublished: binding.reviewDatePublished?.value,
                        reviewRating: binding.reviewRating?.value,
                        thumbsUp: binding.thumbsUp?.value,
                        reviewURL: binding.reviewURL?.value,
                        avis: binding.avis?.value,
                        source: binding.source?.value,
                    });
                }

                // Process awards
                if (binding.award) {
                    const existingAward = this.bookMap[title].awards.find(
                        (award: Award) =>
                            award.name === binding.finalAwardName?.value &&
                            award.genre === binding.finalGenreName?.value &&
                            award.year === binding.awardYear?.value
                    );
                    if (!existingAward) {
                        this.bookMap[title].awards.push({
                            year: binding.awardYear?.value,
                            name: binding.finalAwardName?.value,
                            genre: binding.finalGenreName?.value,
                            ageRange: binding.ageRange?.value
                                ? [binding.ageRange?.value]
                                : [],
                        });
                    } else if (
                        binding.ageRange?.value &&
                        !existingAward.ageRange.includes(binding.ageRange?.value)
                    ) {
                        existingAward.ageRange.push(binding.ageRange?.value);
                    }
                }
            } else {
                // Create a new book entry
                this.bookMap[title] = {
                    title: binding.title?.value || '',
                    authors: [binding.author?.value],
                    publisher: binding.publisherName?.value,
                    datePublished: binding.datePublished?.value,
                    isbn: binding.isbn?.value,
                    subjectThema: binding.subjectThema?.value || this.themeCode,
                    inLanguage: binding.inLanguage?.value,
                    illustrator: binding.illustrator?.value
                        ? [binding.illustrator?.value]
                        : [],
                    countryOfOrigin: binding.countryOfOrigin?.value || '',
                    awards: binding.award
                        ? [
                                {
                                    year: binding.awardYear?.value,
                                    name: binding.finalAwardName?.value,
                                    genre: binding.finalGenreName?.value,
                                    ageRange: binding.ageRange?.value
                                        ? [binding.ageRange?.value]
                                        : [],
                                },
                            ]
                        : [],
                    reviews: [],
                };

                // Process reviews for the new book entry
                const reviewAuthors = binding.reviewAuthor?.value.split('@ ');
                const reviewContents = binding.reviewContent?.value.split('@ ');
                const reviewDates = binding.reviewDatePublished?.value.split('@ ');
                const reviewRatings = binding.reviewRating?.value.split('@ ');
                const thumbsUps = binding.thumbsUp?.value.split('@ ');

                if (reviewAuthors && reviewAuthors.length > 1) {
                    for (let i = 0; i < reviewAuthors.length; i++) {
                        this.bookMap[title].reviews?.push({
                            reviewContent: reviewContents[i],
                            reviewAuthor: reviewAuthors[i],
                            reviewDatePublished: reviewDates[i],
                            reviewRating: reviewRatings[i],
                            thumbsUp: thumbsUps[i],
                            reviewURL: binding.reviewURL?.value,
                            avis: binding.avis?.value,
                            source: binding.source?.value,
                        });
                    }
                } else {
                    this.bookMap[title].reviews?.push({
                        reviewContent: binding.reviewContent?.value,
                        reviewAuthor: binding.reviewAuthor?.value,
                        reviewDatePublished: binding.reviewDatePublished?.value,
                        reviewRating: binding.reviewRating?.value,
                        thumbsUp: binding.thumbsUp?.value,
                        reviewURL: binding.reviewURL?.value,
                        avis: binding.avis?.value,
                        source: binding.source?.value,
                    });
                }
            }
        });

        // Update the appropriate book list and notify subscribers
        if (this.inAuthorsComponent === true) {
            this.booksAuthor = Object.values(this.bookMap);
            booksSourceAuthor.next(this.booksAuthor);
            this.inAuthorsComponent = false;
        } else if (this.inAwardsComponent === true) {
            this.booksAward = Object.values(this.bookMap);
            booksSourceAward.next(this.booksAward);
            this.inAwardsComponent = false;
        } else {
            this.books = Object.values(this.bookMap);
            booksSource.next(this.books);
        }
    }
}