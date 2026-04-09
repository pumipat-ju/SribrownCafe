import { ROLES } from "../state.js";

export function canTogglePromotionByEmployee(employee) {
  return !!employee && ROLES[employee.role] >= ROLES["Owner"];
}

export function togglePromotionState(state, promoId) {
  const promo = state.marketing.promotions.find((p) => p.id === promoId);
  if (!promo) return { ok: false, reason: "ไม่พบโปรโมชัน" };
  promo.active = !promo.active;
  return { ok: true, promo };
}

export function saveTierSettingsFromDom(state) {
  state.marketing.tiers.forEach((tier) => {
    const minInput = document.getElementById(`tier-min-${tier.id}`);
    const discInput = document.getElementById(`tier-disc-${tier.id}`);
    if (minInput && discInput) {
      tier.minSpent = parseFloat(minInput.value) || 0;
      tier.discountPercent = parseFloat(discInput.value) || 0;
    }
  });
  return state.marketing.tiers;
}
