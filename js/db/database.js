import News from '../models/News.js';

export default class DatabaseManager {
    constructor() {
        this.db = null;
    }

    async init() {
        // Init sql.js
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });

        // Create an in-memory database
        this.db = new SQL.Database();
        this.createTables();
        this.seedData();
    }

    createTables() {
        const sql = `
            CREATE TABLE news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NO NULL,
                content TEXT NOT NULL,
                category TEXT NOT NULL,
                city TEXT NOT NULL
            );
        `;
        this.db.run(sql);
    }

    seedData() {
        const insertStmt = this.db.prepare(`INSERT INTO news (title, content, category, city) VALUES (?, ?, ?, ?)`);

        const dummyData = [
            // Teknoloji
            ["Yapay Zeka Devrimi", "Yapay zeka modelleri artık çok daha gelişmiş ve hayatımızın her alanında.", "teknoloji", "İstanbul"],
            ["Yeni Nesil İşlemciler Çıktı", "Yeni nesil ultra hızlı işlemciler mobil cihazlarda masaüstü performansı sunuyor.", "teknoloji", "Ankara"],
            ["Web3 Teknolojisine Geçiş", "Merkeziyetsiz internet konsepti hızla kabul görüyor.", "teknoloji", "İzmir"],
            ["Yerli Yazılım Rüzgarı", "Yerli firmalar globale açılmaya devam ediyor.", "teknoloji", "Afyon"],
            
            // Spor
            ["Derbi Heyecanı Yaklaşıyor", "Hafta sonu oynanacak olan büyük derbi için nefesler tutuldu.", "spor", "İstanbul"],
            ["Milli Takım Kampta", "Milli takım zorlu maçlar öncesi kampa girdi.", "spor", "Ankara"],
            ["Yerel Liglerde Son Durum", "Bölgesel liglerde liderlik mücadelesi kızıştı.", "spor", "Afyon"],
            ["Transfer Piyasası Hareketli", "Yaz transfer dönemi kulüplerin hızlı hamleleriyle başladı.", "spor", "İzmir"],

            // Ekonomi
            ["Borsada Rekor Seviye", "Borsa güne tarihi zirvesinden başladı, yatırımcılar umutlu.", "ekonomi", "İstanbul"],
            ["Enflasyon Verileri Açıklandı", "Bu ayki enflasyon rakamları beklentilerin altında geldi.", "ekonomi", "Ankara"],
            ["İhracat Rakamları Büyüyor", "Sanayi bölgelerindeki ihracat rakamlarında büyük artış var.", "ekonomi", "İzmir"],
            ["Tarım Ekonomisi Canlanıyor", "Yeni destek paketleri çiftçinin yüzünü güldürdü.", "ekonomi", "Afyon"],

            // Siyaset
            ["Yerel Seçim Hazırlıkları", "Partilerin yerel seçim çalışmaları hız kazandı.", "siyaset", "Ankara"],
            ["Belediyeden Yeni Proje", "Şehir içi trafiği rahatlatacak olan yeni altgeçit projesi tanıtıldı.", "siyaset", "İstanbul"],
            ["Kentsel Dönüşüm Hızlanıyor", "Riskli bölgelerdeki çalışmalar yoğunlaştı.", "siyaset", "İzmir"],
            ["Yeni Teşvik Paketi", "Bölgesel teşvik paketleri bölge halkına sunuldu.", "siyaset", "Afyon"]
        ];

        dummyData.forEach(row => {
            insertStmt.run(row);
        });

        insertStmt.free();
    }

    // A fast abstraction to execute SELECT
    executeQuery(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        
        const results = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push(new News(row.id, row.title, row.content, row.category, row.city));
        }
        stmt.free();
        
        return results;
    }
}
