const STORAGE_KEY = "rumi-catalog-v1";

const palettes = [
  "linear-gradient(145deg, #67623e, #25251b 72%)",
  "linear-gradient(145deg, #8b4937, #30201e 72%)",
  "linear-gradient(145deg, #435e5a, #1d2727 72%)",
  "linear-gradient(145deg, #575076, #24202f 72%)",
  "linear-gradient(145deg, #947145, #33281e 72%)",
  "linear-gradient(145deg, #49627c, #1c2731 72%)",
  "linear-gradient(145deg, #8a5368, #30212a 72%)",
  "linear-gradient(145deg, #627341, #24281d 72%)",
];

const grid = document.querySelector("#catalog-grid");
const searchInput = document.querySelector("#search");
const sortSelect = document.querySelector("#sort");
const emptyState = document.querySelector("#empty-state");
const fileInput = document.querySelector("#file-input");
const toast = document.querySelector("#toast");
const detailsDialog = document.querySelector("#details-dialog");
let activeFilter = "all";
let items = loadItems();
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 4500);
}

function loadItems() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [normalizeItem({
        title: "Smurfs",
        type: "movie",
        year: "2025",
        genre: "Animation, Adventure",
        description: "Smurfette leads the Smurfs on a mission to rescue Papa Smurf.",
      })];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Saved catalog has an invalid format.");
    return parsed.map(normalizeItem);
  } catch (error) {
    showToast(`Could not load your saved catalog: ${error.message}`);
    return [];
  }
}

function normalizeItem(item, index = 0) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`Item ${index + 1} must be an object.`);
  }
  const title = String(item.title ?? "").trim();
  const rawType = String(item.type ?? item.category ?? "").trim().toLowerCase();
  const type = ["movie", "movies", "film", "films"].includes(rawType) ? "movie"
    : ["game", "games", "video game", "video games"].includes(rawType) ? "game"
      : "";
  if (!title) throw new Error(`Item ${index + 1} is missing a title.`);
  if (!type) throw new Error(`Item ${index + 1} needs a type of "movie" or "game".`);

  const yearValue = String(item.year ?? "").trim();
  const year = yearValue && /^\d{4}$/.test(yearValue) ? yearValue : "";
  const url = String(item.url ?? item.link ?? "").trim();
  if (url && !/^https?:\/\//i.test(url)) {
    throw new Error(`"${title}" has a link that must start with http:// or https://.`);
  }
  const cover = String(item.cover ?? item.image ?? "").trim();
  if (cover && !/^https?:\/\//i.test(cover)) {
    throw new Error(`"${title}" has a cover image URL that must start with http:// or https://.`);
  }
  return {
    title,
    type,
    year,
    genre: String(item.genre ?? item.genres ?? "").trim(),
    description: String(item.description ?? "").trim(),
    cover,
    url,
  };
}

function saveItems(nextItems) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    items = nextItems;
    render();
    return true;
  } catch (error) {
    showToast(`Could not save your catalog in this browser: ${error.message}`);
    return false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function posterMarkup(item) {
  if (item.cover) {
    return `<img src="${escapeHtml(item.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  }
  return `<span class="poster-letter" aria-hidden="true">${escapeHtml(item.title.charAt(0).toUpperCase())}</span>`;
}

function renderCard(item, index) {
  const color = palettes[index % palettes.length];
  return `
    <article class="catalog-card">
      <button class="card-poster" type="button" data-details="${index}" style="--poster-bg:${color}" aria-label="View details for ${escapeHtml(item.title)}">
        <span class="poster-art">${posterMarkup(item)}</span>
        <span class="card-type">${item.type === "movie" ? "Movie" : "Game"}</span>
        <span class="card-open" aria-hidden="true">↗</span>
      </button>
      <div class="card-info">
        <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
        ${item.year ? `<span class="card-year">${escapeHtml(item.year)}</span>` : ""}
      </div>
      ${item.genre ? `<p class="card-genre">${escapeHtml(item.genre)}</p>` : ""}
    </article>`;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const counts = {
    all: items.length,
    movie: items.filter((item) => item.type === "movie").length,
    game: items.filter((item) => item.type === "game").length,
  };
  document.querySelector("#all-count").textContent = counts.all;
  document.querySelector("#movie-count").textContent = counts.movie;
  document.querySelector("#game-count").textContent = counts.game;
  document.querySelector("#catalog-count").textContent = `${items.length} ${items.length === 1 ? "title" : "titles"}`;

  const matching = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => activeFilter === "all" || item.type === activeFilter)
    .filter(({ item }) => `${item.title} ${item.type} ${item.genre} ${item.year} ${item.description}`.toLowerCase().includes(query));
  const sort = sortSelect.value;
  if (sort === "title") matching.sort((a, b) => a.item.title.localeCompare(b.item.title));
  if (sort === "year-new") matching.sort((a, b) => (Number(b.item.year) || 0) - (Number(a.item.year) || 0));
  if (sort === "year-old") matching.sort((a, b) => (Number(a.item.year) || Infinity) - (Number(b.item.year) || Infinity));

  grid.innerHTML = matching.map(({ item, index }) => renderCard(item, index)).join("");
  const hasItems = items.length > 0;
  emptyState.hidden = matching.length > 0;
  grid.hidden = matching.length === 0;
  document.querySelector("#empty-title").textContent = hasItems ? "No titles found." : "Your collection starts here.";
  document.querySelector("#empty-description").textContent = hasItems
    ? "Try another search or switch to a different category."
    : "Import your movie and game list to make this space yours.";
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    const isActive = tab.dataset.filter === activeFilter;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });
}

function openDetails(index) {
  const item = items[index];
  if (!item) return;
  const color = palettes[index % palettes.length];
  const dialogArt = document.querySelector("#dialog-art");
  dialogArt.style.setProperty("--poster-bg", color);
  dialogArt.innerHTML = posterMarkup(item);
  document.querySelector("#dialog-meta").textContent = `${item.type === "movie" ? "Movie" : "Game"}${item.year ? ` · ${item.year}` : ""}${item.genre ? ` · ${item.genre}` : ""}`;
  document.querySelector("#dialog-title").textContent = item.title;
  document.querySelector("#dialog-description").textContent = item.description || "No description yet.";
  const link = document.querySelector("#dialog-link");
  link.hidden = !item.url;
  link.href = item.url || "#";
  detailsDialog.showModal();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (quoted) {
      if (character === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) throw new Error("CSV must include a header row and at least one title.");

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  if (!headers.includes("title") || (!headers.includes("type") && !headers.includes("category"))) {
    throw new Error('CSV needs "title" and "type" columns.');
  }
  return rows.slice(1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? ""]),
  ));
}

function parseImport(text, extension) {
  if (extension === "csv") return parseCsv(text);
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  throw new Error('JSON must be an array of titles or an object with an "items" array.');
}

document.querySelectorAll("[data-import]").forEach((button) => {
  button.addEventListener("click", () => fileInput.click());
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    const extension = file.name.split(".").pop().toLowerCase();
    if (!["csv", "json"].includes(extension)) throw new Error("Choose a .csv or .json file.");
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const imported = parseImport(text, extension);
    if (!imported.length) throw new Error("The file doesn't contain any titles.");
    const normalized = imported.map((item, index) => normalizeItem(item, index));
    if (saveItems(normalized)) {
      showToast(`Imported ${normalized.length} ${normalized.length === 1 ? "title" : "titles"}.`);
    }
  } catch (error) {
    showToast(`Import failed: ${error.message}`);
  } finally {
    fileInput.value = "";
  }
});

document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeFilter = tab.dataset.filter;
    render();
  });
});

document.querySelectorAll("[data-nav-filter]").forEach((link) => {
  link.addEventListener("click", () => {
    activeFilter = link.dataset.navFilter;
    render();
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("active", item === link));
  });
});

document.querySelector(".main-nav .nav-link:first-child").addEventListener("click", () => {
  activeFilter = "all";
  render();
  document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("active", item.dataset.navFilter === undefined));
});

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);
grid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-details]");
  if (card) openDetails(Number(card.dataset.details));
});
document.querySelector(".dialog-close").addEventListener("click", () => detailsDialog.close());
detailsDialog.addEventListener("click", (event) => {
  if (event.target === detailsDialog) detailsDialog.close();
});
document.querySelector("#download-template").addEventListener("click", () => {
  const csv = "title,type,year,genre,description,cover,url\nExample Movie,movie,2024,Drama,Short description,,https://example.com\nExample Game,game,2023,Adventure,Short description,,https://example.com";
  const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = "rumi-catalog-template.csv";
  link.click();
  URL.revokeObjectURL(blobUrl);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});
document.querySelector("#year").textContent = new Date().getFullYear();

render();
