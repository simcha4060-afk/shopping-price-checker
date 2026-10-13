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

    // דילוג על שורות ריקות ללא שם מוצר
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
