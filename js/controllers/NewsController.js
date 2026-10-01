export default class NewsController {
    constructor(user) {
        this.user = user;
    }

    async renderNewsView(service, context, viewTitle) {
        const container = document.getElementById('app-content');
        container.innerHTML = `<h2 style="margin-bottom:20px;">${viewTitle}</h2>`;

        if (context.isSearch) {
            container.innerHTML += `
                <div class="search-box view-container" style="margin-bottom: 10px;">
                    <input type="text" id="searchInput" placeholder="Haberlerde veya şehirlerde ara..." value="${context.query || ''}">
                    <button id="searchBtn">Ara</button>
                </div>
                <div class="category-filters view-container" style="display:flex; gap:10px; margin-bottom:25px; flex-wrap:wrap; justify-content:center;">
                    <a href="#search?q=Spor" style="text-decoration:none; padding:6px 16px; background:var(--primary-color); color:white; border-radius:20px; font-size:0.9rem; transition: transform 0.2s;">⚽ Spor</a>
                    <a href="#search?q=Siyaset" style="text-decoration:none; padding:6px 16px; background:var(--primary-color); color:white; border-radius:20px; font-size:0.9rem; transition: transform 0.2s;">🏛️ Siyaset</a>
                    <a href="#search?q=Ekonomi" style="text-decoration:none; padding:6px 16px; background:var(--primary-color); color:white; border-radius:20px; font-size:0.9rem; transition: transform 0.2s;">💰 Ekonomi</a>
                    <a href="#search?q=Sanat" style="text-decoration:none; padding:6px 16px; background:var(--primary-color); color:white; border-radius:20px; font-size:0.9rem; transition: transform 0.2s;">🎨 Sanat</a>
                    <a href="#search?q=Eğitim" style="text-decoration:none; padding:6px 16px; background:var(--primary-color); color:white; border-radius:20px; font-size:0.9rem; transition: transform 0.2s;">📚 Eğitim</a>
                    <a href="#search?q=Teknoloji" style="text-decoration:none; padding:6px 16px; background:var(--primary-color); color:white; border-radius:20px; font-size:0.9rem; transition: transform 0.2s;">💻 Teknoloji</a>
                </div>
            `;
        }

        // Yavaş açılma hissini kırmak için anında Loading animasyonu gösteriyoruz
        const loaderId = 'news-loader';
        container.innerHTML += `<div id="${loaderId}" style="text-align:center; padding: 40px; font-size: 1.2rem; color: var(--primary-color);">
            ⏳ Haberler çeşitli kaynaklardan toplanıyor, lütfen bekleyin...
        </div>`;

        try {
            const newsData = await service.getNews(context);
            
            // Yükleme yazısını kaldır
            const loader = document.getElementById(loaderId);
            if(loader) loader.remove();

            if (!newsData || newsData.length === 0) {
                container.innerHTML += `
                <p class="view-container" style="color:var(--danger)">
                    Haberler yüklenemedi veya boş. 
                    Eğer hep böyle görüyorsanız lütfen <br/><b>js/config.js</b><br/> dosyasına geçerli bir NewsAPI anahtarı girin.
                </p>`;
            } else {
                let gridHtml = `<div class="news-grid view-container">`;
                const favorites = this.user.getFavorites();

                newsData.forEach(news => {
                    const isFav = favorites.some(f => f.url === news.url);
                    const imageHtml = news.urlToImage ? `<img src="${news.urlToImage}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;" alt="News Image">` : '';
                    
                    gridHtml += `
                        <div class="news-card">
                            ${imageHtml}
                            <div>
                                <span class="news-category">${news.category}</span>
                            </div>
                            <h3 class="news-title">${news.title}</h3>
                            <p class="news-content">${news.content}</p>
                            <div class="news-actions" style="display:flex; justify-content:space-between; align-items:center;">
                                <a href="${news.url}" target="_blank" class="btn-read" data-category="${news.category}">Haberi Oku</a>
                                <div>
                                    <button class="btn-tts" data-text="${news.title}. ${news.content || ''}" style="background:none; border:none; cursor:pointer; font-size:1.3rem; transition: transform 0.2s; margin-right:5px;" title="Sesli Oku">🔊</button>
                                    <button class="btn-favorite" data-url="${news.url}" style="background:none; border:none; cursor:pointer; font-size:1.3rem;">
                                        ${isFav ? '❤️' : '🤍'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });

                gridHtml += `</div>`;
                container.innerHTML += gridHtml;
                
                // Keep references for add/remove logic
                this._lastRenderedNews = newsData;
            }
        } catch (e) {
            console.error(e);
            container.innerHTML += `<p>Bir hata oluştu. Ayarları kontrol edin.</p>`;
        }

        if (context.isSearch) {
            const btn = document.getElementById('searchBtn');
            if(btn) {
                btn.addEventListener('click', () => {
                    const q = document.getElementById('searchInput').value;
                    window.location.hash = `#search?q=${encodeURIComponent(q)}`;
                });
                document.getElementById('searchInput').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') document.getElementById('searchBtn').click();
                });
            }
        }

        this.bindCardEvents();
    }

    bindCardEvents() {
        document.querySelectorAll('.btn-read').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.getAttribute('data-category');
                this.user.recordRead(category); 
                // Don't alert so we don't block the new tab opening
            });
        });

        document.querySelectorAll('.btn-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newsUrl = e.currentTarget.getAttribute('data-url');
                const favorites = this.user.getFavorites();
                const isFav = favorites.some(f => f.url === newsUrl);
                
                if (isFav) {
                    this.user.removeFavorite(newsUrl);
                    e.currentTarget.innerText = '🤍';
                } else {
                    const newsObj = this._lastRenderedNews.find(n => n.url === newsUrl);
                    if (newsObj) {
                        this.user.addFavorite(newsObj);
                        e.currentTarget.innerText = '❤️';
                    }
                }
            });
        });

        // Sesli Okuma (TTS)
        document.querySelectorAll('.btn-tts').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.currentTarget.getAttribute('data-text');
                const utterance = new SpeechSynthesisUtterance(text);
                const isEnglish = window.location.hash.includes('en') || localStorage.getItem('smartnews_lang') === 'en';
                utterance.lang = isEnglish ? 'en-US' : 'tr-TR';
                utterance.rate = 1.0;
                window.speechSynthesis.cancel(); // Önceki okumayı durdur
                window.speechSynthesis.speak(utterance);
                
                e.currentTarget.style.transform = "scale(1.2)";
                setTimeout(() => e.currentTarget.style.transform = "scale(1)", 200);
            });
        });
    }
}
