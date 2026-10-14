
const UPLOAD_URL = "https://sish4747.app.n8n.cloud/webhook/f799be46-abc5-415d-a556-eb1575457ea4";
const GET_PRODUCTS_URL = "https://sish4747.app.n8n.cloud/webhook/get-products";
const DELETE_PRODUCT_URL = "https://sish4747.app.n8n.cloud/webhook/delete-product";
const UPDATE_PRODUCT_URL = "https://sish4747.app.n8n.cloud/webhook/update-product";

let aggregatedProducts = {};
let activeCategory = "הכל";
let lastUploadedFile = null;
let productsLoadRequestId = 0;

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
});

// 1. העלאת תמונת קבלה (מותאם גם לטלפונים)
async function uploadReceipt(event) {
  const file = (event && event.target && event.target.files) ? event.target.files[0] : event;
  if (!file) return;

  lastUploadedFile = file;

  const statusElement = document.getElementById("uploadStatus");
  statusElement.innerHTML = "<span>מעלה ומפענח קבלה... ⏳</span>";

  const formData = new FormData();
  formData.append("file", file, file.name || "receipt.jpg");

  try {
    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      body: formData,
      mode: "cors",
      signal: AbortSignal.timeout(120000)
    });

    if (response.ok) {
      statusElement.innerHTML = "<span style='color: #16a34a;'>הקבלה פוענחה ונשמרה בהצלחה! ✅</span>";
      setTimeout(loadProducts, 1500);
    } else {
      showRetryError("שגיאה בפענוח הקבלה ❌");
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    showRetryError("שגיאה בתקשורת מול השרת ❌");
  }
}

function showRetryError(message) {
  const statusElement = document.getElementById("uploadStatus");
  statusElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 5px;">
      <span style="color: #dc3545; font-weight: bold;">${message}</span>
      <button onclick="retryUploadReceipt()" style="padding: 6px 12px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold;">
        🔄 נסה שוב
      </button>
    </div>
  `;
}

function retryUploadReceipt() {
  if (lastUploadedFile) {
    uploadReceipt(lastUploadedFile);
  } else {
    alert("לא נמצאה קבלה קודמת לשליחה חוזרת");
  }
}

// 2. טעינת נתונים מ-n8n - Timeout וטיפול שגיאות לשני האזורים
async function loadProducts() {
  const productsList = document.getElementById("productsList");
  const recommendationBox = document.getElementById("recommendationBox");
  if (!productsList) return;
  const requestId = ++productsLoadRequestId;
  productsList.innerHTML = "<p style='text-align:center;color:#666;'>טוען נתונים...</p>";
  if (recommendationBox) recommendationBox.textContent = "טוען נתוני המלצה...";

  try {
    const response = await fetch(GET_PRODUCTS_URL, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`שגיאת HTTP ${response.status} בטעינת המוצרים`);

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
      throw new Error("מבנה נתונים לא תקין מהשרת");
    }

    processAndRenderProducts(items);
    calculateRecommendation(items);
  } catch (err) {
    if (requestId !== productsLoadRequestId) return;
    console.error("שגיאה בטעינת מוצרים:", err);
    const message = err.name === "TimeoutError" || err.name === "AbortError"
      ? "השרת לא ענה תוך 20 שניות. בדוק את ה-Workflow ב-n8n."
      : `טעינת הנתונים נכשלה: ${err.message || "שגיאת תקשורת"}`;
    productsList.innerHTML = "";
    const p = document.createElement("p");
    p.style.cssText = "text-align:center;color:#dc3545;";
    p.textContent = message;
    productsList.appendChild(p);
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "🔄 נסה לטעון שוב";
    retry.style.cssText = "display:block;margin:12px auto;padding:10px;border:0;border-radius:8px;background:#2563eb;color:white;cursor:pointer;";
    retry.onclick = loadProducts;
    productsList.appendChild(retry);
    if (recommendationBox) {
      recommendationBox.textContent = "לא ניתן לחשב המלצת סל כי נתוני המוצרים לא נטענו.";
    }
  }
}

// 3. איגוד מוצרים זהים
function processAndRenderProducts(items) {
  aggregatedProducts = {};

  items.forEach(item => {
    const data = item && item.json ? item.json : (item || {});

    const rowNumber = data.row_number ?? item?.row_number ?? null;
    const store = data["שם החנות"] || data.store || "-";
    const date = data["תאריך"] || data.date || "";
    const rawProductName = String(data["שם המוצר"] || data.product_name || "");
    const price = parseFloat(data["מחיר המוצר"] ?? data["מחיר"] ?? data.price);
    const category = data["מחלקה"] || data.category || "שונות";

    if (!rawProductName || rawProductName === "empty" || isNaN(price)) return;

    const key = rawProductName.trim();
    if (!key) return;

    if (!aggregatedProducts[key]) {
      aggregatedProducts[key] = {
        name: key,
        latestPrice: price,
        latestStore: store,
        latestDate: date,
        category: category,
        history: []
      };
    }

    const currentGroup = aggregatedProducts[key];
    currentGroup.history.push({ rowNumber, store, date, price, rawProductName, category });

    if (!currentGroup.latestDate || new Date(date) >= new Date(currentGroup.latestDate)) {
      currentGroup.latestPrice = price;
      currentGroup.latestStore = store;
      currentGroup.latestDate = date;
      currentGroup.category = category;
    }
  });

  renderProductsGrid();
}

// 4. הצגת מוצרים לפי מחלקה
function renderProductsGrid() {
  const productsList = document.getElementById("productsList");
  productsList.innerHTML = "";

  const keys = Object.keys(aggregatedProducts);
  let count = 0;

  keys.forEach(key => {
    const product = aggregatedProducts[key];

    if (activeCategory !== "הכל" && product.category !== activeCategory) {
      return;
    }

    count++;

    const card = document.createElement("div");
    card.className = "product-card";
    card.setAttribute("data-category", product.category);
    card.onclick = () => showPrices(product.name);

    card.innerHTML = `
      <div style="flex: 1;">
        <strong class="product-title" style="font-size: 15px; color: #1e293b;">${product.name}</strong>
        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
          ${product.latestStore} <span style="color: #94a3b8;">(${product.latestDate})</span>
        </div>
        <span class="category-tag">${product.category}</span>
      </div>
      <div style="font-weight: 700; color: #16a34a; font-size: 16px;">₪${product.latestPrice.toFixed(2)}</div>
    `;

    productsList.appendChild(card);
  });

  if (count === 0) {
    productsList.innerHTML = "<p style='text-align:center; color:#888; padding:20px;'>אין מוצרים במחלקה זו</p>";
  }

  filterProducts();
}

function selectCategory(category) {
  activeCategory = category;

  const buttons = document.querySelectorAll(".cat-btn");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.innerText.includes(category) || (category === "הכל" && btn.innerText.includes("הכל")));
  });

  renderProductsGrid();
}

// 5. הצגת פופאפ היסטוריית מחירים
function showPrices(productName) {
  const product = aggregatedProducts[productName];
  if (!product) return;

  cancelEdit();

  document.getElementById("modalProductName").innerText = product.name;
  const tbody = document.getElementById("modalPriceTableBody");
  tbody.innerHTML = "";

  const sortedHistory = [...product.history].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedHistory.forEach(item => {
    const tr = document.createElement("tr");

    // Build cells without injecting product names into inline JavaScript/HTML.
    [item.store || "-", `₪${item.price.toFixed(2)}`, item.date || "-", item.category || "שונות"].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      tr.appendChild(cell);
    });
    const actions = document.createElement("td");
    actions.style.whiteSpace = "nowrap";
    const edit = document.createElement("button");
    edit.textContent = "✏️";
    edit.title = "עריכה";
    edit.onclick = () => openEditForm(item.rowNumber, item.store, item.rawProductName, item.price, item.date, item.category);
    const del = document.createElement("button");
    del.textContent = "🗑️";
    del.title = "מחיקה";
    del.onclick = () => deleteRow(item.rowNumber);
    actions.append(edit, del);
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });

  document.getElementById("priceModal").style.display = "flex";
}

// 6. פתיחת טופס עריכה
function openEditForm(rowNumber, store, productName, price, date, category) {
  document.getElementById("editRowNumber").value = rowNumber;
  document.getElementById("editStore").value = store;
  document.getElementById("editProductName").value = productName;
  document.getElementById("editPrice").value = price;
  document.getElementById("editDate").value = date;

  const catSelect = document.getElementById("editCategory");
  if (catSelect) catSelect.value = category || "שונות";

  document.getElementById("editFormContainer").style.display = "block";
}

function cancelEdit() {
  document.getElementById("editFormContainer").style.display = "none";
}

// 7. שמירת עריכה ושליחה ל-n8n
async function saveEdit() {
  const rowNumber = document.getElementById("editRowNumber").value;
  const store = document.getElementById("editStore").value;
  const productName = document.getElementById("editProductName").value;
  const price = parseFloat(document.getElementById("editPrice").value);
  const date = document.getElementById("editDate").value;
  const category = document.getElementById("editCategory").value;

  if (!rowNumber || rowNumber === 'null') {
    alert("שגיאה בזיהוי שורת המוצר");
    return;
  }

  try {
    const response = await fetch(UPDATE_PRODUCT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        row_number: parseInt(rowNumber),
        store: store,
        product_name: productName,
        price: price,
        date: date,
        category: category
      })
    });

    if (response.ok) {
      alert("הנתונים והמחלקה עודכנו בהצלחה! ✅");
      closeModal();
      loadProducts();
    } else {
      alert("שגיאה בעדכון המוצר");
    }
  } catch (err) {
    console.error(err);
    alert("שגיאה בתקשורת מול השרת");
  }
}

// 8. מחיקת שורה
async function deleteRow(rowNumber) {
  if (!rowNumber || rowNumber === 'null') {
    alert("לא ניתן לזהות את מספר השורה למחיקה");
    return;
  }

  if (!confirm("האם אתה בטוח שברצונך למחוק רכישה זו?")) return;

  try {
    const response = await fetch(DELETE_PRODUCT_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ row_number: parseInt(rowNumber) })
    });

    if (response.ok) {
      alert("המוצר נמחק בהצלחה! ✅");
      closeModal();
      loadProducts();
    } else {
      alert("שגיאה במחיקת המוצר");
    }
  } catch (err) {
    console.error(err);
    alert("שגיאה בתקשורת מול השרת");
  }
}

// 9. המלצת סל על בסיס מוצרים שנרכשו ביותר מחנות אחת
function calculateRecommendation(items) {
  const container = document.getElementById("recommendationBox");
  if (!container) return;
  const byProduct = new Map();

  items.forEach(item => {
    const data = item && item.json ? item.json : (item || {});
    const store = String(data["שם החנות"] || data.store || "").trim();
    const name = String(data["שם המוצר"] || data.product_name || "").trim();
    const price = parseFloat(data["מחיר המוצר"] ?? data["מחיר"] ?? data.price);
    if (!store || !name || name === "empty" || !Number.isFinite(price)) return;
    if (!byProduct.has(name)) byProduct.set(name, new Map());
    byProduct.get(name).set(store, price);
  });

  const overlapping = [...byProduct].filter(([, stores]) => stores.size >= 2);
  container.innerHTML = "";
  if (!overlapping.length) {
    container.textContent = "💡 השוואת סל: עדיין לא נרכשו מוצרים זהים בחנויות שונות. כאשר יהיו מוצרים חופפים, תוצג כאן השוואה.";
    return;
  }

  // Compare ONLY stores holding all overlapping products: comparable basket totals.
  const stores = [...new Set(overlapping.flatMap(([, prices]) => [...prices.keys()]))];
  const completeBaskets = stores.map(store => ({
    store,
    prices: overlapping.map(([, prices]) => prices.get(store))
  })).filter(({ prices }) => prices.every(price => price !== undefined));

  const title = document.createElement("strong");
  title.textContent = `💡 השוואת סל (${overlapping.length} מוצרים חופפים)`;
  container.appendChild(title);
  const note = document.createElement("p");
  note.style.color = "#64748b";
  note.textContent = `נמצאו ${overlapping.length} מוצרים שנרכשו ביותר מחנות אחת.`;
  container.appendChild(note);

  if (!completeBaskets.length) {
    const info = document.createElement("p");
    info.textContent = "אין חנות שמכילה את כל המוצרים החופפים, ולכן לא ניתן לבצע השוואת סל מלא ואמינה.";
    container.appendChild(info);
    return;
  }

  completeBaskets.map(({ store, prices }) => ({
    store,
    total: prices.reduce((sum, price) => sum + price, 0)
  })).sort((a, b) => a.total - b.total).forEach((result, index) => {
    const line = document.createElement("p");
    line.textContent = `${index === 0 ? "🏆 " : ""}${result.store}: ₪${result.total.toFixed(2)}`;
    container.appendChild(line);
  });
}

// חיפוש טקסט בתוך כרטיסי המוצרים
function filterProducts() {
  const query = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
  const cards = document.querySelectorAll("#productsList .product-card");
  let visible = 0;
  cards.forEach(card => {
    const match = card.textContent.toLowerCase().includes(query);
    card.style.display = match ? "" : "none";
    if (match) visible++;
  });
}

// סגירת חלונית מחירים
function closeModal() {
  const modal = document.getElementById("priceModal");
  if (modal) modal.style.display = "none";
  cancelEdit();
}
