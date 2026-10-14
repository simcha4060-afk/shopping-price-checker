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
    const error = makeElement("p", `שגיאה בטעינת מוצרים: ${err.message}`);
    error.style.color = "#dc3545";

    const retry = makeElement("button", "🔄 נסה לטעון שוב");
    retry.type = "button";
    retry.style.cssText = "background:#2563eb; color:white; border:0; padding:10px 18px; border-radius:8px; cursor:pointer;";
    retry.onclick = loadProducts;

    productsList.append(error, retry);
  }
}

// ======================================
// איגוד מוצרים זהים
// ======================================

function processAndRenderProducts(items) {
  aggregatedProducts = {};

  items.forEach(item => {
    const data = getItemData(item);
    const rowNumber = data.row_number ?? null;
    const store = data["שם החנות"] || data.store || "-";
    const date = data["תאריך"] || data.date || "";
    const productName = String(data["שם המוצר"] || data.product_name || "").trim();
    const price = parsePrice(data["מחיר המוצר"] ?? data["מחיר"] ?? data.price);

    if (!productName || productName.toLowerCase() === "empty" || !Number.isFinite(price)) {
      return;
    }

    const category = normalizeCategory(productName, data["מחלקה"] || data.category);
    const key = productName;

    if (!aggregatedProducts[key]) {
      aggregatedProducts[key] = {
        name: productName,
        latestPrice: price,
        latestStore: store,
        latestDate: date,
        category,
        history: []
      };
    }

    const product = aggregatedProducts[key];
    product.history.push({ rowNumber, store, date, price, rawProductName: productName, category });

    const newDate = Date.parse(date);
    const oldDate = Date.parse(product.latestDate);

    if (!product.latestDate || (Number.isFinite(newDate) && (!Number.isFinite(oldDate) || newDate >= oldDate))) {
      product.latestPrice = price;
      product.latestStore = store;
      product.latestDate = date;
      product.category = category;
    }
  });

  renderProductsGrid();
}

// ======================================
// הצגת המוצרים באתר
// ======================================

function renderProductsGrid() {
  const productsList = document.getElementById("productsList");
  if (!productsList) return;

  productsList.replaceChildren();
  let count = 0;

  Object.values(aggregatedProducts).forEach(product => {
    if (activeCategory !== "הכל" && product.category !== activeCategory) {
      return;
    }

    count++;
    const card = makeElement("div", undefined, "product-card");
    card.dataset.category = product.category;
    card.style.cursor = "pointer";
    card.onclick = () => showPrices(product.name);

    const info = document.createElement("div");
    info.style.flex = "1";

    const name = makeElement("strong", product.name, "product-title");
    name.style.cssText = "font-size:15px; color:#1e293b;";

    const details = makeElement("div", `${product.latestStore} (${product.latestDate})`);
    details.style.cssText = "font-size:12px; color:#64748b; margin-top:3px;";

    const category = makeElement("span", product.category, "category-tag");
    info.append(name, details, category);

    const price = makeElement("div", formatPrice(product.latestPrice));
    price.style.cssText = "font-weight:700; color:#16a34a; font-size:16px;";

    card.append(info, price);
    productsList.appendChild(card);
  });

  if (count === 0) {
    const empty = makeElement("p", "אין מוצרים במחלקה זו");
    empty.style.cssText = "text-align:center; color:#888; padding:20px;";
    productsList.appendChild(empty);
  }

  filterProducts();
}

// ======================================
// הצגת היסטוריית מחירים
// ======================================

function showPrices(productName) {
  const product = aggregatedProducts[productName];
  if (!product) return;

  cancelEdit();

  const title = document.getElementById("modalProductName");
  const tbody = document.getElementById("modalPriceTableBody");
  const modal = document.getElementById("priceModal");
  if (!tbody || !modal) return;

  if (title) title.textContent = product.name;
  tbody.replaceChildren();

  const history = [...product.history].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));

  history.forEach(item => {
    const tr = document.createElement("tr");

    const values = [
      item.store || "-",
      formatPrice(item.price),
      item.date || "-",
      item.category || "שונות"
    ];

    values.forEach(value => {
      const td = makeElement("td", value);
      tr.appendChild(td);
    });

    const actions = document.createElement("td");
    actions.style.whiteSpace = "nowrap";

    const edit = makeElement("button", "✏️");
    edit.type = "button";
    edit.onclick = () => openEditForm(item.rowNumber, item.store, item.rawProductName, item.price, item.date, item.category);

    const remove = makeElement("button", "🗑️");
    remove.type = "button";
    remove.onclick = () => deleteRow(item.rowNumber);

    actions.append(edit, remove);
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });

  modal.style.display = "flex";
}

// ======================================
// עריכת מוצר
// ======================================

function openEditForm(rowNumber, store, productName, price, date, category) {
  document.getElementById("editRowNumber").value = rowNumber ?? "";
  document.getElementById("editStore").value = store || "";
  document.getElementById("editProductName").value = productName || "";
  document.getElementById("editPrice").value = price;
  document.getElementById("editDate").value = date || "";

  const categorySelect = document.getElementById("editCategory");
  if (categorySelect) {
    categorySelect.value = category || "שונות";
  }

  document.getElementById("editFormContainer").style.display = "block";
}

function cancelEdit() {
  const form = document.getElementById("editFormContainer");
  if (form) {
    form.style.display = "none";
  }
}

async function saveEdit() {
  const rowNumber = document.getElementById("editRowNumber").value;
  const store = document.getElementById("editStore").value;
  const productName = document.getElementById("editProductName").value;
  const price = parsePrice(document.getElementById("editPrice").value);
  const date = document.getElementById("editDate").value;
  const category = document.getElementById("editCategory").value;

  if (!rowNumber || rowNumber === "null") {
    alert("שגיאה בזיהוי מספר השורה");
    return;
  }

  try {
    const response = await fetch(UPDATE_PRODUCT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(ACTION_TIMEOUT),
      body: JSON.stringify({
        row_number: Number.parseInt(rowNumber, 10),
        store,
        product_name: productName,
        price,
        date,
        category
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    alert("המוצר עודכן בהצלחה ✅");
    closeModal();
    await loadProducts(); // טוען מחדש מיד את הנתונים ומעדכן את המסך

  } catch (err) {
    console.error("Update error:", err);
    alert("שגיאה בעדכון המוצר");
  }
}

// ======================================
// מחיקת מוצר
// ======================================

async function deleteRow(rowNumber) {
  if (rowNumber == null || rowNumber === "null" || rowNumber === "") {
    alert("לא ניתן לזהות את מספר השורה");
    return;
  }

  if (!confirm("למחוק את הרכישה הזאת?")) return;

  try {
    const response = await fetch(DELETE_PRODUCT_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(ACTION_TIMEOUT),
      body: JSON.stringify({
        row_number: Number.parseInt(rowNumber, 10)
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    alert("המוצר נמחק בהצלחה ✅");
    closeModal();
    await loadProducts(); // טוען מחדש מיד את הנתונים ומעדכן את המסך

  } catch (err) {
    console.error("Delete error:", err);
    alert("שגיאה במחיקת המוצר");
  }
}

// ======================================
// השוואת סל מחירים בין חנויות
// ======================================

function calculateRecommendation(items) {
  const container = document.getElementById("recommendationBox");
  if (!container) return;

  container.replaceChildren();
  const productsByStore = new Map();

  items.forEach(item => {
    const data = getItemData(item);
    const store = String(data["שם החנות"] || data.store || "").trim();
    const productName = String(data["שם המוצר"] || data.product_name || "").trim();
    const price = parsePrice(data["מחיר המוצר"] ?? data["מחיר"] ?? data.price);

    if (!store || !productName || !Number.isFinite(price)) return;

    if (!productsByStore.has(productName)) {
      productsByStore.set(productName, new Map());
    }
    productsByStore.get(productName).set(store, price);
  });

  const overlappingProducts = [...productsByStore.entries()].filter(([, stores]) => stores.size >= 2);

  if (overlappingProducts.length === 0) {
    container.textContent = "💡 השוואת סל: עדיין אין מוצרים זהים שנרכשו בחנויות שונות.";
    return;
  }

  const allStores = new Set();
  overlappingProducts.forEach(([, stores]) => {
    stores.forEach((price, store) => allStores.add(store));
  });

  const fullBaskets = [];
  allStores.forEach(store => {
    const prices = overlappingProducts.map(([, stores]) => stores.get(store));
    if (prices.every(price => price !== undefined)) {
      const total = prices.reduce((sum, price) => sum + price, 0);
      fullBaskets.push({ store, total });
    }
  });

  const title = makeElement("strong", `💡 השוואת סל - ${overlappingProducts.length} מוצרים חופפים`);
  container.appendChild(title);

  if (fullBaskets.length < 2) {
    const info = makeElement("p", "נמצאו מוצרים חופפים, אך אין לפחות שתי חנויות עם כל המוצרים האלה.");
    container.appendChild(info);
    return;
  }

  fullBaskets.sort((a, b) => a.total - b.total);
  const cheapest = fullBaskets[0];

  fullBaskets.forEach((result, index) => {
    const line = makeElement("p", `${index === 0 ? "🏆 " : ""}${result.store}: ${formatPrice(result.total)}`);
    container.appendChild(line);
  });

  const mostExpensive = fullBaskets[fullBaskets.length - 1];
  const savings = mostExpensive.total - cheapest.total;

  if (savings > 0) {
    const savingsLine = makeElement("p", `חיסכון אפשרי בסל המשותף: ${formatPrice(savings)}`);
    savingsLine.style.cssText = "color:#16a34a; font-weight:bold;";
    container.appendChild(savingsLine);
  }
}

// ======================================
// סגירת חלון מוצר
// ======================================

function closeModal() {
  const modal = document.getElementById("priceModal");
  if (modal) {
    modal.style.display = "none";
  }
  cancelEdit();
}
