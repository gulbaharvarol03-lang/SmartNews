function safeAttr(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export default class NewsController {
    constructor(user) {
        this.user = user;
        this._currentSpeakingText = null;
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
                    const displayContent = news.content || 'Detaylar için habere tıklayınız.';
                    const ttsText = `${news.title}. ${displayContent}`;
                    const readButtonHtml = (news.url && news.url !== '#' && !news.url.startsWith('fallback'))
                        ? `<a href="${news.url}" target="_blank" class="btn-read" data-category="${news.category}">Haberi Oku</a>`
                        : `<span style="font-size:0.85rem; color:var(--text-muted); font-style: italic;">Sistem Bildirimi</span>`;

                    gridHtml += `
                        <div class="news-card">
                            ${imageHtml}
                            <div>
                                <span class="news-category">${news.category || 'Genel'}</span>
                            </div>
                            <h3 class="news-title">${news.title}</h3>
                            <p class="news-content">${displayContent}</p>
                            <div class="news-actions" style="display:flex; justify-content:space-between; align-items:center;">
                                ${readButtonHtml}
                                <div>
                                    <button class="btn-tts" data-text="${safeAttr(ttsText)}" style="background:none; border:none; cursor:pointer; font-size:1.3rem; transition: transform 0.2s; margin-right:5px;" title="Sesli Oku / Durdur">🔊</button>
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
                if (category) {
                    this.user.recordRead(category);
                    try {
                        localStorage.setItem('userReadingStats', JSON.stringify(this.user.getReadingStats()));
                    } catch (err) {
                        console.warn("Reading stats could not be saved to localStorage", err);
                    }
                }
            });
        });

        document.querySelectorAll('.btn-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newsUrl = e.currentTarget.getAttribute('data-url');
                if (!newsUrl || newsUrl === '#' || newsUrl.startsWith('fallback')) return;

                const favorites = this.user.getFavorites();
                const isFav = favorites.some(f => f.url === newsUrl);
                
                if (isFav) {
                    this.user.removeFavorite(newsUrl);
                    e.currentTarget.innerText = '🤍';
                } else {
                    const newsObj = this._lastRenderedNews ? this._lastRenderedNews.find(n => n.url === newsUrl) : null;
                    if (newsObj) {
                        this.user.addFavorite(newsObj);
                        e.currentTarget.innerText = '❤️';
                    }
                }
                try {
                    localStorage.setItem('userFavorites', JSON.stringify(this.user.getFavorites()));
                } catch (err) {
                    console.warn("Favorites could not be saved to localStorage", err);
                }
            });
        });

        // Sesli Okuma (TTS)
        document.querySelectorAll('.btn-tts').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.currentTarget.getAttribute('data-text');
                if (!text) return;

                // Eğer zaten aynı metin okunuyorsa durdur (Toggle)
                if (window.speechSynthesis.speaking && this._currentSpeakingText === text) {
                    window.speechSynthesis.cancel();
                    this._currentSpeakingText = null;
                    return;
                }

                window.speechSynthesis.cancel(); // Önceki okumayı durdur
                this._currentSpeakingText = text;

                const utterance = new SpeechSynthesisUtterance(text);
                const isEnglish = window.location.hash.includes('en') || localStorage.getItem('smartnews_lang') === 'en';
                utterance.lang = isEnglish ? 'en-US' : 'tr-TR';
                utterance.rate = 1.0;
                utterance.onend = () => { this._currentSpeakingText = null; };
                utterance.onerror = () => { this._currentSpeakingText = null; };

                window.speechSynthesis.speak(utterance);
                
                e.currentTarget.style.transform = "scale(1.2)";
                setTimeout(() => e.currentTarget.style.transform = "scale(1)", 200);
            });
        });
    }
}
