// כתובת ה-Webhook להעלאת קבלה (POST)
const UPLOAD_URL = "https://sish4747.app.n8n.cloud/webhook/f799be46-abc5-415d-a556-eb1575457ea4";

// כתובת ה-Webhook לקריאת הנתונים מ-Google Sheets (GET)
const GET_PRODUCTS_URL = "https://sish4747.app.n8n.cloud/webhook/get-products";

// טעינת המוצרים מיד עם פתיחת האפליקציה
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
      setTimeout(loadProducts, 1500); // רענון אוטומטי של הרשימה לאחר שמירה
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

    const data = await response.json();
    renderProducts(data);
  } catch (err) {
    console.error(err);
    productsList.innerHTML = "<p style='text-align:center; color:#dc3545;'>לא ניתן שטען את רשימת המוצרים</p>";
  }
}

// 3. הצגת כרטיסי המוצרים בתיבת הרשימה
function renderProducts(items) {
  const productsList = document.getElementById("productsList");
  productsList.innerHTML = "";

  if (!items || items.length === 0) {
    productsList.innerHTML = "<p style='text-align:center; color:#888;'>לא נמצאו מוצרים במערכת</p>";
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "product-card";
    
    // שליפת הנתונים לפי שמות העמודות ב-Google Sheets
    const store = item["שם החנות"] || item.store || "-";
    const date = item["תאריך"] || item.date || "-";
    const total = item["סכום כולל"] || item.total || "-";
    const products = item["פרוט מוצרים"] || item.products || "-";

    card.innerHTML = `
      <div style="flex: 1; padding-left: 10px;">
        <strong style="font-size: 15px; color: #222;">${store}</strong> 
        <span style="font-size: 12px; color: #777;">(${date})</span>
        <div style="font-size: 13px; color: #555; margin-top: 4px; line-height: 1.4;">${products}</div>
      </div>
      <div style="font-weight: bold; color: #28a745; font-size: 17px; white-space: nowrap;">₪${total}</div>
    `;

    productsList.appendChild(card);
  });
}

// 4. סינון מוצרים לפי חיפוש
function filterProducts() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const cards = document.querySelectorAll(".product-card");

  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(query) ? "flex" : "none";
  });
}

// 5. פונקציות חלון פופאפ (Modal)
function showPrices(productName, storePrices) {
  document.getElementById("modalProductName").innerText = productName;
  const tbody = document.getElementById("modalPriceTableBody");
  tbody.innerHTML = "";

  if (Array.isArray(storePrices)) {
    storePrices.forEach(item => {
      const row = `<tr>
        <td>${item.store || '-'}</td>
        <td>${item.price ? item.price + ' ₪' : '-'}</td>
        <td>${item.date || '-'}</td>
      </tr>`;
      tbody.innerHTML += row;
    });
  }

  document.getElementById("priceModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("priceModal").style.display = "none";
}
