import { formatMoney } from '../utils.js';
import { markCouponUsed, upgradeMemberTier } from './memberService.js';

export function getCartTotalFromDom() {
  return parseFloat(document.getElementById('cart-total')?.innerText.replace(/[฿,]/g, '')) || 0;
}

export function buildPendingTransaction(type, amount, method, member, cart) {
  return { type, amount, method, member, cart: [...cart] };
}

export function validatePaymentRequest(state, method, total) {
  const member = state.pos.cartMember;

  if (total <= 0 && !state.pos.appliedCouponId) {
    return { ok: false, reason: 'ตะกร้าว่างเปล่า' };
  }

  if (method === 'ewallet') {
    if (!member) {
      return { ok: false, reason: 'กรุณาผูกสมาชิกก่อนชำระด้วย E-Wallet' };
    }
    if (member.balance < total) {
      const lackAmt = total - member.balance;
      return { ok: false, reason: `เงินใน E-Wallet ไม่พอ! ขาดอีก ${formatMoney(lackAmt)}`, lackAmount: lackAmt };
    }
    return { ok: true, member, displayMethod: 'E-Wallet' };
  }

  if (member) {
    return { ok: false, reason: 'เมื่อผูกสมาชิกแล้ว ต้องชำระผ่าน E-Wallet เท่านั้น' };
  }

  return { ok: true, member: null, displayMethod: method === 'cash' ? 'เงินสด' : 'QR Code' };
}

export function executePendingTransaction(state, tx, currentEmployeeName) {
  let upgradeTier = null;
  let usedCoupon = null;

  if (tx.type === 'topup') {
    tx.member.balance += tx.amount;
    if (tx.method === 'เงินสด') state.shift.topupCash += tx.amount;
  } else if (tx.type === 'deduct') {
    if (state.pos.appliedCouponId && tx.member) {
      usedCoupon = markCouponUsed(tx.member, state.pos.appliedCouponId);
    }

    if (tx.method === 'E-Wallet') {
      tx.member.balance -= tx.amount;
      if (tx.member) {
        tx.member.totalSpent += tx.amount;
        upgradeTier = upgradeMemberTier(tx.member, state.marketing.tiers);
      }
    } else if (tx.method === 'เงินสด') {
      state.shift.salesCash += tx.amount;
    }
  }

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const titleStr = tx.type === 'topup'
    ? 'เติมเงิน E-Wallet'
    : tx.cart.map((c) => `${c.qty}x ${c.name}`).join(', ');

  state.history.unshift({
    id: Date.now(),
    type: tx.type,
    method: tx.method,
    memberPhone: tx.member ? tx.member.phone : null,
    title: titleStr,
    amount: tx.amount,
    time: `วันนี้ ${timeStr}`,
    icon: tx.type === 'topup' ? 'wallet' : 'receipt_long',
    cashier: currentEmployeeName || 'Unknown',
  });

  return {
    timeStr,
    upgradeTier,
    usedCoupon,
  };
}
