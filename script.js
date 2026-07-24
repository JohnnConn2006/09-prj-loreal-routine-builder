/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const clearAllButton = document.getElementById("clearAllBtn");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

let selectedProducts = [];
let currentProducts = [];
let allProducts = [];
let conversationMessages = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Keep the follow-up input disabled until a routine has been generated */
userInput.disabled = true;
sendBtn.disabled = true;

/* Load product data from JSON file */
async function loadProducts() {
  if (allProducts.length > 0) {
    return allProducts;
  }

  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="placeholder-message small">No products selected yet.</p>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-pill">
        <span>${escapeHtml(product.name)}</span>
        <button
          type="button"
          class="remove-selected-btn"
          data-id="${product.id}"
          aria-label="Remove ${escapeHtml(product.name)}"
        >
          ×
        </button>
      </div>
    `,
    )
    .join("");
}

function isSelected(product) {
  return selectedProducts.some((item) => item.id === product.id);
}

function toggleProductSelection(product) {
  const alreadySelected = selectedProducts.some(
    (item) => item.id === product.id,
  );

  if (alreadySelected) {
    selectedProducts = selectedProducts.filter(
      (item) => item.id !== product.id,
    );
  } else {
    selectedProducts.push(product);
  }

  saveSelectedProducts();
  renderSelectedProducts();

  if (currentProducts.length > 0) {
    displayProducts(currentProducts);
  }
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  currentProducts = products;

  productsContainer.innerHTML = products
    .map((product) => {
      const selectedClass = isSelected(product) ? " selected" : "";

      return `
        <div class="product-card${selectedClass}" data-id="${product.id}">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
          <div class="product-info">
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.brand)}</p>
            <button
              type="button"
              class="description-toggle"
              data-id="${product.id}"
              aria-expanded="false"
              aria-controls="description-${product.id}"
            >
              Show Description
            </button>
            <div class="product-description" id="description-${product.id}" hidden>
              <p>${escapeHtml(product.description)}</p>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderChatMessages() {
  const visibleMessages = conversationMessages.filter(
    (message) => message.role !== "system",
  );

  chatWindow.innerHTML = visibleMessages
    .map((message) => {
      const messageClass = message.role === "assistant" ? "assistant" : "user";
      const label = message.role === "assistant" ? "Assistant" : "You";
      const content = escapeHtml(message.content);

      return `
        <div class="chat-message ${messageClass}">
          <strong>${label}</strong>
          <p>${content}</p>
        </div>
      `;
    })
    .join("");
}

function restoreSavedSelections() {
  const savedProducts = localStorage.getItem("selectedProducts");

  if (savedProducts) {
    try {
      const parsedProducts = JSON.parse(savedProducts);

      if (Array.isArray(parsedProducts)) {
        selectedProducts = parsedProducts;
        renderSelectedProducts();
      }
    } catch (error) {
      console.log("Could not load saved selections");
    }
  }
}

/* Restoring selections before a category is chosen is expected. The grid will only
   show the selected state once a category has been loaded and displayed. */

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

productsContainer.addEventListener("click", (e) => {
  const descriptionButton = e.target.closest(".description-toggle");

  if (descriptionButton) {
    e.stopPropagation();

    const card = descriptionButton.closest(".product-card");
    const description = card.querySelector(".product-description");
    const isExpanded =
      descriptionButton.getAttribute("aria-expanded") === "true";

    descriptionButton.setAttribute("aria-expanded", String(!isExpanded));
    description.hidden = isExpanded;
    descriptionButton.textContent = isExpanded
      ? "Show Description"
      : "Hide Description";
    return;
  }

  const clickedCard = e.target.closest(".product-card");

  if (!clickedCard) {
    return;
  }

  const productId = Number(clickedCard.dataset.id);
  const selectedProduct =
    allProducts.find((product) => product.id === productId) ||
    currentProducts.find((product) => product.id === productId);

  if (selectedProduct) {
    toggleProductSelection(selectedProduct);
  }
});

selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-selected-btn");

  if (!removeButton) {
    return;
  }

  e.stopPropagation();

  const productId = Number(removeButton.dataset.id);

  selectedProducts = selectedProducts.filter(
    (product) => product.id !== productId,
  );
  saveSelectedProducts();
  renderSelectedProducts();

  if (currentProducts.length > 0) {
    displayProducts(currentProducts);
  }
});

/* Generate routine button */
generateRoutineButton.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = `
      <div class="chat-message assistant">
        <strong>Assistant</strong>
        <p>Select at least one product before generating a routine.</p>
      </div>
    `;
    return;
  }

  const shortList = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  conversationMessages = [
    {
      role: "system",
      content:
        "You are a helpful beauty advisor. Only discuss the generated routine or general skincare, haircare, makeup, or fragrance topics.",
    },
    {
      role: "user",
      content: `Build a routine using these products: ${JSON.stringify(shortList)}`,
    },
  ];

  chatWindow.innerHTML = `
    <div class="chat-message assistant">
      <strong>Assistant</strong>
      <p>Creating your routine...</p>
    </div>
  `;

  userInput.disabled = false;
  sendBtn.disabled = false;

  try {
    const response = await fetch("https://garrychatbot.connol76.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationMessages }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("The assistant response was not in the expected format.");
    }

    const reply = data.choices[0].message.content;

    conversationMessages.push({ role: "assistant", content: reply });
    renderChatMessages();
  } catch (error) {
    chatWindow.innerHTML = `
      <div class="chat-message assistant">
        <strong>Assistant</strong>
        <p>Sorry, I could not generate your routine right now. Please try again.</p>
      </div>
    `;
  }
});

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = userInput.value.trim();

  if (!userMessage) {
    return;
  }

  if (conversationMessages.length === 0) {
    chatWindow.innerHTML = `
      <div class="chat-message assistant">
        <strong>Assistant</strong>
        <p>Generate a routine first so I can help with follow-up questions.</p>
      </div>
    `;
    return;
  }

  conversationMessages.push({ role: "user", content: userMessage });
  userInput.value = "";
  renderChatMessages();

  try {
    const response = await fetch("https://garrychatbot.connol76.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationMessages }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("The assistant response was not in the expected format.");
    }

    const reply = data.choices[0].message.content;

    conversationMessages.push({ role: "assistant", content: reply });
    renderChatMessages();
  } catch (error) {
    chatWindow.innerHTML = `
      <div class="chat-message assistant">
        <strong>Assistant</strong>
        <p>Sorry, I could not answer that follow-up right now. Please try again.</p>
      </div>
    `;
  }
});

clearAllButton.addEventListener("click", () => {
  selectedProducts = [];
  saveSelectedProducts();
  renderSelectedProducts();

  if (currentProducts.length > 0) {
    displayProducts(currentProducts);
  }
});

restoreSavedSelections();
