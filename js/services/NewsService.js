// OOP Principle: Abstraction (Soyutlama)
// Abstract class that forces child classes to implement a getNews method

export default class NewsService {
    constructor() {
        if (new.target === NewsService) {
            throw new TypeError("Cannot construct Abstract instances directly");
        }
    }

    /**
     * Abstract method. Subclasses MUST OVERRIDE THIS.
     * @param {Object} context
     */
    async getNews(context) {
        throw new Error("Method 'getNews()' must be implemented by subclasses.");
    }
}
