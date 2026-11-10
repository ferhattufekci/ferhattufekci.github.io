# ADR 0001 — Siteyi statik ve framework'süz tut

**[🇬🇧 English](0001-static-site-no-framework.md) | 🇹🇷 Türkçe**

**Durum:** Kabul edildi · **Tarih:** 2026-11-10 (zaten uygulanan bir kararın kaydı)

## Bağlam
Site tek bir kişinin portföyüdür: birkaç bölüm, iki herkese açık kaynaktan üretilen içerik,
kullanıcı hesabı yok, sunucu tarafında durum yok. GitHub Pages'te barındırılır; Pages
statik dosya sunar ve kod çalıştırmaz. Mevcut kod HTML, CSS, jQuery 3.6 ve ES5 dönemi
düz betiklerden oluşur.

## Karar
Site statik ve framework'süz kalır. React/Vue ya da bir bundler eklenmez, backend
eklenmez. Üretilen içerik, zamanlanmış workflow'ların ürettiği ve depoya commit edilen
JSON olarak kalır.

## Sonuçlar
- **Olumlu:** ayakta tutulacak bir build zinciri yok, yayınlanan sayfada bağımlılık
  değişikliği yok, yayınlanan artifact tam olarak incelenen şeydir ve barındırma maliyeti
  sıfırdır.
- **Olumlu:** tüm çalışma zamanı tarayıcıdaki kaynak görüntüleme ile incelenebilir; amacı
  okunmak olan bir portföy için bu uygundur.
- **Olumsuz:** bileşen modeli yoktur; ortak markup metin birleştirmeyle kurulur ve
  `index.html` büyümüştür (F-4). Ödenen bedel budur; çözümü framework'e geçmek değil,
  satır içi betikleri modüllere ayırmaktır (`docs/T-4-INLINE-SCRIPTS.md`).
- **Olumsuz:** derleme zamanında tip kontrolü yoktur (F-5).

## Değerlendirilen alternatifler
- **Statik site üreticisi (Eleventy, Astro).** Şablon tekrarını çözerdi; ancak sayfa sayısı
  sabit ve az olan bir siteye build adımı ve bağımlılık ağacı ekler.
- **Framework tabanlı SPA.** Yönlendirme ve geçişler zaten var ve testlerle korunuyor;
  yeniden yazmak, çalışan ve test edilmiş bir uygulamayı kanıtlanmamış biriyle değiştirmek
  olurdu.
