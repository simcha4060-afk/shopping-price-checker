
const UPLOAD_URL = "https://sish4747.app.n8n.cloud/webhook/f799be46-abc5-415d-a556-eb1575457ea4";
const GET_PRODUCTS_URL = "https://sish4747.app.n8n.cloud/webhook/get-products";
const DELETE_PRODUCT_URL = "https://sish4747.app.n8n.cloud/webhook/delete-product";
const UPDATE_PRODUCT_URL = "https://sish4747.app.n8n.cloud/webhook/update-product";

// =====================================
// מחלקות
// =====================================

const CATEGORIES = [
  ["הכל", "🛒"],
  ["פירות וירקות", "🍏"],
  ["חלב וביצים", "🥛"],
  ["לחמים ומאפים", "🍞"],
  ["בשר ועופות", "🥩"],
  ["דגים", "🐟"],
  ["רטבים וממרחים", "🥫"],
  ["שימורים", "🥫"],
  ["אורז, פסטה וקטניות", "🌾"],
  ["אפייה ובישול", "🧂"],
  ["חטיפים וממתקים", "🍫"],
  ["משקאות", "🥤"],
  ["קפואים", "🧊"],
  ["סלטים ומקרר", "🥗"],
  ["חומרי ניקוי", "🧹"],
  ["טואלטיקה והיגיינה", "🧴"],
  ["חד פעמי", "🍽️"],
  ["שונות", "📦"]
];

// כללי סיווג גיבוי למוצרים ישנים
const CATEGORY_RULES = [
  ["סלטים ומקרר", /טחינה מוכנה|חומוס מוכן|חומוס ישראלי|סלט חצילים|מטבוחה|סלט כרוב|סלמון מעושן|סלט טונה/],
  ["שימורים", /רסק עגבניות|עגבניות מרוסקות|שימור|טונה בקופס|תירס בקופס|פטריות חתוכות|מלפפון במלח|זית טבעות/],
  ["רטבים וממרחים", /קטשופ|מיונז|חרדל|טחינה|רוטב|ממרח|פסטו|סחוג|אריסה|דבש/],
  ["חלב וביצים", /חלב|גבינ|יוגורט|קוטג|שמנת|ביצים|ביצה|מעדן חלב|חמאה|לבנה/],
  ["לחמים ומאפים", /לחם|חלה|חלות|פיתה|פיתות|לחמני|בגט|טורטיה|קרואסון|בורקס|מאפה/],
  ["דגים", /דגים|דג טרי|דג קפוא|סלמון|אמנון|מושט|דניס|פילה דג/],
  ["בשר ועופות", /עוף|עופות|פרגית|שניצל עוף|חזה עוף|בקר|בשר|הודו|קבב|המבורגר/],
  ["קפואים", /איגלו|קרטיב|גלידה|חטיפי הקפאה|קפוא|פיצה קפואה/],
  ["פירות וירקות", /תפוח|בננה|מלפפון טרי|עגבניה|עגבניות|גזר|בצל|תפוח אדמה|בטטה|קישוא|פלפל אדום|פלפל חריף|חסה|אבוקדו|תפוז|לימון|ענבים|פטרוזיליה|כוסברה/],
  ["אורז, פסטה וקטניות", /אורז בסמטי|אורז דואט|פסטה|ספגטי|מקרוני|קוסקוס|בורגול|קינואה|עדשים|שעועית יבשה|פתיתים|אטריות/],
  ["אפייה ובישול", /קמח|סוכר|שמן|מלח|פפריקה|כורכום|אבקת אפייה|תבלין|קינמון|קורנפלור|שמרים|וניל|פירורי לחם/],
  ["חטיפים וממתקים", /ביסקוויט|שוקולד|חטיף|וופל|עוגיות|סוכריות|מסטיק|במבה|ביסלי|בייגלה|פריכיות|גרעין/],
  ["משקאות", /מים מינרל|מיץ|קולה|ספרייט|סודה|משקה|שתיה|שתייה|נקטר|קפה|תה שחור|תה ירוק|שוקו/],
  ["חומרי ניקוי", /אקונומיקה|נוזל כלים|חומר ניקוי|מרכך כביסה|אבקת כביסה|נוזל כביסה|מסיר שומנים|סנו|מטליות ניקוי|מטאטא|מגב גומי/],
  ["טואלטיקה והיגיינה", /שמפו|מרכך שיער|דאודורנט|דאו ספריי|משחת שיניים|משחת אורביטול|סבון גוף|תחליב רחצה|נייר טואלט|מגבונים|טיטולים|חיתולים/],
  ["חד פעמי", /חד פעמי|כוסות|צלחות|מזלגות|סכו"ם|מפיות|ניילון נצמד|שקיות אשפה|תבניות אלומיניום|נייר אפייה/]
];

let aggregatedProducts = {};
let activeCategory = "הכל";
let lastUploadedFile = null;
let productsLoadRequestId = 0;

// =====================================
// סיווג מוצרים
// =====================================

function normalizeCategory(productName, oldCategory) {
  const name = String(productName || "").trim().toLowerCase();
  const existing = String(oldCategory || "").trim();

  // המחלקה של AI ב-n8n מקבלת עדיפות
  if (
    existing !== "שונות" &&
    existing !== "הכל" &&
    CATEGORIES.some(([category]) => category === existing)
  ) {
    return existing;
  }

  // סיווג אוטומטי למוצרים ישנים
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(name)) {
      return category;
    }
  }

  return "שונות";
}

// =====================================
// בניית כפתורי המחלקות
// =====================================

function setupCategories() {
  const bar = document.getElementById("categoryBar");

  if (bar) {
    bar.replaceChildren();

    for (const [category, emoji] of CATEGORIES) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "cat-btn";
      button.textContent = `${category} ${emoji}`;
      button.dataset.category = category;

      if (category === activeCategory) {
        button.classList.add("active");
      }

      button.onclick = () => selectCategory(category);
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
      option.textContent = `${category} ${emoji}`;

      editCategory.appendChild(option);
    }
  }
}

// =====================================
// הפעלה ראשונית
// =====================================

function initApp() {
  setupCategories();
  loadProducts();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp, {
    once: true
  });
} else {
  initApp();
}

// =====================================
// כיווץ קבלות לפני העלאה
// =====================================

// מגבלת הקובץ ב-secure-client.js
const MAX_UPLOAD_BYTES = 2500000;

// יעד הכיווץ - 1.8MB
const TARGET_IMAGE_BYTES = 1800000;

async function prepareReceiptFile(file) {
  if (file.size <= MAX_UPLOAD_BYTES) {
    return file;
  }

  const isImage =
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp)$/i.test(file.name);

  if (!isImage) {
    throw new Error(
      "קובץ PDF גדול מ-2.5MB. יש להקטין אותו לפני העלאה."
    );
  }

  let image;
  let cleanup = () => {};

  try {
    // פתיחת התמונה
    if (typeof createImageBitmap === "function") {
      image = await createImageBitmap(file);

      cleanup = () => {
        if (image.close) image.close();
      };

    } else {
      const url = URL.createObjectURL(file);

      cleanup = () => URL.revokeObjectURL(url);

      image = new Image();

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
    }

    const originalWidth = image.width || image.naturalWidth;
    const originalHeight = image.height || image.naturalHeight;

    if (!originalWidth || !originalHeight) {
      throw new Error("לא ניתן לקרוא את התמונה");
    }

    // מתחילים ברזולוציה גבוהה ככל האפשר
    const sizes = [2400, 2000, 1700, 1400];
    const qualities = [0.90, 0.82, 0.72];

    for (const maxSide of sizes) {
      const scale = Math.min(
        1,
        maxSide / Math.max(originalWidth, originalHeight)
      );

      const width = Math.max(
        1,
        Math.round(originalWidth * scale)
      );

      const height = Math.max(
        1,
        Math.round(originalHeight * scale)
      );

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d", {
        alpha: false
      });

      if (!ctx) {
        throw new Error("הדפדפן אינו מאפשר כיווץ תמונות");
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(image, 0, 0, width, height);

      for (const quality of qualities) {
        const blob = await new Promise(resolve => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            quality
          );
        });

        if (!blob) {
          throw new Error("כיווץ התמונה נכשל");
        }

        if (blob.size <= TARGET_IMAGE_BYTES) {
          const originalName = file.name || "receipt";

          const newName =
            originalName.replace(/\.[^.]+$/, "") + ".jpg";

          console.log(
            "Receipt compressed:",
            file.size,
            "=>",
            blob.size
          );

          return new File(
            [blob],
            newName,
            {
              type: "image/jpeg",
              lastModified: Date.now()
            }
          );
        }
      }
    }

    throw new Error(
      "לא ניתן להקטין את הקבלה מספיק. נסה לצלם מחדש באיכות רגילה."
    );

  } catch (err) {
    console.error("Compression error:", err);

    if (err.message && err.message.includes("לא ניתן")) {
      throw err;
    }

    throw new Error(
      "שגיאה בעיבוד התמונה. נסה להעלות JPG במקום HEIC."
    );

  } finally {
    cleanup();
  }
}

// =====================================
// העלאת קבלה
// =====================================

async function uploadReceipt(event) {
  const file = event?.target?.files
    ? event.target.files[0]
    : event;

  if (!file) return;

  lastUploadedFile = file;

  const statusElement = document.getElementById("uploadStatus");

  try {
    if (statusElement) {
      statusElement.style.color = "";
      statusElement.textContent =
        "מכין קבלה להעלאה... ⏳";
    }

    // כיווץ לפני שליחה
    const readyFile = await prepareReceiptFile(file);

    if (readyFile.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        "הקובץ עדיין גדול מ-2.5MB"
      );
    }

    const formData = new FormData();

    formData.append(
      "file",
      readyFile,
      readyFile.name
    );

    if (statusElement) {
      statusElement.textContent =
        "מעלה ומפענח קבלה... ⏳";
    }

    // secure-client.js מיירט את הבקשה
    // ומעביר אותה ל-/api/n8n בצורה מאובטחת
    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      body: formData,
      mode: "cors",
      signal: AbortSignal.timeout(120000)
    });

    if (!response.ok) {
      throw new Error(
        `שגיאה מהשרת: HTTP ${response.status}`
      );
    }

    if (statusElement) {
      statusElement.style.color = "#16a34a";
      statusElement.textContent =
        "הקבלה פוענחה ונשמרה בהצלחה! ✅";
    }

    setTimeout(loadProducts, 1500);

  } catch (err) {
    console.error("Upload error:", err);

    showRetryError(
      err.message || "שגיאה בהעלאת הקבלה"
    );
  } finally {
    if (event?.target?.type === "file") {
      event.target.value = "";
    }
  }
}

// =====================================
// הודעת שגיאה עם ניסיון חוזר
// =====================================

function showRetryError(message) {
  const statusElement = document.getElementById("uploadStatus");

  if (!statusElement) return;

  statusElement.replaceChildren();

  const text = document.createElement("span");
  text.textContent = message;
  text.style.color = "#dc3545";

  const button = document.createElement("button");

  button.type = "button";
  button.textContent = "🔄 נסה שוב";

  button.style.cssText = `
    padding: 6px 12px;
    margin: 5px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
  `;

  button.onclick = retryUploadReceipt;

  statusElement.append(text, button);
}

function retryUploadReceipt() {
  if (!lastUploadedFile) {
    alert("לא נמצאה קבלה קודמת");
    return;
  }

  if (!confirm(
    "האם לנסות לשלוח שוב? ודא שהקבלה לא נשמרה כבר כדי למנוע כפילויות."
  )) {
    return;
  }

  uploadReceipt(lastUploadedFile);
}

// =====================================
// טעינת מוצרים מ-n8n
// =====================================

async function loadProducts() {
  const productsList = document.getElementById("productsList");
  const recommendationBox =
    document.getElementById("recommendationBox");

  if (!productsList) return;

  const requestId = ++productsLoadRequestId;

  productsList.innerHTML =
    "<p style='text-align:center;color:#666;'>טוען נתונים...</p>";

  if (recommendationBox) {
    recommendationBox.textContent =
      "טוען נתוני המלצה...";
  }

  try {
    const response = await fetch(GET_PRODUCTS_URL, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const rawData = await response.json();

    if (requestId !== productsLoadRequestId) return;

    let items = [];

    if (Array.isArray(rawData)) {
      if (
        rawData.length > 0 &&
        Array.isArray(rawData[0]?.data)
      ) {
        items = rawData[0].data;
      } else {
        items = rawData;
      }

    } else if (rawData && typeof rawData === "object") {
      if (Array.isArray(rawData.data)) {
        items = rawData.data;
      } else if (Array.isArray(rawData.items)) {
        items = rawData.items;
      } else {
        items = [rawData];
      }

    } else {
      throw new Error("מבנה נתונים לא תקין");
    }

    processAndRenderProducts(items);
    calculateRecommendation(items);

  } catch (err) {
    if (requestId !== productsLoadRequestId) return;

    console.error("Products loading error:", err);

    const message =
      err.name === "TimeoutError" ||
      err.name === "AbortError"
        ? "השרת לא ענה בתוך 20 שניות"
        : `שגיאה בטעינת נתונים: ${err.message}`;

    productsList.replaceChildren();

    const p = document.createElement("p");
    p.textContent = message;
    p.style.color = "#dc3545";

    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "🔄 נסה לטעון שוב";

    retry.style.cssText = `
      background:#2563eb;
      color:white;
      padding:10px;
      border:0;
      border-radius:8px;
      cursor:pointer;
    `;

    retry.onclick = loadProducts;

    productsList.append(p, retry);

    if (recommendationBox) {
      recommendationBox.textContent =
        "לא ניתן לחשב המלצה - הנתונים לא נטענו.";
    }
  }
}

// =====================================
// איגוד מוצרים
// =====================================

function processAndRenderProducts(items) {
  aggregatedProducts = {};

  items.forEach(item => {
    const data = item?.json || item || {};

    const rowNumber =
      data.row_number ?? item?.row_number ?? null;

    const store =
      data["שם החנות"] || data.store || "-";

    const date =
      data["תאריך"] || data.date || "";

    const rawProductName = String(
      data["שם המוצר"] || data.product_name || ""
    ).trim();

    const price = parseFloat(
      data["מחיר המוצר"] ??
      data["מחיר"] ??
      data.price
    );

    const category = normalizeCategory(
      rawProductName,
      data["מחלקה"] || data.category
    );

    if (
      !rawProductName ||
      rawProductName.toLowerCase() === "empty" ||
      !Number.isFinite(price)
    ) {
      return;
    }

    const key = rawProductName;

    if (!aggregatedProducts[key]) {
      aggregatedProducts[key] = {
        name: key,
        latestPrice: price,
        latestStore: store,
        latestDate: date,
        category,
        history: []
      };
    }

    const product = aggregatedProducts[key];

    product.history.push({
      rowNumber,
      store,
      date,
      price,
      rawProductName,
      category
    });

    const newDate = Date.parse(date);
    const oldDate = Date.parse(product.latestDate);

    if (
      !product.latestDate ||
      (
        Number.isFinite(newDate) &&
        (!Number.isFinite(oldDate) || newDate >= oldDate)
      )
    ) {
      product.latestPrice = price;
      product.latestStore = store;
      product.latestDate = date;
      product.category = category;
    }
  });

  renderProductsGrid();
}

// =====================================
// הצגת מוצרים
// =====================================

function renderProductsGrid() {
  const productsList = document.getElementById("productsList");

  if (!productsList) return;

  productsList.replaceChildren();

  let count = 0;

  Object.values(aggregatedProducts).forEach(product => {
    if (
      activeCategory !== "הכל" &&
      product.category !== activeCategory
    ) {
      return;
    }

    count++;

    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.category = product.category;

    card.onclick = () => showPrices(product.name);

    const info = document.createElement("div");
    info.style.flex = "1";

    const name = document.createElement("strong");
    name.className = "product-title";
    name.textContent = product.name;

    name.style.cssText =
      "font-size:15px;color:#1e293b;";

    const details = document.createElement("div");

    details.textContent =
      `${product.latestStore} (${product.latestDate})`;

    details.style.cssText =
      "font-size:12px;color:#64748b;margin-top:3px;";

    const categoryTag = document.createElement("span");
    categoryTag.className = "category-tag";
    categoryTag.textContent = product.category;

    info.append(name, details, categoryTag);

    const price = document.createElement("div");
    price.textContent =
      `₪${product.latestPrice.toFixed(2)}`;

    price.style.cssText =
      "font-weight:700;color:#16a34a;font-size:16px;";

    card.append(info, price);
    productsList.appendChild(card);
  });

  if (count === 0) {
    productsList.innerHTML =
      "<p style='text-align:center;color:#888;padding:20px;'>אין מוצרים במחלקה זו</p>";
  }

  filterProducts();
}

// =====================================
// בחירת מחלקה
// =====================================

function selectCategory(category) {
  activeCategory = category;

  document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.category === category
    );
  });

  renderProductsGrid();
}

// =====================================
// חיפוש מוצרים
// =====================================

function filterProducts() {
  const query = (
    document.getElementById("searchInput")?.value || ""
  ).trim().toLowerCase();

  const cards = document.querySelectorAll(
    "#productsList .product-card"
  );

  cards.forEach(card => {
    const match = card.textContent
      .toLowerCase()
      .includes(query);

    card.style.display = match ? "" : "none";
  });
}

// =====================================
// היסטוריית מחירים
// =====================================

function showPrices(productName) {
  const product = aggregatedProducts[productName];

  if (!product) return;

  cancelEdit();

  const title = document.getElementById("modalProductName");
  const tbody = document.getElementById("modalPriceTableBody");

  if (!tbody) return;

  if (title) title.textContent = product.name;

  tbody.replaceChildren();

  const history = [...product.history].sort(
    (a, b) => (Date.parse(b.date) || 0) -
      (Date.parse(a.date) || 0)
  );

  history.forEach(item => {
    const tr = document.createElement("tr");

    const values = [
      item.store || "-",
      `₪${item.price.toFixed(2)}`,
      item.date || "-",
      item.category || "שונות"
    ];

    values.forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });

    const actions = document.createElement("td");
    actions.style.whiteSpace = "nowrap";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "✏️";
    edit.title = "עריכה";

    edit.onclick = () => openEditForm(
      item.rowNumber,
      item.store,
      item.rawProductName,
      item.price,
      item.date,
      item.category
    );

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "🗑️";
    del.title = "מחיקה";

    del.onclick = () => deleteRow(item.rowNumber);

    actions.append(edit, del);

    tr.appendChild(actions);
    tbody.appendChild(tr);
  });

  const modal = document.getElementById("priceModal");

  if (modal) modal.style.display = "flex";
}

// =====================================
// פתיחת טופס עריכה
// =====================================

function openEditForm(
  rowNumber,
  store,
  productName,
  price,
  date,
  category
) {
  document.getElementById("editRowNumber").value =
    rowNumber ?? "";

  document.getElementById("editStore").value =
    store || "";

  document.getElementById("editProductName").value =
    productName || "";

  document.getElementById("editPrice").value = price;

  document.getElementById("editDate").value =
    date || "";

  const catSelect =
    document.getElementById("editCategory");

  if (catSelect) {
    catSelect.value = category || "שונות";
  }

  document.getElementById("editFormContainer").style.display =
    "block";
}

function cancelEdit() {
  const form = document.getElementById("editFormContainer");

  if (form) form.style.display = "none";
}

// =====================================
// שמירת עריכה
// =====================================

async function saveEdit() {
  const rowNumber =
    document.getElementById("editRowNumber").value;

  const store =
    document.getElementById("editStore").value;

  const productName =
    document.getElementById("editProductName").value;

  const price = parseFloat(
    document.getElementById("editPrice").value
  );

  const date =
    document.getElementById("editDate").value;

  const category =
    document.getElementById("editCategory").value;

  if (!rowNumber || rowNumber === "null") {
    alert("שגיאה בזיהוי מספר השורה");
    return;
  }

  if (!productName.trim() || !Number.isFinite(price)) {
    alert("יש להזין שם מוצר ומחיר תקינים");
    return;
  }

  try {
    const response = await fetch(UPDATE_PRODUCT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(30000),

      body: JSON.stringify({
        row_number: parseInt(rowNumber, 10),
        store,
        product_name: productName,
        price,
        date,
        category
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    alert("המוצר עודכן בהצלחה ✅");

    closeModal();
    loadProducts();

  } catch (err) {
    console.error("Update error:", err);

    alert(
      err.name === "TimeoutError"
        ? "תם זמן ההמתנה. בדוק אם העדכון בוצע."
        : "שגיאה בעדכון המוצר"
    );
  }
}

// =====================================
// מחיקת מוצר
// =====================================

async function deleteRow(rowNumber) {
  if (
    rowNumber == null ||
    rowNumber === "" ||
    rowNumber === "null"
  ) {
    alert("לא ניתן לזהות את מספר השורה");
    return;
  }

  if (!confirm("האם למחוק את הרכישה הזאת?")) {
    return;
  }

  try {
    const response = await fetch(DELETE_PRODUCT_URL, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(30000),

      body: JSON.stringify({
        row_number: parseInt(rowNumber, 10)
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    alert("המוצר נמחק בהצלחה ✅");

    closeModal();
    loadProducts();

  } catch (err) {
    console.error("Delete error:", err);

    alert(
      err.name === "TimeoutError"
        ? "תם זמן ההמתנה. בדוק אם המחיקה בוצעה."
        : "שגיאה במחיקת המוצר"
    );
  }
}

// =====================================
// השוואת מחירים בין חנויות
// =====================================

function calculateRecommendation(items) {
  const container =
    document.getElementById("recommendationBox");

  if (!container) return;

  container.replaceChildren();

  const productsByStore = new Map();

  items.forEach(item => {
    const data = item?.json || item || {};

    const store = String(
      data["שם החנות"] || data.store || ""
    ).trim();

    const productName = String(
      data["שם המוצר"] || data.product_name || ""
    ).trim();

    const price = parseFloat(
      data["מחיר המוצר"] ??
      data["מחיר"] ??
      data.price
    );

    if (
      !store ||
      !productName ||
      !Number.isFinite(price)
    ) {
      return;
    }

    if (!productsByStore.has(productName)) {
      productsByStore.set(productName, new Map());
    }

    productsByStore.get(productName).set(store, price);
  });

  const overlappingProducts =
    [...productsByStore.entries()].filter(
      ([, stores]) => stores.size >= 2
    );

  if (overlappingProducts.length === 0) {
    container.textContent =
      "💡 השוואת סל: עדיין אין מוצרים זהים שנרכשו בחנויות שונות.";
    return;
  }

  const allStores = new Set();

  overlappingProducts.forEach(([, stores]) => {
    stores.forEach((price, store) => {
      allStores.add(store);
    });
  });

  const fullBaskets = [];

  allStores.forEach(store => {
    const prices = overlappingProducts.map(
      ([, stores]) => stores.get(store)
    );

    if (
      prices.every(price => price !== undefined)
    ) {
      fullBaskets.push({
        store,
        total: prices.reduce(
          (sum, price) => sum + price,
          0
        )
      });
    }
  });

  const title = document.createElement("strong");

  title.textContent =
    `💡 השוואת סל - ${overlappingProducts.length} מוצרים חופפים`;

  container.appendChild(title);

  if (fullBaskets.length < 2) {
    const info = document.createElement("p");

    info.textContent =
      "נמצאו מוצרים חופפים, אך אין לפחות שתי חנויות עם כל המוצרים האלה.";

    container.appendChild(info);
    return;
  }

  fullBaskets.sort((a, b) => a.total - b.total);

  const cheapest = fullBaskets[0];

  fullBaskets.forEach((result, index) => {
    const line = document.createElement("p");

    line.textContent =
      `${index === 0 ? "🏆 " : ""}${result.store}: ₪${result.total.toFixed(2)}`;

    container.appendChild(line);
  });

  const mostExpensive =
    fullBaskets[fullBaskets.length - 1];

  const savings =
    mostExpensive.total - cheapest.total;

  if (savings > 0) {
    const savingsLine = document.createElement("p");

    savingsLine.textContent =
      `חיסכון אפשרי: ₪${savings.toFixed(2)}`;

    savingsLine.style.cssText =
      "color:#16a34a;font-weight:bold;";

    container.appendChild(savingsLine);
  }
}

// =====================================
// סגירת חלון מוצר
// =====================================

function closeModal() {
  const modal = document.getElementById("priceModal");

  if (modal) modal.style.display = "none";

  cancelEdit();
}
