import { getRoleBadgeClass } from "../services/employeeService.js";

export function renderEmployeesTable(state, search = "") {
  const list = document.getElementById("table-employees");
  if (!list) return;

  const filtered = state.employees.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));
  if (filtered.length === 0) {
    list.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-stone-400 text-xs">ไม่พบข้อมูล</td></tr>`;
    return;
  }

  list.innerHTML = filtered.map((e) => {
    const roleClass = getRoleBadgeClass(e.role);
    const picHtml = e.profilePic
      ? `<img src="${e.profilePic}" class="w-8 h-8 rounded-full object-cover">`
      : `<div class="w-8 h-8 rounded-full bg-stone-800 text-white flex items-center justify-center font-bold text-xs">${e.name.charAt(0)}</div>`;

    return `
      <tr class="hover:bg-stone-50">
        <td class="p-3"><div class="flex items-center gap-3">${picHtml}<p class="font-bold text-sm">${e.name}</p></div></td>
        <td class="p-3"><span class="text-[10px] font-bold px-2 py-1 rounded border ${roleClass}">${e.role}</span></td>
        <td class="p-3 text-xs font-bold ${e.isClockedIn ? 'text-emerald-600' : 'text-stone-400'} flex items-center gap-1 mt-2">
          <div class="w-2 h-2 rounded-full ${e.isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}"></div>
          ${e.isClockedIn ? 'เข้างานอยู่ (Clocked In)' : 'ออกงานแล้ว (Clocked Out)'}
        </td>
        <td class="p-3 text-center"><button onclick="startEditEmp(${e.id})" class="text-stone-400 hover:text-primary transition-colors"><span class="material-symbols-outlined text-[18px]">edit</span></button></td>
      </tr>`;
  }).join("");
}
