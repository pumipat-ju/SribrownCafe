export function getMenuItemById(state, id) {
  return state.menu.items.find((item) => item.id === id) || null;
}

export function getCategoryById(state, id) {
  return state.menu.categories.find((cat) => cat.id === id) || null;
}

export function saveCategoryRecord(state, name) {
  const record = { id: "cat_" + Date.now(), name };
  state.menu.categories.push(record);
  return record;
}

export function deleteCategoryRecord(state, id) {
  state.menu.categories = state.menu.categories.filter((cat) => cat.id !== id);
  return state.menu.categories;
}

export function saveItemRecord(state, payload) {
  if (payload.id) {
    const item = state.menu.items.find((x) => x.id == payload.id);
    if (item) {
      item.name = payload.name;
      item.price = payload.price;
      item.cat = payload.cat;
      item.rule = payload.rule;
      return item;
    }
  }

  const item = {
    id: Date.now(),
    name: payload.name,
    price: payload.price,
    cat: payload.cat,
    rule: payload.rule,
  };
  state.menu.items.push(item);
  return item;
}

export function deleteItemRecord(state, id) {
  state.menu.items = state.menu.items.filter((item) => item.id !== id);
  return state.menu.items;
}

export function buildSubOptionTypes(item) {
  if (!item) return [];
  if (item.rule === "espresso") {
    return [
      { id: "hot", n: "ร้อน", p: -20 },
      { id: "ice", n: "เย็น", p: 0 },
      { id: "frappe", n: "ปั่น", p: 20 },
    ];
  }

  if (item.rule === "americano") {
    return [
      { id: "hot", n: "ร้อน", p: 0 },
      { id: "ice", n: "เย็น", p: 0 },
    ];
  }

  if (item.rule === "iced_only") {
    return [{ id: "ice", n: "เย็น", p: 0 }];
  }

  if (item.rule === "standard") {
    return [
      { id: "hot", n: "ร้อน", p: 0 },
      { id: "ice", n: "เย็น", p: 0 },
      { id: "frappe", n: "ปั่น", p: 20 },
    ];
  }

  return [];
}

export function addCartItem(state, item, note = "", qty = 1) {
  const existing = state.pos.cart.find(
    (c) => c.itemId === item.id && c.note === note && c.price === item.price
  );

  if (existing) {
    existing.qty += qty;
    return existing;
  }

  const record = {
    cartId: Date.now(),
    itemId: item.id,
    name: item.name,
    price: item.price,
    qty,
    note,
    cat: item.cat,
  };
  state.pos.cart.push(record);
  return record;
}

export function updateCartQty(state, index, change) {
  if (!state.pos.cart[index]) return;
  state.pos.cart[index].qty += change;
  if (state.pos.cart[index].qty <= 0) {
    state.pos.cart.splice(index, 1);
  }
}

export function clearCartState(state) {
  state.pos.cart = [];
  state.pos.appliedCouponId = null;
  state.pos.cartMember = null;
  state.pos.paymentMethod = null;
}
