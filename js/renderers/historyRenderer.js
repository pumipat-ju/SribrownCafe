import { buildMobileHistoryCard, buildAdminHistoryCard } from "../services/historyService.js";

export function renderHistoryLists(state) {
  const mobileContainer = document.getElementById("c-history-list");
  const adminContainer = document.getElementById("admin-history-list");

  if (mobileContainer) mobileContainer.innerHTML = "";
  if (adminContainer) adminContainer.innerHTML = "";

  if (state.history.length === 0) {
    if (adminContainer) adminContainer.innerHTML = `<p class="text-center text-sm text-stone-400 py-4">ไม่มีประวัติรายการ</p>`;
    if (mobileContainer) mobileContainer.innerHTML = `<p class="text-center text-sm text-stone-400 py-4">ไม่มีประวัติรายการ</p>`;
    return;
  }

  state.history.forEach((item) => {
    const member = state.members.find((m) => m.phone === item.memberPhone);
    const memberName = member ? (member.nickname || member.name) : "ลูกค้าทั่วไป";

    if (item.memberPhone === "081-123-4567" && mobileContainer) {
      mobileContainer.insertAdjacentHTML("beforeend", buildMobileHistoryCard(item));
    }
    if (adminContainer) {
      adminContainer.insertAdjacentHTML("beforeend", buildAdminHistoryCard(item, memberName));
    }
  });
}
