import NewsService from './NewsService.js';
import { CONFIG } from '../config.js';

export default class RecommendationService extends NewsService {
    async getNews(context) {
        const { user, lang } = context;
        const readingStats = user.getReadingStats();
        
        const apiLang = lang || 'tr';
        const apiCountry = apiLang === 'tr' ? 'tr' : 'us';

        let topCategory = null;
        let maxReads = 0;

        for (const [category, count] of Object.entries(readingStats)) {
            if (count > maxReads && category !== 'genel' && category !== 'sistem uyarı' && category !== 'bölgesel') {
                maxReads = count;
                topCategory = category;
            }
        }

        const catMap = {
            'teknoloji': 'technology', 'spor': 'sports', 'ekonomi': 'business',
            'sağlık': 'health', 'bilim': 'science', 'eğlence': 'entertainment',
            'siyaset': 'politics', 'sanat': 'entertainment', 'eğitim': 'general',
            'ulusal': 'general', 'bölgesel': 'top'
        };

        let engCategory = 'general';
        if (topCategory && catMap[topCategory.toLowerCase()]) engCategory = catMap[topCategory.toLowerCase()];

        let allArticles = [];
        const fetchPromises = [];

        // 1. GNews API
        if (CONFIG.GNEWS_API_KEY && !CONFIG.GNEWS_API_KEY.includes('BURAYA')) {
            const gUrl = `https://gnews.io/api/v4/top-headlines?country=${apiCountry}&lang=${apiLang}&category=${engCategory}&apikey=${CONFIG.GNEWS_API_KEY}`;
            fetchPromises.push(
                fetch(gUrl).then(res => res.json()).then(data => {
                    return (data.articles || []).map(a => ({
                        url: a.url, title: a.title, content: a.description, category: topCategory || 'Ulusal', urlToImage: a.image
                    }));
                }).catch(() => [])
            );
        }

        // 2. NewsData.io (Kategori Arama)
        if (CONFIG.NEWSDATA_API_KEY && !CONFIG.NEWSDATA_API_KEY.includes('BURAYA')) {
            const ndCat = engCategory === 'general' ? 'top' : engCategory;
            const nUrl = `https://newsdata.io/api/1/news?apikey=${CONFIG.NEWSDATA_API_KEY}&category=${ndCat}&language=${apiLang}&country=${apiCountry}`;
            fetchPromises.push(
                fetch(nUrl).then(res => res.json()).then(data => {
                    return (data.results || []).map(a => ({
                        url: a.link, title: a.title, content: a.description, category: topCategory || 'Öneri', urlToImage: a.image_url
                    }));
                }).catch(() => [])
            );
        }

        try {
            if (fetchPromises.length > 0) {
                const results = await Promise.all(fetchPromises);
                results.forEach(apiResultArr => { allArticles = allArticles.concat(apiResultArr); });
            }

            if (allArticles.length === 0) throw new Error("API Limit");
            return allArticles;

        } catch (error) {
            console.error("API Bağlantı Hatası:", error);
            const fallbackCat = topCategory || 'Genel';
            const fTitle = apiLang === 'en' ? `Selected for You: ${fallbackCat.toUpperCase()}` : `Sizin İçin Seçildi: ${fallbackCat.toUpperCase()} Gelişmeleri`;
            const fDesc = apiLang === 'en' ? `API limits reached. Displaying fallback test news.` : `API anahtarlarınız yanıt vermediği için bu sistem-içi test haberi gösterilmektedir.`;
            return [
                {
                    url: "fallback-rec-1",
                    title: fTitle,
                    content: fDesc,
                    category: fallbackCat,
                    urlToImage: "https://picsum.photos/400/200?random=3"
                }
            ];
        }
    }
}
