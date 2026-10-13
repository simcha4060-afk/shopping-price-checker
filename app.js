// כתובות ה-Webhooks ב-n8n
const UPLOAD_URL = "https://sish4747.app.n8n.cloud/webhook/f799be46-abc5-415d-a556-eb1575457ea4";
const GET_PRODUCTS_URL = "https://sish4747.app.n8n.cloud/webhook/get-products";

// שמירת הנתונים המאוגדים בזיכרון לשימוש בחיפוש ופופאפ
let aggregatedProducts = {};

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
});

// 1. העלאת תמונת קבלה ל-n8n
async function uploadReceipt(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusElement = document.getElementById("uploadStatus");
  statusElement.innerText = "מעלה ומפענח קבלה...";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      statusElement.innerText = "הקבלה פוענחה ונשמרה בהצלחה! ✅";
      setTimeout(loadProducts, 1500);
    } else {
      statusElement.innerText = "שגיאה בפענוח הקבלה ❌";
    }
  } catch (err) {
    console.error(err);
    statusElement.innerText = "שגיאה בתקשורת מול השרת";
  }
}

// 2. טעינת הנתונים מ-Google Sheets דרך n8n
async function loadProducts() {
  const productsList = document.getElementById("productsList");
  if (!productsList) return;

  productsList.innerHTML = "<p style='text-align:center; color:#666;'>טוען נתונים...</p>";

  try {
    const response = await fetch(GET_PRODUCTS_URL);
    if (!response.ok) throw new Error("שגיאה בטעינת הנתונים");

    const rawData = await response.json();

    let items = [];
    if (Array.isArray(rawData)) {
      if (rawData.length > 0 && rawData[0].data && Array.isArray(rawData[0].data)) {
        items = rawData[0].data;
      } else {
        items = rawData;
      }
    } else if (rawData && typeof rawData === "object") {
      if (Array.isArray(rawData.data)) items = rawData.data;
      else if (Array.isArray(rawData.items)) items = rawData.items;
      else items = [rawData];
    }

    processAndRenderProducts(items);
  } catch (err) {
    console.error(err);
    productsList.innerHTML = "<p style='text-align:center; color:#dc3545;'>לא ניתן לטעון את רשימת המוצרים</p>";
  }
}

// 3. איגוד מוצרים זהים והצגתם ברשימה
function processAndRenderProducts(items) {
  const productsList = document.getElementById("productsList");
  productsList.innerHTML = "";

  aggregatedProducts = {};

  items.forEach(item => {
    const data = item.json ? item.json : item;

    const store = data["שם החנות"] || data.store || "-";
    const date = data["תאריך"] || data.date || "";
    const rawProductName = data["שם המוצר"] || data.product_name || "";
    const price = parseFloat(data["מחיר המוצר"] || data["מחיר"] || data.price);

    if (!rawProductName || rawProductName === "empty" || isNaN(price)) return;

    // מפתח איחוד נקי לפי שם המוצר
    const key = rawProductName.trim();

    if (!aggregatedProducts[key]) {
      aggregatedProducts[key] = {
        name: key,
        latestPrice: price,
        latestStore: store,
        latestDate: date,
        history: []
      };
    }

    const currentGroup = aggregatedProducts[key];
    currentGroup.history.push({ store, date, price });

    // עדכון למחיר והתאריך העדכניים ביותר
    if (!currentGroup.latestDate || new Date(date) >= new Date(currentGroup.latestDate)) {
      currentGroup.latestPrice = price;
      currentGroup.latestStore = store;
      currentGroup.latestDate = date;
    }
  });

  const keys = Object.keys(aggregatedProducts);

  if (keys.length === 0) {
    productsList.innerHTML = "<p style='text-align:center; color:#888;'>לא נמצאו מוצרים תקינים</p>";
    return;
  }

  keys.forEach(key => {
    const product = aggregatedProducts[key];
    const card = document.createElement("div");
    card.className = "product-card";
    card.onclick = () => showPrices(product.name);

    card.innerHTML = `
      <div style="flex: 1; padding-left: 10px;">
        <strong style="font-size: 15px; color: #222;">${product.name}</strong>
        <div style="font-size: 13px; color: #666; margin-top: 2px;">
          ${product.latestStore} <span style="font-size: 12px; color: #888;">(${product.latestDate})</span>
        </div>
      </div>
      <div style="font-weight: bold; color: #28a745; font-size: 17px; white-space: nowrap;">₪${product.latestPrice.toFixed(2)}</div>
    `;

    productsList.appendChild(card);
  });
}

// 4. חיפוש וסינון
function filterProducts() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const cards = document.querySelectorAll(".product-card");

  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(query) ? "flex" : "none";
  });
}

// 5. הצגת פופאפ היסטוריית ומחירי מוצר
function showPrices(productName) {
  const product = aggregatedProducts[productName];
  if (!product) return;

  document.getElementById("modalProductName").innerText = product.name;
  const tbody = document.getElementById("modalPriceTableBody");
  tbody.innerHTML = "";

  // מיון היסטוריית המחירים מהחדש לבישן
  const sortedHistory = [...product.history].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedHistory.forEach(item => {
    const row = `<tr>
      <td>${item.store || '-'}</td>
      <td style="font-weight:bold; color:#28a745;">₪${item.price.toFixed(2)}</td>
      <td>${item.date || '-'}</td>
    </tr>`;
    tbody.innerHTML += row;
  });

  document.getElementById("priceModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("priceModal").style.display = "none";
}
