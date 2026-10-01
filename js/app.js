import Router from './routes/router.js';
import User from './models/User.js';
import NewsService from './services/NewsService.js';
import SearchNewsService from './services/SearchNewsService.js';
import RecommendationService from './services/RecommendationService.js';

// İsteğin üzerine: index.html üzerinden veya tarayıcı konsolundan sınıflara 
// ve verilere global olarak ulaşabilmen için hepsini window objesine ekliyoruz.
window.User = User;
window.NewsService = NewsService;
window.SearchNewsService = SearchNewsService;
window.RecommendationService = RecommendationService;

// Google Login Callback (GSI JWT Çözücü)
window.handleGoogleLogin = (response) => {
    try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        const userName = payload.name;
        
        localStorage.setItem('smartnews_username', userName);
        
        if (appState.currentUser) {
            appState.currentUser.name = userName;
        } else {
            appState.currentUser = new User(1, userName, "İstanbul");
        }
        
        const nameDisplay = document.getElementById('userNameDisplay');
        if (nameDisplay) nameDisplay.textContent = `Kullanıcı: ${userName}`;
        
        const loginModal = document.getElementById('googleLoginModal');
        if (loginModal) loginModal.style.display = 'none';
        
        alert(`Hoş geldin, ${userName}! SmartNews senin için hazır.`);
    } catch (e) {
        console.error("Google Giriş Hatası:", e);
        alert("Giriş işlemi sırasında bir hata oluştu.");
    }
};

// Oturum Zamanlayıcı (Uygulamada geçirilen vakit için)
const sessionStartTime = Date.now();

// Hava Durumu Çekme Fonksiyonu
async function fetchWeather(cityName) {
    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${cityName}&count=1&language=tr`);
        const geoData = await geoRes.json();
        if(geoData.results && geoData.results.length > 0) {
            const { latitude, longitude } = geoData.results[0];
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            const weatherData = await weatherRes.json();
            const temp = Math.round(weatherData.current_weather.temperature);
            document.getElementById('weatherDisplay').innerHTML = `🌤️ ${cityName}: ${temp}°C`;
        }
    } catch(e) { console.log("Hava durumu alınamadı", e); }
}

// Canlı Finans Şeridi Simülatörü
function initTicker() {
    // API sınırına takılmamak için harika ve gerçekçi bir simülasyon (her 5 saniyede bir güncellenir)
    setInterval(() => {
        const usd = (32.40 + Math.random()*0.1).toFixed(2);
        const eur = (35.10 + Math.random()*0.1).toFixed(2);
        const gold = (2450 + Math.random()*10).toFixed(1);
        const btc = (65000 + Math.random()*500).toFixed(0);
        
        document.getElementById('tickerContent').innerHTML = `
            <span style="margin-right:40px">💵 USD: <b>${usd} ₺</b></span>
            <span style="margin-right:40px">💶 EUR: <b>${eur} ₺</b></span>
            <span style="margin-right:40px">🪙 Gram Altın: <b>${gold} ₺</b></span>
            <span style="margin-right:40px">₿ Bitcoin: <b>$${btc}</b></span>
        `;
    }, 5000);
    // İlk render
    document.getElementById('tickerContent').innerHTML = `💵 USD: <b>32.45 ₺</b> &nbsp;&nbsp;&nbsp; 💶 EUR: <b>35.12 ₺</b> &nbsp;&nbsp;&nbsp; 🪙 Gram Altın: <b>2455.0 ₺</b>`;
}

// Application State
const appState = {
    currentUser: null,
    router: null
};

// Initialize Application
async function init() {
    try {
        // Kullanıcı Giriş/Kayıt Sistemi (Google veya Misafir)
        let savedName = localStorage.getItem('smartnews_username');
        
        if (!savedName) {
            const loginModal = document.getElementById('googleLoginModal');
            if (loginModal) loginModal.style.display = 'block';
            
            // Misafir Butonu
            const guestBtn = document.getElementById('guestLoginBtn');
            if (guestBtn) {
                guestBtn.addEventListener('click', () => {
                    savedName = "Misafir Kullanıcı";
                    localStorage.setItem('smartnews_username', savedName);
                    appState.currentUser = new User(1, savedName, "İstanbul");
                    
                    const nameDisplay = document.getElementById('userNameDisplay');
                    if (nameDisplay) nameDisplay.textContent = `Kullanıcı: ${savedName}`;
                    
                    loginModal.style.display = 'none';
                });
            }
            
            // Kullanıcı girene kadar geçici nesne
            appState.currentUser = new User(1, "Giriş Bekleniyor...", "İstanbul");
        } else {
            appState.currentUser = new User(1, savedName, "İstanbul");
            const nameDisplay = document.getElementById('userNameDisplay');
            if (nameDisplay) nameDisplay.textContent = `Kullanıcı: ${savedName}`;
        }

        // Load reading stats from local storage if exists to simulate persistence
        const savedStats = localStorage.getItem('userReadingStats');
        const savedFavorites = localStorage.getItem('userFavorites');
        
        if (savedStats) appState.currentUser.setReadingStats(JSON.parse(savedStats));
        if (savedFavorites) appState.currentUser.setFavorites(JSON.parse(savedFavorites));
        
        // Tema ayarını yükle
        const savedTheme = localStorage.getItem('smartnews_theme') || 'light';
        document.body.className = savedTheme === 'light' ? '' : `theme-${savedTheme}`;
        const themeSelect = document.getElementById('themeSelect');
        if(themeSelect) themeSelect.value = savedTheme;

        // PWA Service Worker Kaydı
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').then(() => console.log("PWA SW Loaded."));
        }

        // Hava durumu ve ticker
        fetchWeather(appState.currentUser.city);
        initTicker();

        // Arayüz olaylarını (butonlar, menüler) dinlemeye başla
        setupUIEvents();

        // Initialize Router
        appState.router = new Router(appState.currentUser);
        appState.router.init();

    } catch (error) {
        console.error("Failed to initialize app:", error);
        document.getElementById('app-content').innerHTML = `
            <div style="text-align:center; color: red;">
                <h2>Uygulama başlatılamadı.</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function setupUIEvents() {
    // City Changer
    const citySelect = document.getElementById('userCitySelect');
    
    // 81 İlimizi JS ile dinamik olarak oluşturuyoruz
    const cities = [
        "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir", 
        "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", 
        "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", 
        "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", 
        "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", 
        "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", 
        "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak", "Bartın", 
        "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
    ];
    
    // Türkçe karakterlere uygun alfabetik sıralama
    cities.sort((a,b) => a.localeCompare(b, 'tr'));
    
    citySelect.innerHTML = '';
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });

    // Kullanıcının kayıtlı olan (veya varsayılan) şehrini seç
    citySelect.value = appState.currentUser.getCity();
    
    citySelect.addEventListener('change', (e) => {
        appState.currentUser.setCity(e.target.value);
        fetchWeather(e.target.value); // Havayı güncelle
        appState.router.handleRoute(); // Seçim değiştiğinde sayfayı yenilemeden haberleri güncelle
    });

    // Theme Changer (Tema Seçici)
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            const selectedTheme = e.target.value;
            localStorage.setItem('smartnews_theme', selectedTheme);
            document.body.className = selectedTheme === 'light' ? '' : `theme-${selectedTheme}`;
        });
    }

    // Language Changer (Dil Seçici)
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        const savedLang = localStorage.getItem('smartnews_lang') || 'tr';
        langSelect.value = savedLang;
        langSelect.addEventListener('change', (e) => {
            localStorage.setItem('smartnews_lang', e.target.value);
            appState.router.handleRoute(); // Dili değiştirince sayfayı yenile
        });
    }

    // Refresh News Button (Sayfayı Yenilemeden Veri Tazeleme)
    const refreshBtn = document.getElementById('refreshNewsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // Sadece içeriği yeniden çek, tarayıcıyı yorma
            appState.router.handleRoute(); 
        });
    }

    // Modal Eventsics Modal
    const modal = document.getElementById('analyticsModal');
    const btn = document.getElementById('showAnalyticsBtn');
    const span = document.getElementById('closeModal');

    btn.onclick = () => {
        showAnalytics();
        modal.style.display = "block";
    }

    span.onclick = () => {
        modal.style.display = "none";
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function showAnalytics() {
    const stats = appState.currentUser.getReadingStats(); // Encapsulation usage
    const content = document.getElementById('analyticsContent');
    
    // Geçirilen vakit hesaplama
    const previousTime = parseInt(localStorage.getItem('smartnews_total_time') || '0', 10);
    const currentSessionTime = Math.floor((Date.now() - sessionStartTime) / 1000); // saniye
    const totalSeconds = previousTime + currentSessionTime;
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = minutes > 0 ? `${minutes} dk ${seconds} sn` : `${seconds} sn`;
    
    let html = `<h2>Okuma Analiziniz</h2>
                <div style="background: var(--primary-color); color: white; padding: 15px; border-radius: 12px; margin-top: 15px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <strong>⏱️ Uygulamada Geçirilen Toplam Vakit:</strong><br>
                    <span style="font-size: 1.5rem; font-weight: bold;">${timeStr}</span>
                </div>
                <p style="margin-top: 15px; color: var(--text-muted);">En çok okuduğunuz kategoriler aşağıdadır. Sistemimiz bu verilere göre size haber önermektedir.</p>
                <div style="margin-top:20px;">`;
    
    const sortedCategories = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    
    if (sortedCategories.length === 0) {
        html += `<p>Henüz haber okumadınız.</p>`;
    } else {
        sortedCategories.forEach(([category, count]) => {
            html += `
                <div class="analytics-item">
                    <span><strong>${category.toUpperCase()}</strong></span>
                    <span>${count} Okuma</span>
                </div>
            `;
        });
    }

    html += `</div>`;
    content.innerHTML = html;
}

// Global hooks to access app state from the console or index.html
window.getAppState = () => appState;
window.appState = appState;

// Save user stats occasionally or before unload
window.addEventListener('beforeunload', () => {
    if(appState.currentUser) {
        localStorage.setItem('userReadingStats', JSON.stringify(appState.currentUser.getReadingStats()));
        localStorage.setItem('userFavorites', JSON.stringify(appState.currentUser.getFavorites()));
        
        // Vakit kaydet
        const previousTime = parseInt(localStorage.getItem('smartnews_total_time') || '0', 10);
        const currentSessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
        localStorage.setItem('smartnews_total_time', previousTime + currentSessionTime);
    }
});

// Run Init
window.addEventListener('DOMContentLoaded', init);
