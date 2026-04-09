import { formatMoney } from "../utils.js";

export function renderMembersTable(state) {
  const searchInput = document.getElementById("search-member");
  const search = searchInput ? searchInput.value.toLowerCase() : "";
  const list = document.getElementById("table-members");
  if (!list) return;

  const filtered = state.members.filter((m) =>
    m.name.toLowerCase().includes(search) ||
    m.phone.includes(search) ||
    (m.nickname && m.nickname.toLowerCase().includes(search))
  );

  if (filtered.length === 0) {
    list.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-stone-400 text-xs">ไม่พบข้อมูล</td></tr>`;
    return;
  }

  list.innerHTML = filtered.map((m) => {
    const name = m.nickname ? `${m.nickname} (${m.name})` : m.name;
    const initial = (m.nickname || m.name).charAt(0);
    const pic = m.profilePic
      ? `<img src="${m.profilePic}" class="w-8 h-8 rounded-full object-cover">`
      : `<div class="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold">${initial}</div>`;

    const tierClass =
      m.tier === "Platinum"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : m.tier === "Gold"
        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
        : "bg-stone-100 text-stone-600 border-stone-200";

    return `
      <tr class="hover:bg-stone-50 transition-colors group">
        <td class="p-3 cursor-pointer" onclick="window.SriBrownApp.viewMemberProfile(${m.id})">
          <div class="flex items-center gap-3">${pic}<div><p class="font-bold group-hover:text-primary transition-colors">${name}</p><p class="text-[10px] text-stone-500">${m.phone}</p></div></div>
        </td>
        <td class="p-3 text-center cursor-pointer" onclick="window.SriBrownApp.viewMemberProfile(${m.id})">
          <span class="text-[10px] font-bold px-2 py-1 rounded border ${tierClass}">${m.tier}</span>
        </td>
        <td class="p-3 text-right text-stone-600 font-bold cursor-pointer" onclick="window.SriBrownApp.viewMemberProfile(${m.id})">${formatMoney(m.totalSpent)}</td>
        <td class="p-3 text-right font-black ${m.balance > 0 ? "text-primary" : "text-stone-400"} cursor-pointer" onclick="window.SriBrownApp.viewMemberProfile(${m.id})">${formatMoney(m.balance)}</td>
        <td class="p-3 text-center flex justify-center gap-2">
          <button onclick="window.SriBrownApp.startTopup(${m.id})" class="text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors active:scale-95 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">add</span> เติมเงิน</button>
          <button onclick="window.SriBrownApp.openGiveCouponModal(${m.id})" class="text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors active:scale-95 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">local_activity</span> แจก</button>
        </td>
      </tr>
    `;
  }).join("");
}

export function renderMemberProfileModal(state, memberId) {
  const m = state.members.find((x) => x.id === memberId);
  if (!m) return;

  document.getElementById("mp-name").innerText = m.nickname ? `${m.nickname} (${m.name})` : m.name;
  document.getElementById("mp-phone").innerText = m.phone;
  document.getElementById("mp-tier").innerText = m.tier;
  document.getElementById("mp-balance").innerText = formatMoney(m.balance);

  const picContainer = document.getElementById("mp-pic-container");
  if (picContainer) {
    if (m.profilePic) {
      picContainer.innerHTML = `<img src="${m.profilePic}" class="w-full h-full object-cover">`;
    } else {
      picContainer.innerHTML = (m.nickname || m.name).charAt(0);
    }
  }

  const list = document.getElementById("mp-history-list");
  if (!list) return;

  const history = state.history.filter((h) => h.memberPhone === m.phone);
  if (history.length === 0) {
    list.innerHTML = '<p class="text-center text-sm text-stone-400 py-8">ยังไม่มีประวัติทำรายการ</p>';
    return;
  }

  list.innerHTML = history.map((h) => {
    const isTopup = h.type === "topup";
    return `
      <div class="flex justify-between items-center p-3 border-b border-stone-200/60 last:border-0 bg-white rounded-lg mb-1 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center ${isTopup ? "bg-emerald-50 text-emerald-600" : "bg-primary/10 text-primary"}">
            <span class="material-symbols-outlined text-[14px]">${h.icon}</span>
          </div>
          <div>
            <p class="font-bold text-xs text-stone-800 line-clamp-1">${h.title}</p>
            <p class="text-[9px] text-stone-500 mt-0.5">${h.time}</p>
          </div>
        </div>
        <div class="font-black text-sm ${isTopup ? "text-emerald-600" : "text-primary"}">${isTopup ? "+" : "-"} ${formatMoney(h.amount)}</div>
      </div>
    `;
  }).join("");
}
