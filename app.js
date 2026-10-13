// כתובת ה-Webhook ב-n8n
const API_URL = "https://sish4747.app.n8n.cloud/webhook/f799be46-abc5-415d-a556-eb1575457ea4";

// 1. העלאת תמונת קבלה ל-n8n
async function uploadReceipt(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusElement = document.getElementById("uploadStatus");
  statusElement.innerText = "מעלה ומפענח קבלה...";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      statusElement.innerText = "הקבלה פוענחה ונשמרה בהצלחה! ✅";
      if (typeof loadProducts === "function") {
        loadProducts(); // רענון רשימת המוצרים
      }
    } else {
      statusElement.innerText = "שגיאה בפענוח הקבלה ❌";
    }
  } catch (err) {
    console.error(err);
    statusElement.innerText = "שגיאה בתקשורת מול השרת";
  }
}

// 2. הצגת הפופאפ עם מחירי מוצר בחנויות
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
