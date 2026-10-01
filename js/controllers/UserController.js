export default class UserController {
    constructor(user) {
        this.user = user;
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

            gridHtml += `
            <div class="news-card">
                ${imageHtml}
                <div>
                    <span class="news-category">${news.category || 'Genel'}</span>
                </div>
                <h3 class="news-title">${news.title}</h3>
                <p class="news-content">${news.content}</p>
                <div class="news-actions" style="display:flex; justify-content:space-between; align-items:center;">
                    <a href="${news.url}" target="_blank" class="btn-read" data-category="${news.category}">Haberi Oku</a>
                    <div>
                        <button class="btn-tts" data-text="${news.title}. ${news.content || ''}" style="background:none; border:none; cursor:pointer; font-size:1.3rem; transition: transform 0.2s; margin-right:5px;" title="Sesli Oku">🔊</button>
                        <button class="btn-favorite" data-url="${news.url}" style="background:none; border:none; cursor:pointer; font-size:1.3rem;">❤️</button>
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
                this.user.recordRead(category); 
            });
        });

        document.querySelectorAll('.btn-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newsUrl = e.currentTarget.getAttribute('data-url');
                this.user.removeFavorite(newsUrl);
                // Re-render favorites
                this.renderFavorites();
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
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
                
                e.currentTarget.style.transform = "scale(1.2)";
                setTimeout(() => e.currentTarget.style.transform = "scale(1)", 200);
            });
        });
    }
}
