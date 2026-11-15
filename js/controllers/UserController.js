function safeAttr(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export default class UserController {
    constructor(user) {
        this.user = user;
        this._currentSpeakingText = null;
    }

    renderFavorites() {
        const container = document.getElementById('app-content');
        container.innerHTML = `<h2 style="margin-bottom:20px;">Favori Haberleriniz</h2>`;

        const favNews = this.user.getFavorites();

        if (favNews.length === 0) {
            container.innerHTML += `<p class="view-container">Henüz favori haberiniz bulunmamaktadır.</p>`;
            return;
        }

        let gridHtml = `<div class="news-grid view-container">`;
        
        favNews.forEach(news => {
            const imageHtml = news.urlToImage ? `<img src="${news.urlToImage}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;" alt="News Image">` : '';
            const displayContent = news.content || 'Detaylar için habere tıklayınız.';
            const ttsText = `${news.title}. ${displayContent}`;
            const readButtonHtml = (news.url && news.url !== '#' && !news.url.startsWith('fallback'))
                ? `<a href="${news.url}" target="_blank" class="btn-read" data-category="${news.category || 'Genel'}">Haberi Oku</a>`
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
                        <button class="btn-favorite" data-url="${news.url}" style="background:none; border:none; cursor:pointer; font-size:1.3rem;" title="Favorilerden Çıkar">❤️</button>
                    </div>
                </div>
            </div>`;
        });

        gridHtml += `</div>`;
        container.innerHTML += gridHtml;

        // Bind events
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
                this.user.removeFavorite(newsUrl);
                try {
                    localStorage.setItem('userFavorites', JSON.stringify(this.user.getFavorites()));
                } catch (err) {
                    console.warn("Favorites could not be saved to localStorage", err);
                }
                // Re-render favorites
                this.renderFavorites();
            });
        });

        // Sesli Okuma (TTS)
        document.querySelectorAll('.btn-tts').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.currentTarget.getAttribute('data-text');
                if (!text) return;

                if (window.speechSynthesis.speaking && this._currentSpeakingText === text) {
                    window.speechSynthesis.cancel();
                    this._currentSpeakingText = null;
                    return;
                }

                window.speechSynthesis.cancel();
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
