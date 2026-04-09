export function getDashboardSummary(state) {
  const sales = state.history.filter((h) => h.type === "deduct");
  const revenue = sales.reduce((sum, h) => sum + (h.amount || 0), 0);
  const totalOrders = sales.length;
  const totalMembers = state.members.length;
  const totalWalletBalance = state.members.reduce((sum, m) => sum + (m.balance || 0), 0);

  return {
    revenue,
    totalOrders,
    totalMembers,
    totalWalletBalance,
  };
}
