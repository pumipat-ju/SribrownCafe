export function renderMarketingPanels(state) {
  renderTierSettings(state);
  renderPromotionList(state);
  renderCouponTemplates(state);
}

export function renderTierSettings(state) {
  const tierList = document.getElementById("marketing-tier-list");
  if (!tierList) return;

  const sortedTiers = [...state.marketing.tiers].sort((a, b) => a.minSpent - b.minSpent);
  tierList.innerHTML = sortedTiers.map((t) => `
    <div class="p-4 rounded-2xl border ${t.color.includes("border-") ? t.color.split(" ").find((c) => c.startsWith("border-")) : "border-stone-200"} bg-stone-50 flex flex-col md:flex-row gap-4 items-center relative overflow-hidden">
      <div class="absolute left-0 top-0 bottom-0 w-1.5 ${t.color.split(" ")[0]}"></div>
      <div class="w-full md:w-1/3 pl-3">
        <span class="text-xs font-bold uppercase tracking-widest text-stone-400 block mb-1">ระดับสมาชิก</span>
        <p class="font-black text-lg ${t.color.split(" ")[1]}">${t.name}</p>
      </div>
      <div class="w-full md:w-1/3">
        <label class="text-[10px] font-bold text-stone-500 block mb-1">ยอดใช้จ่ายสะสมขั้นต่ำ (฿)</label>
        <input type="number" id="tier-min-${t.id}" value="${t.minSpent}" class="w-full p-2 text-sm border border-stone-200 rounded-lg outline-none font-bold text-stone-700 bg-white focus:ring-2 focus:ring-primary/20">
      </div>
      <div class="w-full md:w-1/3">
        <label class="text-[10px] font-bold text-stone-500 block mb-1">ส่วนลดอัตโนมัติ (%)</label>
        <div class="relative">
          <input type="number" id="tier-disc-${t.id}" value="${t.discountPercent}" class="w-full p-2 pr-8 text-sm border border-stone-200 rounded-lg outline-none font-bold text-stone-700 bg-white focus:ring-2 focus:ring-primary/20">
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">%</span>
        </div>
      </div>
    </div>
  `).join("");
}

export function renderPromotionList(state) {
  const promoList = document.getElementById("marketing-promo-list");
  if (!promoList) return;

  promoList.innerHTML = state.marketing.promotions.map((p) => `
    <div class="p-4 rounded-xl border ${p.active ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-stone-50 opacity-60"} flex justify-between items-center transition-all">
      <div>
        <p class="font-bold text-sm text-stone-800">${p.name}</p>
        <p class="text-[10px] text-stone-500">${p.desc}</p>
      </div>
      <div onclick="window.SriBrownApp.togglePromotion('${p.id}')" class="w-10 h-6 ${p.active ? "bg-emerald-500" : "bg-stone-300"} rounded-full relative cursor-pointer shadow-inner transition-colors">
        <div class="w-4 h-4 bg-white rounded-full absolute ${p.active ? "right-1" : "left-1"} top-1 shadow-sm transition-all"></div>
      </div>
    </div>
  `).join("");
}

export function renderCouponTemplates(state) {
  const ctList = document.getElementById("marketing-coupon-list");
  if (!ctList) return;

  ctList.innerHTML = state.marketing.couponTemplates.map((ct) => `
    <div class="p-3 rounded-xl border border-stone-200 bg-stone-50 flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><span class="material-symbols-outlined">${ct.icon}</span></div>
      <div class="flex-1">
        <p class="font-bold text-sm text-stone-800">${ct.name} ${ct.type === "fixed_discount" ? "(" + ct.value + "฿)" : ""}</p>
        <p class="text-[10px] text-stone-500">${ct.desc}</p>
      </div>
      <button onclick="window.SriBrownApp.deleteCouponTemplate('${ct.id}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm shrink-0"><span class="material-symbols-outlined text-[16px]">delete</span></button>
    </div>
  `).join("");
}
