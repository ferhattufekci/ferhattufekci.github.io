/* One language resolver shared by RSS sync, browser fallback, badges and filters. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MediumArticleLanguage = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var words = {
    tr: {
      strong: "ve bir bu ile için icin nasıl nasil neden olarak olan gibi daha ise her kadar ancak hem hangi nedir",
      topic: "sistem sistemler gereksinim gereksinimler yazılım yazilim mühendisliği muhendisligi yazma yazılıyor yaziliyor etkili yöntem yontem tasarım tasarim tasarlanır tasarlanir kalite güvenilirlik guvenilirlik savunma sanayisinde dijital ikiz ölçülebilir olculebilir sıfırdan sifirdan teknikleri ipuçları ipuclari stratejiler yaşam yasam döngüsü dongusu anahtarı anahtari çeviklik ceviklik çevikliğin cevikligin geliştirme gelistirme analiz yazı yazi teknik hedeflerden sözleşmesel taahhütlere dönüştüren kritik kavram",
    },
    en: {
      strong: "the and of in to for with a an is are this that how what why from as at on by your we you it which",
      topic: "system systems engineering requirements software development testing quality reliability design writing effective techniques strategies digital twin defense industry life cycle agility key introduction understanding",
    },
  };
  var lexicons = {};
  Object.keys(words).forEach(function (lang) {
    var lexicon = Object.create(null);
    words[lang].topic.split(" ").forEach(function (word) { lexicon[word] = 1; });
    words[lang].strong.split(" ").forEach(function (word) { lexicon[word] = 2; });
    lexicons[lang] = lexicon;
  });

  function normalizeLang(value) {
    var code = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
    return code === "tr" || code === "en" ? code : null;
  }

  function scores(text) {
    var normalized = String(text || "").normalize("NFC").toLowerCase().replace(/\u0307/g, "");
    var tokens = normalized.match(/[a-zçğıöşü]+/g) || [];
    var result = { tr: 0, en: 0 };
    tokens.forEach(function (token) {
      result.tr += lexicons.tr[token] || 0;
      result.en += lexicons.en[token] || 0;
    });
    // Character evidence is supplementary; English writing can contain Turkish names.
    result.tr += Math.min((normalized.match(/[çğıöşü]/g) || []).length, 2);
    return result;
  }

  function resolve(article) {
    article = article || {};
    var explicit = normalizeLang(article.lang) || normalizeLang(article.language);
    if (explicit) return explicit;
    var title = scores(article.title);
    var body = scores(String(article.content || article.excerpt || "").slice(0, 1200));
    // Titles carry more weight than mixed-language technical vocabulary in the body.
    var tr = title.tr * 3 + body.tr;
    var en = title.en * 3 + body.en;
    return tr > en ? "tr" : "en";
  }

  return { resolve: resolve };
});
