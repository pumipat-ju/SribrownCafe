import { formatMoney } from "../utils.js";

export function renderDashboard(summary) {
  const rev = document.getElementById("dash-revenue");
  const orders = document.getElementById("dash-orders");
  const wallet = document.getElementById("sys-total-ewallet");

  if (rev) rev.innerText = formatMoney(summary.revenue);
  if (orders) orders.innerText = summary.totalOrders;
  if (wallet) wallet.innerText = formatMoney(summary.totalWalletBalance);
}
