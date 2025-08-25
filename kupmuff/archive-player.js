/**
 * Laffcast Archive: HTML5 Player + Episode List (KupMuff)
 * Injects a player under "The Archive" when the logo is clicked,
 * plays the most recent episode from /assets/feeds/KupMuff/RSS-KupMuff.xml,
 * shows the last 5 episodes with scrolling + "Load 10 more".
 *
 * Quick start (HTML under your "The Archive" heading):
 *   <div id="archive-player-anchor"></div>
 *
 * Make sure your KupMuff logo has id="logo-kupmuff" (adjust selector below if needed).
 */

// --- Helpers ---------------------------------------------------------------
function xmlText(node, sel, fallback = "") {
  const el = node.querySelector(sel);
  return el ? (el.textContent || "").trim() : fallback;
}

function findEnclosure(node) {
  const encl = node.querySelector("enclosure[url]") || node.querySelector("media\\:content[url], content[url]");
  return encl ? encl.getAttribute("url") : "";
}

function parseRSS(xml) {
  const items = Array.from(xml.querySelectorAll("channel > item"));
  return items.map((item) => ({
    title: xmlText(item, "title", "Untitled episode"),
    link: xmlText(item, "link", ""),
    pubDate: xmlText(item, "pubDate", ""),
    audioUrl: findEnclosure(item),
    guid: xmlText(item, "guid", ""),
    description: xmlText(item, "description", ""),
  })).filter(ep => !!ep.audioUrl);
}

function toISODate(pubDateStr) {
  const t = Date.parse(pubDateStr);
  if (!isNaN(t)) return new Date(t).toISOString();
  try { return new Date(pubDateStr).toISOString(); } catch { return new Date().toISOString(); }
}

function humanDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch { return ""; }
}

function sanitizeHTML(str) {
  return (str || "").replace(/[&<>"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}

// --- Component -------------------------------------------------------------
class KMArchiveComponent {
  constructor({ container, feedUrl, initialCount = 5, loadMoreStep = 10 }) {
    this.container = container;
    this.feedUrl = feedUrl;
    this.initialCount = initialCount;
    this.loadMoreStep = loadMoreStep;
    this.allEpisodes = [];
    this.visibleCount = initialCount;
  }

  async init() {
    this.container.innerHTML = `
      <section class="km-archive" role="region" aria-label="KupMuff audio archive">
        <div class="km-archive__header" role="heading" aria-level="2">
          <div class="km-archive__title">The KupMuff Show — Player</div>
          <div class="km-archive__meta" id="km-archive-meta"></div>
        </div>
        <div class="km-archive__player">
          <audio id="km-audio" controls preload="none"></audio>
        </div>
        <div class="km-archive__episodes">
          <div class="km-episodes__title">Episodes</div>
          <div class="km-episodes__list" id="km-episodes" role="list"></div>
          <button class="km-btn" id="km-load-more" type="button" aria-label="Load more episodes">Load 10 more</button>
        </div>
      </section>
    `;

    const res = await fetch(this.feedUrl, { cache: "no-store" });
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    if (xml.querySelector("parsererror")) {
      console.error("RSS parse error", xml.querySelector("parsererror")?.textContent);
      this.container.querySelector(".km-archive").insertAdjacentHTML("beforeend",
        `<p class="km-error">Sorry, we couldn't read the feed right now.</p>`);
      return;
    }

    this.allEpisodes = parseRSS(xml);
    if (!this.allEpisodes.length) {
      this.container.querySelector(".km-archive").insertAdjacentHTML("beforeend",
        `<p class="km-error">No playable episodes found.</p>`);
      return;
    }

    this.allEpisodes.forEach(ep => ep.isoDate = toISODate(ep.pubDate));
    this.allEpisodes.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

    this.audioEl = this.container.querySelector("#km-audio");
    this.listEl = this.container.querySelector("#km-episodes");
    this.headerEl = this.container.querySelector("#km-archive-meta");

    this.loadIntoPlayer(this.allEpisodes[0]);
    this.renderList();

    this.container.querySelector("#km-load-more").addEventListener("click", () => {
      this.visibleCount = Math.min(this.allEpisodes.length, this.visibleCount + this.loadMoreStep);
      this.renderList();
    });
  }

  loadIntoPlayer(ep) {
    this.audioEl.src = ep.audioUrl;
    this.audioEl.setAttribute("aria-label", `Now playing: ${ep.title}`);
    this.headerEl.innerHTML = `
      <div class="km-nowplaying">
        <span class="km-pill">Now Playing</span>
        <span class="km-ep-title">${sanitizeHTML(ep.title)}</span>
        <span class="km-ep-date">• ${humanDate(ep.isoDate)}</span>
      </div>
    `;
  }

  renderList() {
    const items = this.allEpisodes.slice(0, this.visibleCount);
    this.listEl.innerHTML = items.map((ep, idx) => {
      const safeTitle = sanitizeHTML(ep.title);
      const active = (idx === 0) ? " km-ep--active" : "";
      return `
        <button class="km-ep${active}" role="listitem" data-idx="${idx}" aria-label="Play ${safeTitle}">
          <div class="km-ep__title">${safeTitle}</div>
          <div class="km-ep__meta">${humanDate(ep.isoDate)}</div>
        </button>
      `;
    }).join("");

    const loadBtn = this.container.querySelector("#km-load-more");
    loadBtn.style.display = (this.visibleCount >= this.allEpisodes.length) ? "none" : "inline-flex";

    this.listEl.querySelectorAll(".km-ep").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-idx"));
        const ep = this.allEpisodes[i];
        this.loadIntoPlayer(ep);
        this.listEl.querySelectorAll(".km-ep").forEach(el => el.classList.remove("km-ep--active"));
        btn.classList.add("km-ep--active");
        btn.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    });
  }
}

// --- Public API ------------------------------------------------------------
function ensureAnchor(anchorSelector) {
  let node = document.querySelector(anchorSelector);
  if (!node) {
    node = document.createElement("div");
    node.id = anchorSelector.replace("#", "");
    document.body.appendChild(node);
  }
  return node;
}

const KMArchivePlayer = {
  renderAt: async function(anchorSelector = "#archive-player-anchor", feedUrl = "/assets/feeds/KupMuff/RSS-KupMuff.xml", options = {}) {
    const anchor = ensureAnchor(anchorSelector);
    const container = document.createElement("div");
    anchor.replaceWith(container);
    container.id = anchorSelector.replace("#", "");
    const comp = new KMArchiveComponent({
      container,
      feedUrl,
      initialCount: options.initialCount ?? 5,
      loadMoreStep: options.loadMoreStep ?? 10
    });
    await comp.init();
  },

  attachToLogo: function(logoSelector = "#logo-kupmuff", anchorSelector = "#archive-player-anchor", feedUrl = "/assets/feeds/KupMuff/RSS-KupMuff.xml") {
    const el = document.querySelector(logoSelector);
    if (!el) return;
    el.addEventListener("click", async (e) => {
      if (e) e.preventDefault();
      await KMArchivePlayer.renderAt(anchorSelector, feedUrl);
      document.getElementById(anchorSelector.replace("#",""))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, { passive: false });
  }
};

window.KMArchivePlayer = KMArchivePlayer;

document.addEventListener("DOMContentLoaded", () => {
  KMArchivePlayer.attachToLogo("#logo-kupmuff", "#archive-player-anchor", "/assets/feeds/KupMuff/RSS-KupMuff.xml");
});