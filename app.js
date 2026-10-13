// כתובת ה-Webhook ב-n8n או ה-API שמחזיר נתונים
const API_URL = "YOUR_N8N_WEBHOOK_OR_BACKEND_URL";

// 1. העלאת תמונת קבלה ל-n8n
async function uploadReceipt(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById("uploadStatus").innerText = "מעלה ומפענח קבלה...";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_URL}/upload-receipt`, {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      document.getElementById("uploadStatus").innerText = "הקבלה פענחה ונשמרה בהצלחה! ✅";
      loadProducts(); // רענון רשימת המוצרים
    } else {
      document.getElementById("uploadStatus").innerText = "שגיאה בפענוח הקבלה ❌";
    }
  } catch (err) {
    console.error(err);
    document.getElementById("uploadStatus").innerText = "שגיאה בתקשורת מול השרת";
  }
}

// 2. הצגת הפופאפ עם מחירי מוצר בחנויות
function showPrices(productName, storePrices) {
  document.getElementById("modalProductName").innerText = productName;
  const tbody = document.getElementById("modalPriceTableBody");
  tbody.innerHTML = "";

  storePrices.forEach(item => {
    const row = `<tr>
      <td>${item.store}</td>
      <td>${item.price} ₪</td>
      <td>${item.date || '-'}</td>
    </tr>`;
    tbody.innerHTML += row;
  });

  document.getElementById("priceModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("priceModal").style.display = "none";
}