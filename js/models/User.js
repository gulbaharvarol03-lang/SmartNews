// Model: User.js
// Demonstrates OOP Principle: Encapsulation (Kapsülleme)

export default class User {
    // Private fields can only be accessed from within the class
    #id;
    #name;
    #city;
    #favorites;
    #readingStats;

    constructor(id, name, city) {
        this.#id = id;
        this.#name = name;
        this.#city = city;
        this.#favorites = [];
        this.#readingStats = {}; // e.g. { "teknoloji": 5, "spor": 2 }
    }

    // Getters and Setters properly encapsulate user data
    getId() {
        return this.#id;
    }

    getName() {
        return this.#name;
    }

    getCity() {
        return this.#city;
    }

    setCity(newCity) {
        this.#city = newCity;
    }

    getFavorites() {
        return [...this.#favorites]; // Return copy to protect inner array
    }

    setFavorites(favArray) {
        this.#favorites = favArray;
    }

    addFavorite(newsObj) {
        // Enforce uniqueness by url
        const exists = this.#favorites.find(f => f.url === newsObj.url);
        if (!exists) {
            this.#favorites.push(newsObj);
        }
    }

    removeFavorite(newsUrl) {
        this.#favorites = this.#favorites.filter(f => f.url !== newsUrl);
    }

    getReadingStats() {
        return { ...this.#readingStats }; // Return copy to protect inner object
    }

    setReadingStats(stats) {
        this.#readingStats = stats;
    }

    // Increments category counter when a user reads news
    recordRead(category) {
        if (!this.#readingStats[category]) {
            this.#readingStats[category] = 0;
        }
        this.#readingStats[category] += 1;
    }
}
