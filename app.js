(() => {
  "use strict";

  const WHATSAPP_NUMBER = "919600122963";
  const products = window.AUDATHAM_PRODUCTS || [];
  const categoryNames = {
    honey: "Raw Honey", malts: "Health Malts", herbal: "Herbal Powders",
    sweeteners: "Traditional Sweeteners", pantry: "Ghee & Pantry"
  };
  const $ = (selector) => document.querySelector(selector);
  const money = (value) => "₹" + Number(value || 0).toLocaleString("en-IN");
  const imagePath = (name) => "images/" + name;
  const wa = (message) => "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);

  let activeCategory = "all";
  let activeProduct = null;
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem("audatham-static-cart") || "{}") || {}; }
  catch (_) { cart = {}; }

  const grid = $("#productGrid");
  const toast = $("#toast");
  let toastTimer;

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function productPrice(product) {
    const values = (product.variants || []).map(v => v.price).filter(n => Number.isFinite(n));
    return values.length ? Math.min(...values) : 0;
  }

  function renderProducts() {
    const query = ($("#productSearch").value || "").trim().toLowerCase();
    const sort = $("#sortProducts").value;
    let list = products.filter(p =>
      (activeCategory === "all" || p.category === activeCategory) &&
      [p.name,p.tamil,p.blurb,categoryNames[p.category]].join(" ").toLowerCase().includes(query)
    );
    if (sort === "az") list.sort((a,b) => a.name.localeCompare(b.name));
    if (sort === "low") list.sort((a,b) => productPrice(a)-productPrice(b));
    if (sort === "high") list.sort((a,b) => productPrice(b)-productPrice(a));

    $("#resultCount").textContent = list.length;
    $("#emptyState").hidden = list.length > 0;
    grid.innerHTML = list.map(p => `
      <article class="product-card">
        <div class="product-image-wrap" data-view="${safe(p.id)}">
          <img src="${imagePath(safe(p.image))}" alt="${safe(p.name)}" loading="lazy">
          ${p.tag ? `<span class="product-tag">${safe(p.tag)}</span>` : ""}
          <button class="quick-view" type="button" data-view="${safe(p.id)}">Quick view ↗</button>
        </div>
        <div class="product-info">
          <span class="product-category">${safe(categoryNames[p.category] || "AUDATHAM")}</span>
          <h3>${safe(p.name)}</h3>
          <div class="product-tamil">${safe(p.tamil)}</div>
          <div class="product-bottom">
            <span class="product-price">${p.contactOnly ? "Contact for details" : `From ${money(productPrice(p))}`}</span>
            <button class="product-action" type="button" data-view="${safe(p.id)}">${p.contactOnly ? "Enquire" : "View product"}</button>
          </div>
        </div>
      </article>`).join("");
  }

  function openProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    activeProduct = product;
    const firstVariant = product.variants?.[0];
    $("#productModalContent").innerHTML = `
      <div class="modal-product-layout">
        <img src="${imagePath(safe(product.image))}" alt="${safe(product.name)}">
        <div>
          <span class="product-category">${safe(categoryNames[product.category] || "AUDATHAM")}</span>
          <h2>${safe(product.name)}</h2>
          <div class="tamil">${safe(product.tamil)}</div>
          ${product.tag ? `<span class="product-tag" style="position:static;display:inline-block;margin-top:12px">${safe(product.tag)}</span>` : ""}
          <p>${safe(product.blurb)}</p>
          <label class="variant-label" for="productVariant">Choose pack size</label>
          <select class="variant-select" id="productVariant">
            ${(product.variants || []).map((v,i) => `<option value="${i}">${safe(v.size)}${product.contactOnly ? "" : " — "+money(v.price)}</option>`).join("")}
          </select>
          <div class="modal-price" id="modalPrice">${product.contactOnly ? "Contact for price" : money(firstVariant?.price)}</div>
          <div class="modal-actions">
            ${product.contactOnly
              ? `<button class="button button-green" id="enquireProduct">Enquire on WhatsApp ↗</button>`
              : `<button class="button button-dark" id="addProductToCart">Add to basket</button>`}
          </div>
        </div>
      </div>`;
    $("#productModalBackdrop").classList.add("open");
    document.body.classList.add("modal-open");
    $("#productVariant").addEventListener("change", updateModalPrice);
    $("#addProductToCart")?.addEventListener("click", () => {
      const variant = product.variants[Number($("#productVariant").value)];
      addToCart(product, variant);
      closeProduct();
    });
    $("#enquireProduct")?.addEventListener("click", () => {
      const variant = product.variants[Number($("#productVariant").value)];
      window.open(wa(`Vanakkam AUDATHAM! I would like to enquire about:\n${product.name}\nPack size: ${variant?.size || "Please advise"}\n\nPlease share availability and ordering details.`), "_blank", "noopener");
    });
  }

  function updateModalPrice() {
    if (!activeProduct) return;
    const variant = activeProduct.variants[Number($("#productVariant").value)];
    $("#modalPrice").textContent = activeProduct.contactOnly ? "Contact for price" : money(variant?.price);
  }

  function closeProduct() {
    $("#productModalBackdrop").classList.remove("open");
    document.body.classList.remove("modal-open");
    activeProduct = null;
  }

  function saveCart() {
    try { localStorage.setItem("audatham-static-cart", JSON.stringify(cart)); } catch (_) {}
    renderCart();
  }

  function addToCart(product, variant, qty=1) {
    if (!product || !variant || product.contactOnly) return;
    const key = product.id + "|" + variant.size;
    if (!cart[key]) cart[key] = { id:product.id, size:variant.size, price:variant.price, qty:0 };
    cart[key].qty = Math.min(99, cart[key].qty + qty);
    saveCart();
    notify(product.name + " added to your basket");
  }

  function cartEntries() {
    return Object.entries(cart).map(([key,line]) => ({
      key, ...line, product:products.find(p => p.id === line.id)
    })).filter(line => line.product && line.qty > 0);
  }

  function renderCart() {
    const entries = cartEntries();
    const count = entries.reduce((sum,line) => sum + line.qty,0);
    const total = entries.reduce((sum,line) => sum + line.price*line.qty,0);
    $("#cartCount").textContent = count;
    $("#cartSubtotal").textContent = money(total);
    $("#checkoutTotal").textContent = money(total);
    $("#cartLines").innerHTML = entries.map(line => `
      <div class="cart-line">
        <img src="${imagePath(safe(line.product.image))}" alt="${safe(line.product.name)}">
        <div><h4>${safe(line.product.name)}</h4><small>${safe(line.size)} · ${money(line.price)} each</small>
          <div class="qty-control">
            <button type="button" data-qty="-1" data-key="${safe(line.key)}" aria-label="Decrease quantity">−</button>
            <span>${line.qty}</span>
            <button type="button" data-qty="1" data-key="${safe(line.key)}" aria-label="Increase quantity">+</button>
            <button type="button" class="remove-line" data-remove="${safe(line.key)}">Remove</button>
          </div>
        </div>
        <strong class="cart-line-price">${money(line.price*line.qty)}</strong>
      </div>`).join("");
    $("#cartEmpty").style.display = entries.length ? "none" : "block";
    $("#drawerFoot").style.display = entries.length ? "block" : "none";
  }

  function openCart() {
    $("#overlay").classList.add("open");
    $("#cartDrawer").classList.add("open");
    $("#cartDrawer").setAttribute("aria-hidden","false");
  }
  function closeCart() {
    $("#overlay").classList.remove("open");
    $("#cartDrawer").classList.remove("open");
    $("#cartDrawer").setAttribute("aria-hidden","true");
  }

  function openCheckout() {
    if (!cartEntries().length) { notify("Your basket is empty"); return; }
    closeCart();
    $("#checkoutBackdrop").classList.add("open");
  }

  $("#filterPills").addEventListener("click", e => {
    const button = e.target.closest("[data-filter]");
    if (!button) return;
    activeCategory = button.dataset.filter;
    document.querySelectorAll(".filter-pill").forEach(b => b.classList.toggle("active", b === button));
    renderProducts();
  });
  grid.addEventListener("click", e => {
    const trigger = e.target.closest("[data-view]");
    if (trigger) openProduct(trigger.dataset.view);
  });
  $("#productSearch").addEventListener("input", renderProducts);
  $("#sortProducts").addEventListener("change", renderProducts);
  document.querySelectorAll("[data-category-link]").forEach(link => link.addEventListener("click", () => {
    activeCategory = link.dataset.categoryLink;
    document.querySelectorAll(".filter-pill").forEach(b => b.classList.toggle("active", b.dataset.filter === activeCategory));
    renderProducts();
  }));
  $("#searchFocus").addEventListener("click", () => {
    document.querySelector("#shop").scrollIntoView({behavior:"smooth"});
    setTimeout(() => $("#productSearch").focus(), 450);
  });
  $("#openCart").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);
  $("#continueShopping").addEventListener("click", closeCart);
  $("#cartLines").addEventListener("click", e => {
    const qtyButton = e.target.closest("[data-qty]");
    const removeButton = e.target.closest("[data-remove]");
    if (qtyButton) {
      const line = cart[qtyButton.dataset.key];
      if (!line) return;
      line.qty += Number(qtyButton.dataset.qty);
      if (line.qty <= 0) delete cart[qtyButton.dataset.key];
      saveCart();
    }
    if (removeButton) { delete cart[removeButton.dataset.remove]; saveCart(); }
  });
  $("#goCheckout").addEventListener("click", openCheckout);
  $("#closeProductModal").addEventListener("click", closeProduct);
  $("#productModalBackdrop").addEventListener("click", e => { if (e.target === $("#productModalBackdrop")) closeProduct(); });
  $("#closeCheckout").addEventListener("click", () => $("#checkoutBackdrop").classList.remove("open"));
  $("#checkoutBackdrop").addEventListener("click", e => { if (e.target === $("#checkoutBackdrop")) $("#checkoutBackdrop").classList.remove("open"); });

  $("#checkoutForm").addEventListener("submit", e => {
    e.preventDefault();
    if (!cartEntries().length) { notify("Your basket is empty"); $("#checkoutBackdrop").classList.remove("open"); return; }
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const address = String(form.get("address") || "").trim();
    const city = String(form.get("city") || "").trim();
    const pin = String(form.get("pincode") || "").trim();
    const note = String(form.get("note") || "").trim();
    if (!/^[6-9]\d{9}$/.test(phone)) { notify("Enter a valid 10-digit Indian mobile number"); return; }
    if (pin && !/^\d{6}$/.test(pin)) { notify("Enter a valid 6-digit pincode"); return; }
    const entries = cartEntries();
    const total = entries.reduce((sum,line) => sum + line.price*line.qty,0);
    const itemLines = entries.map(line => `${line.product.name} — ${line.size} × ${line.qty} — ${money(line.price*line.qty)}`);
    const message = [
      "Vanakkam AUDATHAM! I would like to place an order:",
      "", ...itemLines, "", `Subtotal: ${money(total)}`, "",
      `Name: ${name}`, `Phone: ${phone}`,
      `Address: ${address}${city ? ", "+city : ""}${pin ? " - "+pin : ""}`,
      note ? `Note: ${note}` : ""
    ].filter(Boolean).join("\n");
    window.open(wa(message), "_blank", "noopener");
    $("#checkoutBackdrop").classList.remove("open");
    notify("WhatsApp opened. Please review and tap Send.");
    // Keep the basket until the customer explicitly clears it or continues shopping.
  });

  $("#menuToggle").addEventListener("click", () => $("#mainNav").classList.toggle("open"));
  $("#mainNav").addEventListener("click", e => { if (e.target.closest("a")) $("#mainNav").classList.remove("open"); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeCart(); closeProduct(); $("#checkoutBackdrop").classList.remove("open"); }
  });
  $("#year").textContent = new Date().getFullYear();
  renderProducts();
  renderCart();
})();