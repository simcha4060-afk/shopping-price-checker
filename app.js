const UPLOAD_URL = "https://sish4747.app.n8n.cloud/webhook/f799be46-abc5-415d-a556-eb1575457ea4";
const GET_PRODUCTS_URL = "https://sish4747.app.n8n.cloud/webhook/get-products";
const DELETE_PRODUCT_URL = "https://sish4747.app.n8n.cloud/webhook/delete-product";
const UPDATE_PRODUCT_URL = "https://sish4747.app.n8n.cloud/webhook/update-product";

// ======================================
// הגדרות כלליות
// ======================================

const LOAD_TIMEOUT = 20000;
const ACTION_TIMEOUT = 30000;
const UPLOAD_TIMEOUT = 120000;

let aggregatedProducts = {};
let activeCategory = "הכל";
let lastUploadedFile = null;
let productsLoadRequestId = 0;
let currentSearch = "";

// ======================================
// מחלקות חדשות - תואם לפרומפט n8n
// ======================================

const CATEGORIES = [
  ["הכל", "🛒"],
  ["פירות וירקות", "🍏"],
  ["חלב וביצים", "🥛"],
  ["לחמים ומאפים", "🍞"],
  ["סלטים ומקרר", "🥗"],
  ["בשר ועופות", "🥩"],
  ["דגים", "🐟"],
  ["רטבים וממרחים", "🥫"],
  ["שימורים", "🥫"],
  ["אורז, פסטה וקטניות", "🌾"],
  ["אפייה ובישול", "🧂"],
  ["חטיפים וממתקים", "🍫"],
  ["משקאות", "🥤"],
  ["קפואים", "🧊"],
  ["חומרי ניקוי", "🧹"],
  ["טואלטיקה והיגיינה", "🧴"],
  ["חד פעמי", "🍽️"],
  ["שונות", "📦"]
];

const VALID_CATEGORIES = new Set(
  CATEGORIES.map(([name]) => name)
);

// ======================================
// כללי סיווג למוצרים ישנים בלבד
// ======================================

const CATEGORY_RULES = [
  ["שימורים", /רסק עגבניות|טונה בשימורים|טונה בקופס|תירס בשימורים|תירס בקופס|מלפפון חמוץ|זיתים בקופס|שימורים|עגבניות מרוסקות/],
  ["סלטים ומקרר", /טחינה מוכנה|סלט טחינה|חומוס מוכן|סלט חומוס|סלט חצילים|מטבוחה|סלט כרוב|סלמון מעושן|סלטי צבר|סלטי אחלה|נקניקיות מוכנות/],
  ["רטבים וממרחים", /קטשופ|מיונז|חרדל|טחינה גולמית|טחינה|רוטב|ממרח|פסטו|סחוג|אריסה/],
  ["חלב וביצים", /חלב|גבינ|יוגורט|קוטג|שמנת|חמאה|ביצה|ביצים|מעדן חלב|לבנה/],
  ["לחמים ומאפים", /לחם|חלה|חלות|פיתה|פיתות|לחמני|בגט|טורטיה|קרואסון|בורקס|מאפה טרי/],
  ["דגים", /דגים|דג טרי|דג קפוא|סלמון|אמנון|דניס|מושט|פילה דג|קרפיון|פורל/],
  ["בשר ועופות", /בשר|עוף|עופות|הודו|פרגית|חזה עוף|כרעיים|שניצל עוף|קבב|המבורגר|בקר|נקניק/],
  ["קפואים", /קפוא|גלידה|קרטיב|איגלו סטיק|פיצה קפואה|שניצל תירס/],
  ["פירות וירקות", /תפוח|בננה|מלפפון|עגבניה|עגבנייה|עגבניות|גזר|בצל|תפוח אדמה|בטטה|קישוא|כרוב|חסה|אבוקדו|אגס|תפוז|לימון|ענבים|פומלה|פטרוזיליה|כוסברה|שום טרי|פלפל ירוק|פלפל אדום/],
  ["אורז, פסטה וקטניות", /אורז|פסטה|ספגטי|מקרוני|קוסקוס|בורגול|קינואה|עדשים|שעועית יבשה|פתיתים|אטריות|גריסים/],
  ["אפייה ובישול", /קמח|סוכר|שמן|מלח|פלפל שחור|פפריקה|כורכום|אבקת אפייה|אבקת אפיה|תבלין|קינמון|קורנפלור|שמרים|וניל/],
  ["חטיפים וממתקים", /ביסקוויט|שוקולד|חטיף|וופל|עוגיות|סוכריות|מסטיק|במבה|ביסלי|צ'יפס|צ׳יפס/],
  ["משקאות", /מים מינרל|בקבוק מים|מיץ|קולה|ספרייט|סודה|משקה|שתיה|שתייה|נקטר|קפה|תה שחור|תה ירוק|נס קפה/],
  ["חומרי ניקוי", /אקונומיקה|נוזל כלים|סבון כלים|חומר ניקוי|מרכך כביסה|אבקת כביסה|נוזל כביסה|מסיר שומנים|טבליות למדיח|מטליות ניקוי/],
  ["טואלטיקה והיגיינה", /שמפו|מרכך שיער|דאודורנט|משחת שיניים|מברשת שיניים|סבון גוף|נייר טואלט|מגבונים|טיטולים|חיתולים/],
  ["חד פעמי", /חד פעמי|כוסות|צלחות חד|סכו"ם|סכום חד|מפיות|ניילון נצמד|שקיות אשפה|תבניות אלומיניום|נייר אפייה|קשיות/]
];

// ======================================
// עזרי נתונים
// ======================================

function getItemData(item) {
  if (!item || typeof item !== "object") return {};
  return item.json && typeof item.json === "object" ? item.json : item;
}

function parsePrice(value) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/[₪,\s]/g, "");
  return Number.parseFloat(cleaned);
}

function normalizeCategory(productName, oldCategory) {
  const name = String(productName || "").trim().toLowerCase();
  const existing = String(oldCategory || "").trim();

  if (VALID_CATEGORIES.has(existing) && existing !== "הכל" && existing !== "שונות") {
    return existing;
  }

  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(name)) {
      return category;
    }
  }

  return "שונות";
}

function getCategoryEmoji(category) {
  const entry = CATEGORIES.find(([name]) => name === category);
  return entry ? entry[1] : "📦";
}

function safeText(value) {
  return String(value ?? "");
}

function makeElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) {
    element.textContent = safeText(text);
  }
  if (className) {
    element.className = className;
  }
  return element;
}

function formatPrice(price) {
  return `₪${Number(price).toFixed(2)}`;
}

// ======================================
// התחלת האתר
// ======================================

document.addEventListener("DOMContentLoaded", () => {
  setupCategories();
  setupSearch();
  loadProducts();
});

// ======================================
// יצירת כפתורי מחלקות
// ======================================

function setupCategories() {
  let bar = document.getElementById("categoryBar");

  if (!bar) {
    const oldButton = document.querySelector(".cat-btn");
    if (oldButton && oldButton.parentElement) {
      bar = oldButton.parentElement;
    }
  }

  if (bar) {
    bar.replaceChildren();

    for (const [category, emoji] of CATEGORIES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cat-btn";
      button.textContent = `${emoji} ${category}`;
      button.dataset.category = category;

      button.onclick = () => {
        selectCategory(category);
      };

      if (category === activeCategory) {
        button.classList.add("active");
      }

      bar.appendChild(button);
    }
  }

  const editCategory = document.getElementById("editCategory");
  if (editCategory) {
    editCategory.replaceChildren();

    for (const [category, emoji] of CATEGORIES) {
      if (category === "הכל") continue;
      const option = document.createElement("option");
      option.value = category;
      option.textContent = `${emoji} ${category}`;
      editCategory.appendChild(option);
    }
  }
}

function selectCategory(category) {
  activeCategory = category;

  document.querySelectorAll(".cat-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.category === category);
  });

  renderProductsGrid();
}

// ======================================
// חיפוש מוצרים (לפי שם מוצר בלבד)
// ======================================

function setupSearch() {
  const input = document.getElementById("searchInput") || document.querySelector('input[type="search"]');
  if (!input) return;

  input.addEventListener("input", () => {
    currentSearch = input.value.trim().toLowerCase();
    filterProducts();
  });
}

function filterProducts() {
  const searchInput = document.getElementById("searchInput") || document.querySelector('input[type="search"]');
  if (searchInput) {
    currentSearch = searchInput.value.trim().toLowerCase();
  }

  const cards = document.querySelectorAll("#productsList .product-card");
  let visible = 0;

  cards.forEach(card => {
    const titleElement = card.querySelector(".product-title");
    const productName = titleElement ? titleElement.innerText.toLowerCase() : "";
    const match = productName.includes(currentSearch);

    card.style.display = match ? "flex" : "none";
    if (match) visible++;
  });
}

// ======================================
// העלאת קבלה ל-n8n
// ======================================

async function uploadReceipt(event) {
  const file = event?.target?.files ? event.target.files[0] : event;
  if (!file) return;

  lastUploadedFile = file;
  const statusElement = document.getElementById("uploadStatus");

  if (statusElement) {
    statusElement.textContent = "מעלה ומפענח קבלה... ⏳";
  }

  const formData = new FormData();
  formData.append("file", file, file.name || "receipt.jpg");

  try {
    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      body: formData,
      mode: "cors",
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (statusElement) {
      statusElement.textContent = "הקבלה פוענחה ונשמרה בהצלחה! ✅";
      statusElement.style.color = "#16a34a";
    }

    setTimeout(() => {
      loadProducts();
    }, 1500);

  } catch (err) {
    console.error("Upload error:", err);
    const message = err.name === "TimeoutError" ? "תם זמן ההמתנה לפענוח." : "שגיאה בהעלאת הקבלה";
    showRetryError(message);
  }
}

function showRetryError(message) {
  const statusElement = document.getElementById("uploadStatus");
  if (!statusElement) return;

  statusElement.replaceChildren();
  const text = makeElement("span", message);
  text.style.color = "#dc3545";

  const button = makeElement("button", "🔄 נסה שוב");
  button.type = "button";
  button.style.cssText = "padding:8px 12px; background:#2563eb; color:white; border:0; border-radius:8px; cursor:pointer; margin:8px;";
  button.onclick = retryUploadReceipt;

  statusElement.append(text, button);
}

function retryUploadReceipt() {
  if (lastUploadedFile) {
    if (confirm("האם לשלוח שוב את הקבלה?")) {
      uploadReceipt(lastUploadedFile);
    }
  } else {
    alert("לא נמצאה קבלה לשליחה חוזרת");
  }
}

// ======================================
// טעינת מוצרים מ-n8n
// ======================================

async function loadProducts() {
  const productsList = document.getElementById("productsList");
  const recommendationBox = document.getElementById("recommendationBox");
  if (!productsList) return;

  const requestId = ++productsLoadRequestId;

  productsList.innerHTML = "";
  productsList.appendChild(makeElement("p", "טוען נתונים... ⏳"));

  if (recommendationBox) {
    recommendationBox.textContent = "טוען נתוני המלצה...";
  }

  try {
    const response = await fetch(GET_PRODUCTS_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(LOAD_TIMEOUT)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const rawData = await response.json();
    if (requestId !== productsLoadRequestId) return;

    let items = [];
    if (Array.isArray(rawData)) {
      if (rawData.length > 0 && Array.isArray(rawData[0]?.data)) {
        items = rawData[0].data;
      } else {
        items = rawData;
      }
    } else if (rawData && typeof rawData === "object") {
      if (Array.isArray(rawData.data)) items = rawData.data;
      else if (Array.isArray(rawData.items)) items = rawData.items;
      else items = [rawData];
    } else {
      throw new Error("מבנה נתונים לא תקין");
    }

    processAndRenderProducts(items);
    calculateRecommendation(items);

  } catch (err) {
    if (requestId !== productsLoadRequestId) return;
    console.error("Products loading error:", err);

    productsList.replaceChildren();
    const error = makeElement("
