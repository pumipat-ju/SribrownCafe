export function readReceiptTotalsFromDom() {
  return {
    subtotal: parseFloat(document.getElementById('cart-subtotal')?.innerText.replace(/[฿,]/g, '')) || 0,
    vat: parseFloat(document.getElementById('cart-vat')?.innerText.replace(/[฿,]/g, '')) || 0,
    befVat: parseFloat(document.getElementById('cart-before-vat')?.innerText.replace(/[฿,]/g, '')) || 0,
  };
}

export function buildReceiptData(tx, totals, currentEmployeeName, summary) {
  return {
    ...tx,
    time: summary.timeStr,
    cashier: currentEmployeeName || 'Unknown',
    subtotal: totals.subtotal,
    discount: summary.totalDiscount ?? 0,
    autoDiscount: summary.autoDiscount ?? 0,
    vat: totals.vat,
    befVat: totals.befVat,
  };
}

export function buildConfirmModalContent(type, amount, method, member, appliedCouponId) {
  let extraDesc = '';
  if (member) extraDesc += `<br><span class="text-xs text-stone-500 mt-2 block">ลูกค้ารับสิทธิ์: ${member.nickname || member.name}</span>`;
  if (appliedCouponId && member) {
    const c = member.coupons.find((x) => x.id === appliedCouponId);
    if (c) extraDesc += `<br><span class="text-xs text-amber-600 font-bold mt-1 block">🎟️ ระบบจะทำการหักคูปอง ${c.name} 1 ใบ</span>`;
  }

  return {
    title: type === 'topup' ? 'ยืนยันเติมเงิน' : `ชำระด้วย ${method}`,
    desc: type === 'topup'
      ? `เพิ่มเงิน <b>฿${amount}</b> ให้ ${member.name}`
      : `ยอดชำระสุทธิ: <b class="text-xl text-primary">฿${amount}</b>${extraDesc}`,
  };
}

export function buildSuccessModalPayload(data) {
  let html = '';
  let docsHtml = '';

  if (data.type === 'topup') {
    html = `
      <div class="flex justify-between mb-2"><span class="text-stone-500">ลูกค้า:</span><span class="font-bold">${data.member.nickname || data.member.name}</span></div>
      <div class="flex justify-between text-emerald-600 font-bold mb-2"><span>ยอดเติม:</span><span>฿${data.amount}</span></div>
      <div class="border-t border-stone-200 border-dashed my-2"></div>
      <div class="flex justify-between font-black text-primary"><span>ยอดคงเหลือ:</span><span>฿${data.member.balance}</span></div>`;

    docsHtml = `
      <div class="flex justify-between text-xs items-center">
        <div class="flex gap-2 items-center text-stone-500"><span class="material-symbols-outlined text-[16px]">receipt</span> ใบเสร็จชั่วคราว</div>
        <span class="bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200"><span class="material-symbols-outlined text-[12px]">check_circle</span> Success</span>
      </div>`;

    return { title: 'เติมเงินสำเร็จ!', html, docsHtml };
  }

  const itemsHtml = data.cart.map((c) => `
    <div class="flex justify-between">
      <span>${c.qty}x <span class="truncate max-w-[100px] inline-block align-bottom">${c.name}</span></span>
      <span>฿${c.price * c.qty}</span>
    </div>`).join('');

  html = `
    <div class="border-b border-stone-200 border-dashed pb-3 mb-3 text-xs text-stone-600 space-y-1">
      <div class="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">รายการสินค้า</div>
      ${itemsHtml}
    </div>
    <div class="space-y-1 text-xs">
      <div class="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">ภาษีและส่วนลด</div>
      <div class="flex justify-between"><span class="text-stone-500">ราคาสินค้า</span><span>฿${data.befVat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
      <div class="flex justify-between"><span class="text-stone-500">VAT 7%</span><span>฿${data.vat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
      ${data.discount > 0 ? `<div class="flex justify-between text-primary"><span class="text-stone-500">ส่วนลดรวม</span><span>-฿${data.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>` : ''}
      <div class="flex justify-between font-black text-primary mt-2 text-lg border-t border-stone-100 pt-2"><span>Total</span><span>฿${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
    </div>`;

  if (data.method === 'E-Wallet' && data.member) {
    html += `<div class="flex justify-between items-center text-xs mt-3 pt-3 border-t border-stone-200 border-dashed"><span class="text-stone-500">คงเหลือ E-Wallet:</span><span class="font-black text-primary">฿${data.member.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>`;
  }

  docsHtml = `
    <div class="flex justify-between text-xs items-center mb-2">
      <div class="flex gap-2 items-center text-stone-500"><span class="material-symbols-outlined text-[16px]">receipt_long</span> ออเดอร์บาร์</div>
      <span class="bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200"><span class="material-symbols-outlined text-[12px]">check_circle</span> Success</span>
    </div>
    <div class="flex justify-between text-xs items-center">
      <div class="flex gap-2 items-center text-stone-500"><span class="material-symbols-outlined text-[16px]">request_quote</span> ใบกำกับภาษี</div>
      <span class="bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200"><span class="material-symbols-outlined text-[12px]">check_circle</span> Success</span>
    </div>`;

  return { title: 'ชำระเงินสำเร็จ!', html, docsHtml };
}

export function buildReceiptPrintHtml(data) {
  let html = `
    <div class="text-center mb-4 border-b border-dashed border-stone-800 pb-3">
      <h2 class="text-xl font-bold font-headline">SRI BROWN</h2>
      <p class="text-[10px]">Coffee Roastery</p>
      <p class="text-xs mt-2 font-bold">${data.type === 'topup' ? 'ใบเสร็จรับเงิน' : 'ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ'}</p>
      <p class="text-[10px] mt-1">วันที่: ${new Date().toLocaleDateString('th-TH')} | ${data.time}</p>
      <p class="text-[10px]">พนักงาน: ${data.cashier}</p>
    </div>`;

  if (data.type === 'deduct') {
    html += `<div class="border-b border-dashed border-stone-800 pb-3 mb-3">` + data.cart.map((c) => `
      <div class="flex justify-between text-xs mb-1"><span>${c.qty}x ${c.name}</span><span>${(c.price * c.qty).toLocaleString('en-US')}</span></div>
      ${c.note ? `<div class="text-[9px] text-stone-500 pl-4">- ${c.note}</div>` : ''}
    `).join('') + `</div>`;

    html += `<div class="space-y-1 text-xs border-b border-dashed border-stone-800 pb-3 mb-3">
      <div class="flex justify-between"><span>รวมเงิน:</span><span>${data.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>`;
    if (data.autoDiscount > 0) html += `<div class="flex justify-between"><span>โปรฯอัตโนมัติ/คูปอง:</span><span>-${data.autoDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>`;
    if (data.discount - data.autoDiscount > 0) html += `<div class="flex justify-between"><span>ส่วนลดเพิ่มเติม:</span><span>-${(data.discount - data.autoDiscount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>`;
    html += `<div class="flex justify-between font-bold text-sm mt-1"><span>ยอดสุทธิ:</span><span>${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div></div>`;
    html += `<div class="text-[10px] space-y-1 text-right">
      <p>มูลค่าสินค้า: ${data.befVat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      <p>VAT 7%: ${data.vat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      <p class="text-left mt-2">ชำระโดย: ${data.method}</p>
    </div>`;
    if (data.method === 'E-Wallet' && data.member) {
      html += `<div class="text-[10px] text-center border-t border-dashed border-stone-800 pt-2 mt-3">E-Wallet คงเหลือ: ฿${data.member.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>`;
    }
  } else {
    html += `<div class="text-sm font-bold text-center mb-4 border-b border-dashed border-stone-800 pb-4">เติมเงิน E-Wallet<br>ยอดเงิน: ฿${data.amount.toLocaleString('en-US')}</div>`;
    html += `<div class="text-[10px]"><p>ลูกค้า: ${data.member.name}</p><p>เบอร์: ${data.member.phone}</p><p class="font-bold mt-1">ยอดคงเหลือ: ฿${data.member.balance.toLocaleString('en-US')}</p></div>`;
  }

  html += `<div class="text-center text-[10px] mt-6 font-bold">ขอบคุณที่ใช้บริการ</div>`;
  return html;
}
