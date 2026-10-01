import NewsService from './NewsService.js';
import { CONFIG } from '../config.js';

// Gelişmiş Kelime Analizi ile Akıllı Kategorizasyon
const categorize = (title, content, defaultCategory) => {
    // Sadece tam kelimeleri bulmak için metnin başı ve sonuna boşluk ekleyip, noktalama işaretlerini siliyoruz
    const rawText = ((title || "") + " " + (content || "")).toLowerCase();
    const cleanText = " " + rawText.replace(/[.,!?;:()[\]"']/g, ' ') + " ";
    
    // Alt-kelime (substring) hatalarını ("zaman" içinde "zam" bulunması) engellemek için kelimeleri boşluklu ararız
    const check = (words) => words.some(w => cleanText.includes(" " + w + " "));

    if (check(['icardi', 'futbol', 'galatasaray', 'fenerbahçe', 'beşiktaş', 'spor', 'voleybol', 'tenis', 'basketbol', 'şampiyon', 'milli takım'])) return 'spor';
    if (check(['siyaset', 'parti', 'seçim', 'bakan', 'cumhurbaşkanı', 'tbmm', 'milletvekili', 'chp', 'ak parti', 'mhp', 'belediye'])) return 'siyaset';
    if (check(['sanat', 'sinema', 'film', 'tiyatro', 'müzik', 'konser', 'sergi', 'oscar', 'festival', 'oyuncu'])) return 'sanat';
    if (check(['eğitim', 'okul', 'öğrenci', 'öğretmen', 'meb', 'üniversite', 'sınav', 'yks', 'lgs'])) return 'eğitim';
    if (check(['ekonomi', 'dolar', 'altın', 'borsa', 'enflasyon', 'faiz', 'merkez bankası', 'zam', 'fiyat'])) return 'ekonomi';
    if (check(['teknoloji', 'yapay zeka', 'telefon', 'yazılım', 'apple', 'google', 'uzay', 'yeni nesil'])) return 'teknoloji';
    
    return defaultCategory;
};

export default class SearchNewsService extends NewsService {
    async getNews(context) {
        const { query, city, lang } = context;
        
        // Eğer arama kutusu boşsa doğrudan şehri arat (Bölgesel Haber Mantığı)
        const searchQuery = (query && query.trim() !== '') ? query : city;
        
        const apiLang = lang || 'tr';
        const apiCountry = apiLang === 'tr' ? 'tr' : 'us';
        
        let allArticles = [];
        const fetchPromises = [];

        // 1. GNews API İsteği Hazırlığı
        if (CONFIG.GNEWS_API_KEY && !CONFIG.GNEWS_API_KEY.includes('BURAYA')) {
            const gUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(searchQuery)}&lang=${apiLang}&country=${apiCountry}&apikey=${CONFIG.GNEWS_API_KEY}`;
            fetchPromises.push(
                fetch(gUrl).then(res => res.json()).then(data => {
                    if(data.articles) {
                        return data.articles.map(a => ({
                            url: a.url, title: a.title, content: a.description, category: categorize(a.title, a.description, 'ulusal'), urlToImage: a.image
                        }));
                    }
                    return [];
                }).catch(() => [])
            );
        }

        // 2. NewsData.io İsteği Hazırlığı (Yerel haberlerde çok iyidir)
        if (CONFIG.NEWSDATA_API_KEY && !CONFIG.NEWSDATA_API_KEY.includes('BURAYA')) {
            const nUrl = `https://newsdata.io/api/1/news?apikey=${CONFIG.NEWSDATA_API_KEY}&q=${encodeURIComponent(searchQuery)}&language=${apiLang}&country=${apiCountry}`;
            fetchPromises.push(
                fetch(nUrl).then(res => res.json()).then(data => {
                    if(data.results) {
                        return data.results.map(a => ({
                            url: a.link, title: a.title, content: a.description || 'İçerik bulunamadı', category: categorize(a.title, a.description, 'bölgesel'), urlToImage: a.image_url
                        }));
                    }
                    return [];
                }).catch(() => [])
            );
        }

        // 3. CollectAPI İsteği Hazırlığı (Sadece Türkçe destegi var, o yüzden lang=tr ise at)
        if (CONFIG.COLLECT_API_KEY && !CONFIG.COLLECT_API_KEY.includes('BURAYA') && apiLang === 'tr') {
            const cUrl = `https://api.collectapi.com/news/getNews?country=tr&tag=general`;
            fetchPromises.push(
                fetch(cUrl, { headers: { "authorization": `apikey ${CONFIG.COLLECT_API_KEY}` }})
                .then(res => res.json()).then(data => {
                    if(data.success && data.result) {
                        // Basit kelime filtresi yapıyoruz çünkü CollectAPI sadece tag destekliyor
                        return data.result.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.description.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(a => ({
                            url: a.url, title: a.name, content: a.description, category: categorize(a.name, a.description, a.source), urlToImage: a.image
                        }));
                    }
                    return [];
                }).catch(() => [])
            );
        }

        try {
            // Paralel API sorgulama (Hem hızlı hem çeşitli - OOP Çoklu Veri Kaynağı Entegrasyonu)
            if (fetchPromises.length > 0) {
                const results = await Promise.all(fetchPromises);
                results.forEach(apiResultArr => {
                    allArticles = allArticles.concat(apiResultArr);
                });
            }

            // --- STRİCT CITY FILTER (Bölgesel Haber Doğrulaması) ---
            // Eğer kelime aratılmadıysa, şehir bazlı arama yapıyoruz demektir.
            // API'ler Bursa haberini Erzurum sanıp getirebilir. Biz burada katı bir filtre uyguluyoruz:
            if ((!query || query.trim() === '') && city) {
                allArticles = allArticles.filter(a => {
                    const searchSpace = (a.title + " " + a.content).toLowerCase();
                    const targetCity = city.toLowerCase();
                    return searchSpace.includes(targetCity);
                });
            }

            if (allArticles.length === 0) throw new Error("API Limit veya Boş Veri");
            
            return allArticles;

        } catch (error) {
            console.error("API Bağlantı Hatası:", error);
            const errTitle = apiLang === 'en' ? `No results found for (${searchQuery}) or API Limit Reached` : `(${searchQuery}) İçin Sonuç Bulunamadı veya Limit Doldu`;
            const errDesc = apiLang === 'en' ? `Make sure your API keys in config.js are valid and not exhausted.` : `config.js dosyasına girdiğiniz API anahtarlarının geçerli olduğundan emin olun.`;
            
            return [
                {
                    url: "fallback-search-1",
                    title: errTitle,
                    content: errDesc,
                    category: "Sistem Uyarı",
                    urlToImage: "https://picsum.photos/400/200?random=1"
                }
            ];
        }
    }
}
