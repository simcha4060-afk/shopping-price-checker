const UPLOAD_URL = "https://sish4747.app.n8n.cloud/webhook/f799be46-abc5-415d-a556-eb1575457ea4";
const GET_PRODUCTS_URL = "https://sish4747.app.n8n.cloud/webhook/get-products";
const DELETE_PRODUCT_URL = "https://sish4747.app.n8n.cloud/webhook/delete-product";
const UPDATE_PRODUCT_URL = "https://sish4747.app.n8n.cloud/webhook/update-product";

let aggregatedProducts = {};

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
});

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
    calculateRecommendation(items);
  } catch (err) {
    console.error(err);
    productsList.innerHTML = "<p style='text-align:center; color:#dc3545;'>לא ניתן לטעון את רשימת המוצרים</p>";
  }
}

function processAndRenderProducts(items) {
  const productsList = document.getElementById("productsList");
  productsList.innerHTML = "";

  aggregatedProducts = {};

  items.forEach(item => {
    const data = item.json ? item.json : item;

    const rowNumber = data.row_number || item.row_number || null;
    const store = data["שם החנות"] || data.store || "-";
    const date = data["תאריך"] || data.date || "";
    const rawProductName = data["שם המוצר"] || data.product_name || "";
    const price = parseFloat(data["מחיר המוצר"] || data["מחיר"] || data.price);

    if (!rawProductName || rawProductName === "empty" || isNaN(price)) return;

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
    currentGroup.history.push({ rowNumber, store, date, price, rawProductName });

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
      <div style="flex: 1;">
        <strong style="font-size: 15px; color: #1e293b;">${product.name}</strong>
        <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
          ${product.latestStore} <span style="color: #94a3b8;">(${product.latestDate})</span>
        </div>
      </div>
      <div style="font-weight: 700; color: #16a34a; font-size: 16px;">₪${product.latestPrice.toFixed(2)}</div>
    `;

    productsList.appendChild(card);
  });
}

function showPrices(productName) {
  const product = aggregatedProducts[productName];
  if (!product) return;

  cancelEdit(); // איפוס טופס העריכה אם היה פתוח

  document.getElementById("modalProductName").innerText = product.name;
  const tbody = document.getElementById("modalPriceTableBody");
  tbody.innerHTML = "";

  const sortedHistory = [...product.history].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedHistory.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.store || '-'}</td>
      <td style="font-weight:bold; color:#16a34a;">₪${item.price.toFixed(2)}</td>
      <td>${item.date || '-'}</td>
      <td style="white-space: nowrap;">
        <button onclick="openEditForm('${item.rowNumber}', '${item.store}', '${item.rawProductName}', ${item.price}, '${item.date}')" style="cursor:pointer; background:none; border:none; font-size:16px;">✏️</button>
        <button onclick="deleteRow('${item.rowNumber}')" style="cursor:pointer; background:none; border:none; font-size:16px;">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("priceModal").style.display = "flex";
}

// פתיחת טופס העריכה המרוכז
function openEditForm(rowNumber, store, productName, price, date) {
  document.getElementById("editRowNumber").value = rowNumber;
  document.getElementById("editStore").value = store;
  document.getElementById("editProductName").value = productName;
  document.getElementById("editPrice").value = price;
  document.getElementById("editDate").value = date;

  document.getElementById("editFormContainer").style.display = "block";
}

function cancelEdit() {
  document.getElementById("editFormContainer").style.display = "none";
}

// שמירת העריכה ושליחה ל-n8n
async function saveEdit() {
  const rowNumber = document.getElementById("editRowNumber").value;
  const store = document.getElementById("editStore").value;
  const productName = document.getElementById("editProductName").value;
  const price = parseFloat(document.getElementById("editPrice").value);
  const date = document.getElementById("editDate").value;

  if (!rowNumber || rowNumber === 'null') {
    alert("שגיאה בזיהוי שורת המוצר");
    return;
  }

  try {
    const response = await fetch(UPDATE_PRODUCT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        row_number: parseInt(rowNumber),
        store: store,
        product_name: productName,
        price: price,
        date: date
      })
    });

    if (response.ok) {
      alert("הנתונים עודכנו בהצלחה! ✅");
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

function calculateRecommendation(items) {
  const recommendationContainer = document.getElementById("recommendationBox");
  if (!recommendationContainer) return;

  const storeTotals = {};

  items.forEach(item => {
    const data = item.json ? item.json : item;
    const store = data["שם החנות"] || data.store;
    const price = parseFloat(data["מחיר המוצר"] || data["מחיר"] || data.price);

    if (store && !isNaN(price)) {
      storeTotals[store] = (storeTotals[store] || 0) + price;
    }
  });

  const stores = Object.keys(storeTotals);
  if (stores.length < 2) {
    recommendationContainer.innerHTML = "<p style='color:#64748b;'>💡 העלה קבלות מ-2 חנויות לפחות כדי לקבל המלצת סל קניות</p>";
    return;
  }

  let cheapestStore = stores[0];
  stores.forEach(store => {
    if (storeTotals[store] < storeTotals[cheapestStore]) {
      cheapestStore = store;
    }
  });

  recommendationContainer.innerHTML = `
    <h3>💡 המלצת הקנייה לסל שלך</h3>
    <p>החנות המשתלמת ביותר היא <strong>${cheapestStore}</strong> (סך הכל: ₪${storeTotals[cheapestStore].toFixed(2)})</p>
  `;
}

function filterProducts() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const cards = document.querySelectorAll(".product-card");

  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(query) ? "flex" : "none";
  });
}

function closeModal() {
  document.getElementById("priceModal").style.display = "none";
}
