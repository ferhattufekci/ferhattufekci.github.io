/* Profile details for the two synchronized catalogs. */
(function () {
  "use strict";

  const platforms = {
    Medium: {
      profile: "https://medium.com/@ferhattufekci",
      icon: "fa-medium-m",
      sync: { tr: "Son yazı senkronizasyonu", en: "Last article sync" },
      latest: { tr: "Son Yazı", en: "Latest Article" },
    },
    GitHub: {
      profile: "https://github.com/ferhattufekci",
      icon: "fa-github",
      sync: { tr: "Son repo senkronizasyonu", en: "Last repo sync" },
      latest: { tr: "Son Repo", en: "Latest Repo" },
    },
  };

  let selection = "all";

  function localize(card) {
    const lang = selection === "all" ? (/^tr(?:-|$)/i.test(navigator.language) ? "tr" : "en") : selection;
    const source = card.dataset.platform;
    const platform = platforms[source];
    card.lang = lang;
    card.querySelector(".sync-card-sync-label").textContent = platform.sync[lang];
    card.querySelector(".sync-card-latest-label").textContent = platform.latest[lang];
    const trigger = card.previousElementSibling;
    trigger.lang = lang;
    trigger.setAttribute("aria-label", source + (lang === "tr" ? " senkronizasyon bilgisi" : " sync information"));
  }

  function refreshLanguage() {
    document.querySelectorAll(".sync-card[data-platform]").forEach(localize);
  }

  function httpsUrl(value) {
    if (!value || typeof value !== "string") return "";
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function latestRecord(source, records) {
    const medium = source === "Medium";
    let latest = null;
    for (const record of records || []) {
      if (!record) continue;
      const date = medium ? record.pubDate || record.date : record.pushed_at || record.updatedAt || record.updated_at;
      const timestamp = Date.parse(date);
      const title = medium ? record.title : record.name;
      if (!Number.isFinite(timestamp) || typeof title !== "string" || !title.trim()) continue;
      if (latest && latest.timestamp >= timestamp) continue;
      const url = httpsUrl(record.link || record.url || record.html_url);
      if (url) latest = { timestamp, title, url, cover: medium && httpsUrl(record.thumbnail) };
    }
    return latest;
  }

  function populate(card, id, source, clock, records) {
    const platform = platforms[source];
    card.id = id + "-tooltip";
    card.dataset.platform = source;
    card.querySelector(".sync-card-icon").classList.add(platform.icon);
    card.querySelector(".sync-card-profile").href = platform.profile;
    card.querySelector(".sync-card-clock").textContent = clock;
    const description = card.querySelector(".sync-card-sync");
    description.id = id + "-sync";
    const trigger = card.previousElementSibling;
    trigger.setAttribute("aria-controls", card.id);
    trigger.setAttribute("aria-describedby", description.id);
    localize(card);

    const latest = latestRecord(source, records);
    if (!latest) return;
    const link = card.querySelector(".sync-card-entry");
    link.href = latest.url;
    link.querySelector(".sync-card-title").textContent = latest.title;
    if (latest.cover) {
      const image = new Image(54, 40);
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove(), { once: true });
      image.src = latest.cover;
      link.prepend(image);
    }
    card.querySelector(".sync-card-latest").hidden = false;
  }

  window.PortfolioSyncCards = {
    populate,
    setLanguage(value) {
      selection = value;
      refreshLanguage();
    },
  };
  window.addEventListener("languagechange", refreshLanguage);
})();
