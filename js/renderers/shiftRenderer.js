import { formatMoney } from "../utils.js";
import { getExpectedCash } from "../services/shiftService.js";

export function renderShiftStatus(state) {
  const overlay = document.getElementById("pos-shift-overlay");
  const btnClose = document.getElementById("btn-close-shift");
  if (!overlay || !btnClose) return;

  if (state.shift.isOpen) {
    overlay.classList.add("hidden");
    btnClose.classList.remove("hidden");
    btnClose.classList.add("flex");
  } else {
    overlay.classList.remove("hidden");
    btnClose.classList.add("hidden");
    btnClose.classList.remove("flex");
  }
}

export function renderDrawerLogs(state) {
  const tbody = document.getElementById("drawer-logs-table");
  if (!tbody) return;

  const cashOut = document.getElementById("dash-cash-out");
  const cashIn = document.getElementById("dash-cash-in");
  const expectedEl = document.getElementById("dash-expected-cash");

  if (cashOut) cashOut.innerText = formatMoney(state.shift.cashOut);
  if (cashIn) cashIn.innerText = formatMoney(state.shift.cashIn);

  if (expectedEl) {
    if (state.shift.isOpen) {
      expectedEl.innerText = formatMoney(getExpectedCash(state.shift));
      expectedEl.classList.remove("text-stone-400");
    } else {
      expectedEl.innerText = "ยังไม่เปิดกะ";
      expectedEl.classList.add("text-stone-400");
    }
  }

  if (state.drawerLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-stone-400 text-xs">ไม่มีรายการ</td></tr>`;
    return;
  }

  tbody.innerHTML = state.drawerLogs.map((log) => {
    const isIncome = log.type === "income";
    const colAmount = isIncome ? "text-emerald-600" : "text-red-500";
    const iconMethod = log.method === "drawer" ? "payments" : "account_balance";
    const textMethod = log.method === "drawer" ? "ลิ้นชัก" : "เงินโอนร้าน";
    return `
      <tr class="hover:bg-stone-50">
        <td class="p-4 text-xs text-stone-500">${log.time}</td>
        <td class="p-4"><p class="font-bold text-sm text-stone-800">${log.reason}</p><p class="text-[10px] text-stone-400">โดย: ${log.by}</p></td>
        <td class="p-4"><span class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-stone-500"><span class="material-symbols-outlined text-[14px]">${iconMethod}</span> ${textMethod}</span></td>
        <td class="p-4 text-right font-black text-sm ${colAmount}">${isIncome ? "+" : "-"} ${formatMoney(log.amount)}</td>
      </tr>
    `;
  }).join("");
}
