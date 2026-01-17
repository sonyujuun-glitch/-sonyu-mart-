/* ===============================
   DOM
================================ */
const searchInput = document.getElementById("searchInput");
const cardContainer = document.getElementById("cardContainer");

const detailModal = document.getElementById("detailModal");
const detailName = document.getElementById("detailName");
const detailDesc = document.getElementById("detailDesc");

/* ===============================
   상태
================================ */
let likes = JSON.parse(localStorage.getItem("likes") || "{}");
const data = DATA; // data.js에서 불러오는 JSON
let currentProduct = null;

/* ===============================
   검색
================================ */
function search() {
  const keyword = searchInput.value.trim();
  if (!keyword) return;

  let best = null;
  let bestScore = -1;

  for (const store in data) {
    for (const name in data[store]) {
      const score = name.includes(keyword) ? 50 : 0;
      const popularity = likes[name] || 0;
      const total = score + popularity;

      if (total > bestScore) {
        bestScore = total;
        best = {
          store,
          name,
          ...data[store][name]
        };
      }
    }
  }

  if (best) renderCard(best);
}

/* ===============================
   카드 렌더링
================================ */
async function renderAll() {
  cardContainer.innerHTML = "";

  for (const store in data) {
    for (const name in data[store]) {
      const product = {
        store,
        name,
        ...data[store][name]
      };

      const category = await detectCategoryByGemini(name);
      const likeCount = likes[name] || 0;

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class="heart" onclick="like(event, '${name}')">❤️ ${likeCount}</div>
        <h3>${name}</h3>
        <p>카테고리: <b>${category}</b></p>
        <p>가격: $${product.가격}</p>
        <small>${store}</small>
      `;

      card.onclick = () => {
        currentProduct = product;
        openModal();
      };

      cardContainer.appendChild(card);
    }
  }
}

// 검색 결과 한 개 렌더링
function renderCard(product) {
  cardContainer.innerHTML = ""; // 기존 카드 제거
  const likeCount = likes[product.name] || 0;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="heart" onclick="like(event, '${product.name}')">❤️ ${likeCount}</div>
    <h3>${product.name}</h3>
    <p>가격: $${product.가격}</p>
    <small>${product.store}</small>
  `;

  card.onclick = () => {
    currentProduct = product;
    openModal();
  };

  cardContainer.appendChild(card);
}

/* ===============================
   좋아요
================================ */
function like(e, name) {
  e.stopPropagation();
  likes[name] = (likes[name] || 0) + 1;
  localStorage.setItem("likes", JSON.stringify(likes));
  renderAll();
}

/* ===============================
   모달 제어
================================ */
async function openModal() {
  if (!currentProduct) return;
  detailName.textContent = currentProduct.name;
  detailDesc.textContent = "설명 불러오는 중...";
  detailModal.classList.remove("hidden");

  // 여기서 askGemini API 사용
  if (typeof askGemini === "function") {
    const prompt = `제품명: ${currentProduct.name}\n가격: ${currentProduct.가격}\n단위: ${currentProduct["무게 또는 단위"]}\n간단한 한국어 설명 2문장으로 제공해줘.`;
    const text = await askGemini(prompt);
    detailDesc.textContent = text;
  } else {
    detailDesc.textContent = "간단한 한국어 설명 예시입니다.";
  }
}

function closeModal() {
  detailModal.classList.add("hidden");
  detailName.textContent = "";
  detailDesc.textContent = "";
}

/* ===============================
   카테고리 분류 (예시, API 연결 가능)
================================ */
async function detectCategoryByGemini(productName) {
  // 실제 API가 없으면 기본 "기타" 반환
  if (typeof fetch !== "function") return "기타";

  const prompt = `
    제품명: "${productName}"
    아래 중 하나로만 대답해:
    고기류, 채소류, 유제품, 주스, 기타
  `;

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    return data.text?.trim() || "기타";
  } catch (err) {
    return "기타";
  }
}

/* ===============================
   제품 추가
================================ */
function openAddModal() {
  const addProductModal = document.getElementById("addProductModal");
  const storeInput = document.getElementById("storeInput");

  storeInput.innerHTML = '<option value="">-- 매장 선택 또는 새로 입력 --</option>';
  for (const store in data) {
    const option = document.createElement("option");
    option.value = store;
    option.textContent = store;
    storeInput.appendChild(option);
  }

  addProductModal.classList.remove("hidden");
}

function closeAddModal() {
  const addProductModal = document.getElementById("addProductModal");
  addProductModal.classList.add("hidden");

  document.getElementById("storeInput").value = "";
  document.getElementById("newStoreName").value = "";
  document.getElementById("productNameInput").value = "";
  document.getElementById("productUnitInput").value = "";
  document.getElementById("productPriceInput").value = "";
}

function addProduct() {
  const storeInput = document.getElementById("storeInput");
  const newStoreName = document.getElementById("newStoreName").value.trim();
  const productName = document.getElementById("productNameInput").value.trim();
  const productUnit = document.getElementById("productUnitInput").value.trim();
  const productPrice = parseFloat(document.getElementById("productPriceInput").value);

  if (!productName || !productUnit || isNaN(productPrice)) {
    alert("모든 필드를 올바르게 입력해주세요.");
    return;
  }

  let storeName = storeInput.value;
  if (newStoreName) storeName = newStoreName;
  if (!storeName) {
    alert("매장을 선택하거나 새로운 매장명을 입력해주세요.");
    return;
  }

  if (!data[storeName]) data[storeName] = {};

  data[storeName][productName] = {
    "무게 또는 단위": productUnit,
    "가격": productPrice
  };

  // 새 매장 옵션 추가
  const storeSelect = document.getElementById("storeSelect");
  if (![...storeSelect.options].some(o => o.value === storeName)) {
    const option = document.createElement("option");
    option.value = storeName;
    option.textContent = storeName;
    storeSelect.appendChild(option);
  }

  alert("제품이 추가되었습니다!");
  closeAddModal();
  renderAll();
}

/* ===============================
   초기 실행
================================ */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
});
