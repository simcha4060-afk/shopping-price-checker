// כתובות ה-Webhooks ב-n8n
const UPLOAD_URL = "https://sish4747.app.n8n.cloud/webhook/f799be46-abc5-415d-a556-eb1575457ea4";
const GET_PRODUCTS_URL = "https://sish4747.app.n8n.cloud/webhook/get-products";

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
    console.log("נתונים שהתקבלו מ-n8n:", rawData);

    let items = [];

    // חילוץ המערך מכל פורמט ש-n8n מחזיר
    if (Array.isArray(rawData)) {
      if (rawData.length > 0 && rawData[0].data && Array.isArray(rawData[0].data)) {
        items = rawData[0].data; // פורמט של Aggregate
      } else {
        items = rawData;
      }
    } else if (rawData && typeof rawData === "object") {
      if (Array.isArray(rawData.data)) items = rawData.data;
      else if (Array.isArray(rawData.items)) items = rawData.items;
      else items = [rawData];
    }

    renderProducts(items);
  } catch (err) {
    console.error(err);
    productsList.innerHTML = "<p style='text-align:center; color:#dc3545;'>לא ניתן לטעון את רשימת המוצרים</p>";
  }
}

// 3. הצגת המוצרים ברשימה
function renderProducts(items) {
  const productsList = document.getElementById("productsList");
  productsList.innerHTML = "";

  if (!items || items.length === 0) {
    productsList.innerHTML = "<p style='text-align:center; color:#888;'>לא נמצאו מוצרים במערכת</p>";
    return;
  }

  let count = 0;

  items.forEach(item => {
    const data = item.json ? item.json : item;

    const store = data["שם החנות"] || data.store || "-";
    const date = data["תאריך"] || data.date || "";
    const productName = data["שם המוצר"] || data.product_name || "";
    const price = data["מחיר המוצר"] || data["מחיר"] || data.price || "";

    if (!productName || productName === "empty") return;

    count++;

    const card = document.createElement("div");
    card.className = "product-card";
    
    card.innerHTML = `
      <div style="flex: 1; padding-left: 10px;">
        <strong style="font-size: 15px; color: #222;">${productName}</strong>
        <div style="font-size: 13px; color: #666; margin-top: 2px;">
          ${store} <span style="font-size: 12px; color: #888;">${date ? '(' + date + ')' : ''}</span>
        </div>
      </div>
      <div style="font-weight: bold; color: #28a745; font-size: 17px; white-space: nowrap;">${price ? '₪' + price : ''}</div>
    `;

    productsList.appendChild(card);
  });

  if (count === 0) {
    productsList.innerHTML = "<p style='text-align:center; color:#888;'>לא נמצאו מוצרים תקינים</p>";
  }
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
