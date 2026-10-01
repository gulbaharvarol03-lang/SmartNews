import SearchNewsService from '../services/SearchNewsService.js';
import RecommendationService from '../services/RecommendationService.js';
import NewsController from '../controllers/NewsController.js';
import UserController from '../controllers/UserController.js';

export default class Router {
    constructor(user) {
        this.user = user;
        
        // Instantiate our polymorphic services
        this.searchService = new SearchNewsService();
        this.recommendService = new RecommendationService();
        
        // Instantiate controllers
        this.newsController = new NewsController(user);
        this.userController = new UserController(user);
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // If no hash, default to recommend
        if (!window.location.hash) {
            window.location.hash = '#recommend';
        } else {
            this.handleRoute();
        }
    }

    handleRoute() {
        const hash = window.location.hash;
        this.updateNav(hash.split('?')[0]);
        
        const lang = localStorage.getItem('smartnews_lang') || 'tr';

        if (hash.startsWith('#search')) {
            // Extract query from URL if exists
            const urlParams = new URLSearchParams(hash.split('?')[1]);
            const query = urlParams.get('q') || '';
            
            this.newsController.renderNewsView(
                this.searchService, 
                { isSearch: true, query: query, city: this.user.getCity(), lang: lang },
                'Arama Modu'
            );
        } else if (hash.startsWith('#recommend')) {
            this.newsController.renderNewsView(
                this.recommendService,
                { isSearch: false, user: this.user, lang: lang },
                'Akıllı Öneri Modu'
            );
        } else if (hash.startsWith('#favorites')) {
            this.userController.renderFavorites();
        } else {
            // unknown route, fallback
            window.location.hash = '#recommend';
        }
    }

    updateNav(activeHash) {
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        
        if (activeHash === '#search') {
            document.getElementById('navSearch').classList.add('active');
        } else if (activeHash === '#recommend') {
            document.getElementById('navRecommend').classList.add('active');
        } else if (activeHash === '#favorites') {
            document.getElementById('navFavorites').classList.add('active');
        }

        // UX İyileştirmesi: Şehir Seçici sadece Arama (Search) modunda görünsün
        const citySelect = document.getElementById('userCitySelect');
        if (citySelect) {
            if (activeHash === '#search') {
                citySelect.style.display = 'inline-block';
            } else {
                citySelect.style.display = 'none';
            }
        }
    }
}
