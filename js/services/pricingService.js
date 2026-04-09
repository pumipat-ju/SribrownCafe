import { formatMoney } from "../utils.js";

const DRINK_CATEGORIES = ["coffee", "tea", "milk", "soda"];
const BAKERY_CATEGORIES = ["bakery", "cake"];

export function getManualDiscountValue() {
  const valueEl = document.getElementById("cart-discount-val");
  return parseFloat(valueEl?.value || "0") || 0;
}

export function getManualDiscountType() {
  return document.getElementById("cart-discount-type")?.value || "amount";
}

export function calculateCouponDiscount(cart, member, appliedCouponId) {
  if (!member || !appliedCouponId) {
    return { amount: 0, details: [], removedPromoItemPrice: null, validCoupon: null };
  }

  const coupon = member.coupons?.find((c) => c.id === appliedCouponId && !c.used);
  if (!coupon) {
    return { amount: 0, details: [], removedPromoItemPrice: null, validCoupon: null };
  }

  let amount = 0;
  let removedPromoItemPrice = null;

  if (coupon.type === "free_drink") {
    const eligible = [];
    cart.forEach((item) => {
      if (DRINK_CATEGORIES.includes(item.cat)) {
        for (let i = 0; i < item.qty; i += 1) eligible.push(item.price);
      }
    });
    eligible.sort((a, b) => a - b);
    if (eligible.length > 0) {
      amount = eligible[0];
      removedPromoItemPrice = eligible[0];
    } else {
      return { amount: 0, details: ["คูปองนี้ใช้ได้เฉพาะหมวดเครื่องดื่ม"], removedPromoItemPrice: null, validCoupon: null };
    }
  }

  if (coupon.type === "free_bakery") {
    const eligible = [];
    cart.forEach((item) => {
      if (BAKERY_CATEGORIES.includes(item.cat)) {
        for (let i = 0; i < item.qty; i += 1) eligible.push(item.price);
      }
    });
    eligible.sort((a, b) => a - b);
    if (eligible.length > 0) {
      amount = eligible[0];
    } else {
      return { amount: 0, details: ["คูปองนี้ใช้ได้เฉพาะหมวดเบเกอรี่/เค้ก"], removedPromoItemPrice: null, validCoupon: null };
    }
  }

  if (coupon.type === "fixed_discount") {
    amount = coupon.value || 0;
  }

  return {
    amount,
    details: amount > 0 ? [`${coupon.name} (-${formatMoney(amount)})`] : [],
    removedPromoItemPrice,
    validCoupon: coupon,
  };
}

export function calculatePromotionDiscount(cart, marketing, removedPromoItemPrice = null) {
  const promo = marketing.promotions?.find((p) => p.id === "promo_1" && p.active);
  if (!promo) return { amount: 0, details: [] };

  const coffeePrices = [];
  cart.forEach((item) => {
    if (item.cat === "coffee") {
      for (let i = 0; i < item.qty; i += 1) coffeePrices.push(item.price);
    }
  });

  coffeePrices.sort((a, b) => a - b);

  if (removedPromoItemPrice !== null) {
    const index = coffeePrices.indexOf(removedPromoItemPrice);
    if (index !== -1) coffeePrices.splice(index, 1);
  }

  if (coffeePrices.length < 2) return { amount: 0, details: [] };

  const discountCupCount = Math.floor(coffeePrices.length / 2);
  let amount = 0;
  for (let i = 0; i < discountCupCount; i += 1) {
    amount += coffeePrices[i] * 0.5;
  }

  return {
    amount,
    details: amount > 0 ? [promo.name] : [],
  };
}

export function calculateTierDiscount(subtotal, member, marketing, previousAutoDiscount = 0) {
  if (!member || subtotal <= 0) return { amount: 0, details: [] };

  const tier = marketing.tiers?.find((t) => t.name === member.tier);
  if (!tier || !tier.discountPercent) return { amount: 0, details: [] };

  const base = Math.max(0, subtotal - previousAutoDiscount);
  const amount = base * (tier.discountPercent / 100);

  return {
    amount,
    details: amount > 0 ? [`${tier.name} ลด ${tier.discountPercent}%`] : [],
  };
}

export function calculateCartSummary(state) {
  const { cart, cartMember, appliedCouponId } = state.pos;
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const couponResult = calculateCouponDiscount(cart, cartMember, appliedCouponId);
  const promoResult = calculatePromotionDiscount(cart, state.marketing, couponResult.removedPromoItemPrice);
  const tierResult = calculateTierDiscount(subtotal, cartMember, state.marketing, couponResult.amount + promoResult.amount);

  const autoDiscount = couponResult.amount + promoResult.amount + tierResult.amount;

  const manualDiscountValue = getManualDiscountValue();
  const manualDiscountType = getManualDiscountType();
  const manualDiscount = manualDiscountType === "percent"
    ? subtotal * (manualDiscountValue / 100)
    : manualDiscountValue;

  const totalDiscount = autoDiscount + manualDiscount;
  const total = Math.max(0, subtotal - totalDiscount);
  const vat = total * 7 / 107;
  const beforeVat = total - vat;

  return {
    subtotal,
    autoDiscount,
    manualDiscount,
    totalDiscount,
    total,
    vat,
    beforeVat,
    couponResult,
    promoResult,
    tierResult,
    autoPromoDetails: [
      ...couponResult.details,
      ...promoResult.details,
      ...tierResult.details,
    ],
  };
}
