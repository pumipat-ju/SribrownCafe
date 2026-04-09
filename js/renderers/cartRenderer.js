import { formatMoney } from "../utils.js";

export function renderCartItems(state) {
  const container = document.getElementById("cart-container");
  const badge = document.getElementById("cart-count");
  if (!container || !badge) return;

  const totalQty = state.pos.cart.reduce((sum, item) => sum + item.qty, 0);

  if (state.pos.cart.length === 0) {
    container.innerHTML = `<div class="flex flex-col items-center justify-center py-8 text-stone-300 opacity-50"><span class="material-symbols-outlined text-4xl mb-2">shopping_basket</span><p class="text-[10px] font-bold uppercase tracking-widest">ตะกร้าว่างเปล่า</p></div>`;
    badge.classList.add("hidden");
    return;
  }

  badge.classList.remove("hidden");
  badge.innerText = totalQty;

  container.innerHTML = state.pos.cart.map((c, i) => `
    <div class="flex justify-between items-center p-2.5 bg-white border border-stone-200 rounded-xl mb-2 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
      <div class="flex-1 pr-2">
        <p class="text-sm font-bold text-stone-800">${c.name}</p>
        ${c.note ? `<p class="text-[9px] text-stone-500 leading-tight mt-0.5">${c.note}</p>` : ""}
        <p class="text-xs text-primary font-bold mt-1">฿${c.price}</p>
      </div>
      <div class="flex items-center gap-2 bg-stone-50 rounded-md border border-stone-200 p-1 shrink-0">
        <button onclick="window.SriBrownApp.updateQty(${i}, -1)" class="w-6 h-6 flex justify-center items-center text-stone-500 hover:bg-stone-200 rounded transition-colors"><span class="material-symbols-outlined text-[16px]">${c.qty === 1 ? "delete" : "remove"}</span></button>
        <span class="text-xs font-bold w-4 text-center">${c.qty}</span>
        <button onclick="window.SriBrownApp.updateQty(${i}, 1)" class="w-6 h-6 flex justify-center items-center text-stone-500 hover:bg-stone-200 rounded transition-colors"><span class="material-symbols-outlined text-[16px]">add</span></button>
      </div>
    </div>
  `).join("");
}

export function renderCartCouponSection(state, summary) {
  const section = document.getElementById("cart-coupon-section");
  const select = document.getElementById("cart-coupon-select");
  const countEl = document.getElementById("available-coupon-count");

  if (!section || !select || !countEl) return;

  if (!state.pos.cartMember || state.pos.cart.length === 0) {
    section.classList.add("hidden");
    return;
  }

  const unusedCoupons = state.pos.cartMember.coupons.filter((c) => !c.used);
  if (unusedCoupons.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  countEl.innerText = unusedCoupons.length;

  select.innerHTML = unusedCoupons.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  if (state.pos.appliedCouponId) {
    select.value = String(state.pos.appliedCouponId);
  }
}

export function renderCartSummary(summary) {
  const autoPromoAlert = document.getElementById("auto-promo-alert");
  const autoPromoRow = document.getElementById("row-auto-discount");

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };

  setText("cart-subtotal", formatMoney(summary.subtotal));
  setText("cart-auto-discount", "-" + formatMoney(summary.autoDiscount));
  setText("cart-discount", "-" + formatMoney(summary.manualDiscount));
  setText("cart-before-vat", formatMoney(summary.beforeVat));
  setText("cart-vat", formatMoney(summary.vat));
  setText("cart-total", formatMoney(summary.total));

  if (summary.autoDiscount > 0) {
    autoPromoRow?.classList.remove("hidden");
    if (autoPromoAlert) {
      autoPromoAlert.classList.remove("hidden");
      autoPromoAlert.classList.add("flex");
      autoPromoAlert.innerHTML = summary.autoPromoDetails.map((d) => `
        <div class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">redeem</span>${d}
        </div>
      `).join("");
    }
  } else {
    autoPromoRow?.classList.add("hidden");
    if (autoPromoAlert) {
      autoPromoAlert.classList.add("hidden");
      autoPromoAlert.classList.remove("flex");
      autoPromoAlert.innerHTML = "";
    }
  }
}

export function renderPaymentButtons(state, summary) {
  const btnCash = document.getElementById("btn-pay-cash");
  const btnQr = document.getElementById("btn-pay-qr");
  const btnEwallet = document.getElementById("btn-pay-ewallet");

  if (!btnCash || !btnQr || !btnEwallet) return;

  if (state.pos.cartMember) {
    btnCash.classList.add("opacity-50", "pointer-events-none", "grayscale");
    btnQr.classList.add("opacity-50", "pointer-events-none", "grayscale");

    btnEwallet.classList.remove("opacity-50", "pointer-events-none", "bg-stone-800");
    btnEwallet.classList.add("bg-primary", "shadow-lg", "shadow-primary/30");
    btnEwallet.innerHTML = `<span class="material-symbols-outlined text-amber-400 text-[16px]">wallet</span> ตัดเงิน E-Wallet (${formatMoney(summary.total)})`;
  } else {
    btnCash.classList.remove("opacity-50", "pointer-events-none", "grayscale");
    btnQr.classList.remove("opacity-50", "pointer-events-none", "grayscale");

    btnEwallet.classList.add("opacity-50", "pointer-events-none", "bg-stone-800");
    btnEwallet.classList.remove("bg-primary", "shadow-lg", "shadow-primary/30");
    btnEwallet.innerHTML = `<span class="material-symbols-outlined text-amber-400 text-[16px]">wallet</span> ชำระด้วย E-Wallet (เฉพาะสมาชิก)`;
  }
}

export function syncCustomerFacingDisplay(state, summary) {
  const cfd = document.getElementById("c-cfd");
  const itemsEl = document.getElementById("c-cfd-items");
  const totalEl = document.getElementById("c-cfd-total");

  if (!cfd || !itemsEl || !totalEl) return;

  if (state.pos.cart.length === 0) {
    cfd.classList.add("hidden");
    return;
  }

  cfd.classList.remove("hidden");
  itemsEl.innerHTML = state.pos.cart.map((c) => `
    <div class="flex justify-between">
      <span>${c.qty}x ${c.name} ${c.note ? `<span class="text-[9px] text-stone-400">(${c.note})</span>` : ""}</span>
      <span class="font-bold">฿${c.price * c.qty}</span>
    </div>
  `).join("");
  totalEl.innerText = formatMoney(summary.total);
}
