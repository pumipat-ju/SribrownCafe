export function renderMenuCategories(state, activeCategory) {
  const clist = document.getElementById("cat-list");
  if (!clist) return;

  clist.innerHTML = state.menu.categories.map((c) => `
    <button onclick="window.SriBrownApp.setActiveCategory('${c.id}')" class="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors ${activeCategory === c.id ? "bg-stone-800 text-white shadow-md" : "bg-white text-stone-500 border border-stone-200"}">${c.name}</button>
  `).join("");
}

export function renderMenuGrid(state, activeCategory) {
  const list = document.getElementById("menu-list");
  if (!list) return;

  list.innerHTML = state.menu.items
    .filter((m) => m.cat === activeCategory)
    .map((m) => {
      const qtyInCart = state.pos.cart
        .filter((c) => c.itemId === m.id)
        .reduce((sum, c) => sum + c.qty, 0);

      const badge = qtyInCart > 0
        ? `<div class="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md border-2 border-white animate-fade-in">${qtyInCart}</div>`
        : "";

      return `
        <div class="p-3 bg-white border border-stone-200 rounded-2xl text-left hover:border-primary active:scale-95 transition-all shadow-sm flex flex-col justify-between min-h-[90px] cursor-pointer relative" onclick="window.SriBrownApp.handleMenuClick(${m.id})">
          ${badge}
          <div>
            <p class="text-xs font-bold text-stone-800 line-clamp-2">${m.name}</p>
            <p class="text-[10px] text-primary font-bold mt-1">฿${m.price}${m.rule !== "none" ? "+" : ""}</p>
          </div>
        </div>
      `;
    }).join("");
}

export function renderAdminMenu(state, adminActiveCategory) {
  const catList = document.getElementById("admin-cat-list");
  if (catList) {
    catList.innerHTML = state.menu.categories.map((c) => `
      <li class="flex justify-between items-center p-3 bg-stone-50 border border-stone-200 rounded-xl hover:bg-stone-100">
        <span class="text-sm font-bold text-stone-800">${c.name}</span>
        <button onclick="window.SriBrownApp.deleteCategory('${c.id}')" class="text-stone-400 hover:text-red-500"><span class="material-symbols-outlined text-[16px]">delete</span></button>
      </li>
    `).join("");
  }

  const filterContainer = document.getElementById("admin-item-filter");
  if (filterContainer) {
    filterContainer.innerHTML =
      `<button onclick="window.SriBrownApp.setAdminActiveCategory('all')" class="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${adminActiveCategory === "all" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"}">ทั้งหมด</button>` +
      state.menu.categories.map((c) => `
        <button onclick="window.SriBrownApp.setAdminActiveCategory('${c.id}')" class="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${adminActiveCategory === c.id ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"}">${c.name}</button>
      `).join("");
  }

  const itemList = document.getElementById("admin-item-list");
  if (!itemList) return;

  const filteredItems = adminActiveCategory === "all"
    ? state.menu.items
    : state.menu.items.filter((i) => i.cat === adminActiveCategory);

  if (filteredItems.length === 0) {
    itemList.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-stone-400 text-xs">ไม่มีรายการสินค้า</td></tr>`;
    return;
  }

  itemList.innerHTML = filteredItems.map((i) => {
    const catName = state.menu.categories.find((c) => c.id === i.cat)?.name || "ไม่ทราบหมวดหมู่";
    return `
      <tr class="hover:bg-stone-50">
        <td class="p-3"><p class="font-bold text-sm text-stone-800">${i.name}</p><p class="text-[10px] text-stone-500">${catName}</p></td>
        <td class="p-3 font-bold text-primary">฿${i.price}</td>
        <td class="p-3"><span class="text-[10px] font-bold px-2 py-1 rounded border bg-stone-100 text-stone-600 border-stone-200">${i.rule}</span></td>
        <td class="p-3 text-center">
          <button onclick="window.SriBrownApp.startEditItem(${i.id})" class="text-stone-400 hover:text-primary transition-colors mr-2"><span class="material-symbols-outlined text-[16px]">edit</span></button>
          <button onclick="window.SriBrownApp.deleteItem(${i.id})" class="text-stone-400 hover:text-red-500 transition-colors"><span class="material-symbols-outlined text-[16px]">delete</span></button>
        </td>
      </tr>
    `;
  }).join("");
}
