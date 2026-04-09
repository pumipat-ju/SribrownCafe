export function getDisplayMethod(method) {
  if (method === "ewallet") return "E-Wallet";
  if (method === "qr") return "QR Code";
  return "เงินสด";
}

export function buildMobileHistoryCard(item) {
  const isTopup = item.type === "topup";
  const methodText = getDisplayMethod(item.method);

  return `
    <div class="flex items-center justify-between p-4 bg-white rounded-[1.25rem] border border-stone-100 shadow-sm mb-3">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-full flex items-center justify-center ${isTopup ? 'bg-stone-100 text-stone-600' : 'bg-primary/5 text-primary'}">
          <span class="material-symbols-outlined">${item.icon}</span>
        </div>
        <div>
          <p class="font-bold text-on-surface text-sm line-clamp-2 max-w-[180px]">${item.title}</p>
          <p class="text-[11px] text-stone-400 mt-0.5">${item.time} • ${methodText}</p>
        </div>
      </div>
      <div class="text-right shrink-0 ml-2">
        <p class="font-bold text-sm ${isTopup ? 'text-stone-600' : 'text-primary'}">${isTopup ? '+' : '-'} ฿${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      </div>
    </div>`;
}

export function buildAdminHistoryCard(item, memberName) {
  const isTopup = item.type === "topup";
  const methodText = getDisplayMethod(item.method);

  return `
    <div class="flex items-center justify-between p-4 border-b border-stone-100 last:border-0 hover:bg-stone-50 rounded-xl transition-colors">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-full flex items-center justify-center ${isTopup ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'}">
          <span class="material-symbols-outlined text-sm">${item.icon}</span>
        </div>
        <div>
          <p class="font-bold text-on-surface text-sm">${item.title}</p>
          <p class="text-[11px] text-stone-400 mt-0.5 flex gap-2">
            <span>${item.time}</span><span>•</span>
            <span class="font-medium text-stone-600">[${methodText}] ${memberName}</span><span>•</span>
            <span class="text-stone-400">พนักงาน: ${item.cashier || 'Unknown'}</span>
          </p>
        </div>
      </div>
      <div class="text-right">
        <p class="font-black text-base ${isTopup ? 'text-emerald-600' : 'text-primary'}">${isTopup ? '+' : '-'} ฿${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      </div>
    </div>`;
}
