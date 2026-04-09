export function getExpectedCash(shift) {
  return (shift.startCash || 0)
    + (shift.salesCash || 0)
    + (shift.topupCash || 0)
    + (shift.cashIn || 0)
    - (shift.cashOut || 0);
}

export function openShift(state, startCash) {
  const now = new Date();
  state.shift.isOpen = true;
  state.shift.startCash = startCash;
  state.shift.salesCash = 0;
  state.shift.topupCash = 0;
  state.shift.cashIn = 0;
  state.shift.cashOut = 0;
  state.shift.openedBy = state.currentEmployee ? state.currentEmployee.name : "Unknown";
  state.shift.openTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  state.drawerLogs = [];
  return state.shift;
}

export function closeShift(state) {
  const expected = getExpectedCash(state.shift);
  state.shift.isOpen = false;
  state.shift.startCash = 0;
  state.shift.salesCash = 0;
  state.shift.topupCash = 0;
  state.shift.cashIn = 0;
  state.shift.cashOut = 0;
  state.shift.openedBy = null;
  state.shift.openTime = null;
  state.drawerLogs = [];
  return expected;
}

export function appendDrawerLog(state, payload) {
  const now = new Date();
  state.drawerLogs.unshift({
    id: Date.now(),
    time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
    ...payload,
  });
  return state.drawerLogs[0];
}
