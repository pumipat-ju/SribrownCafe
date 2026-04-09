import { findEmployeeByPin, getPermissionResult } from './services/permissionService.js';
import { calculateCartSummary } from './services/pricingService.js';
import {
    renderCartItems,
    renderCartCouponSection,
    renderCartSummary,
    renderPaymentButtons,
    syncCustomerFacingDisplay,
} from './renderers/cartRenderer.js';

import { ROLES, state } from './state.js';
import { showToast, openModal, closeModal, formatMoney } from './utils.js';
import { findMemberById, applyTopup } from './services/memberService.js';
import { getCartTotalFromDom, buildPendingTransaction, validatePaymentRequest, executePendingTransaction } from './services/checkoutService.js';
import { readReceiptTotalsFromDom, buildReceiptData, buildConfirmModalContent, buildSuccessModalPayload, buildReceiptPrintHtml } from './services/receiptService.js';
import { findActiveEmployeeByPin, toggleEmployeeClock, appendTimeLog, saveEmployeeRecord } from './services/employeeService.js';
import { canTogglePromotionByEmployee, togglePromotionState, saveTierSettingsFromDom } from './services/marketingService.js';
import { renderEmployeesTable } from './renderers/employeeRenderer.js';
import { renderHistoryLists } from './renderers/historyRenderer.js';

let currentView = 'admin';
        let activeCategory = 'coffee';
        let adminActiveCategory = 'all';
        let pendingTx = null;
        let tempEmpPic = null;


        

        // ================= AUTHENTICATION & LOGIN =================
        function handleLogin() {
            const pin = document.getElementById('system-login-pin').value;
            const emp = state.employees.find(e => e.pin === pin && e.status === 'Active');

            if (emp) {
                state.currentEmployee = emp;
                document.getElementById('top-emp-name').innerText = emp.name;
                document.getElementById('top-emp-role').innerText = emp.role;
                document.getElementById('login-screen').classList.add('opacity-0', 'pointer-events-none');
                showToast(`เข้าสู่ระบบ: ${emp.name}`);
                switchTab('pos');
                updateAllUI();
            } else {
                showToast('รหัส PIN ไม่ถูกต้อง', 'error');
            }
            document.getElementById('system-login-pin').value = '';
        }

        function logout() {
            state.currentEmployee = null;
            document.getElementById('login-screen').classList.remove('opacity-0', 'pointer-events-none');
        }

        // ================= SHIFT MANAGEMENT =================
        function checkShiftStatus() {
            const overlay = document.getElementById('pos-shift-overlay');
            const btnClose = document.getElementById('btn-close-shift');
            if (!overlay || !btnClose) return;

            if (state.shift.isOpen) {
                overlay.classList.add('hidden');
                btnClose.classList.remove('hidden');
                btnClose.classList.add('flex');
            } else {
                overlay.classList.remove('hidden');
                btnClose.classList.add('hidden');
                btnClose.classList.remove('flex');
            }
        }

        function confirmOpenShift() {
            const startCash = parseFloat(document.getElementById('start-cash-input').value) || 0;
            if (startCash < 0) {
                showToast('จำนวนเงินไม่ถูกต้อง', 'error');
                return;
            }
            const now = new Date();
            state.shift.isOpen = true;
            state.shift.startCash = startCash;
            state.shift.salesCash = 0;
            state.shift.topupCash = 0;
            state.shift.cashIn = 0;
            state.shift.cashOut = 0;
            state.shift.openedBy = state.currentEmployee ? state.currentEmployee.name : 'Unknown';
            state.shift.openTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            state.drawerLogs = [];

            closeModal('open-shift-modal');
            updateAllUI();
            showToast(`เปิดกะเรียบร้อย (เงินทอน ฿${startCash})`, 'success');
        }

        function reqCloseShift() {
            if (!state.currentEmployee) return;
            document.getElementById('cs-start').innerText = formatMoney(state.shift.startCash);
            document.getElementById('cs-sales').innerText = '+' + formatMoney(state.shift.salesCash);
            document.getElementById('cs-topup').innerText = '+' + formatMoney(state.shift.topupCash);
            document.getElementById('cs-in').innerText = '+' + formatMoney(state.shift.cashIn);
            document.getElementById('cs-out').innerText = '-' + formatMoney(state.shift.cashOut);

            const expected = state.shift.startCash + state.shift.salesCash + state.shift.topupCash + state.shift.cashIn - state.shift.cashOut;
            document.getElementById('cs-expected').innerText = formatMoney(expected);

            openModal('close-shift-modal');
        }

        function confirmCloseShift() {
            const expected = state.shift.startCash + state.shift.salesCash + state.shift.topupCash + state.shift.cashIn - state.shift.cashOut;
            state.shift.isOpen = false;
            state.shift.startCash = 0;
            state.shift.salesCash = 0;
            state.shift.topupCash = 0;
            state.shift.cashIn = 0;
            state.shift.cashOut = 0;
            state.shift.openedBy = null;
            state.shift.openTime = null;
            state.drawerLogs = [];

            clearCart();
            closeModal('close-shift-modal');
            updateAllUI();
            showToast(`ปิดกะสำเร็จ (ส่งยอด ${formatMoney(expected)})`, 'success');
        }

        // ================= CASH & EXPENSES =================
        function renderDrawerLogs() {
            const tbody = document.getElementById('drawer-logs-table');
            if (!tbody) return;

            document.getElementById('dash-cash-out').innerText = formatMoney(state.shift.cashOut);
            document.getElementById('dash-cash-in').innerText = formatMoney(state.shift.cashIn);

            if (state.shift.isOpen) {
                const expected = state.shift.startCash + state.shift.salesCash + state.shift.topupCash + state.shift.cashIn - state.shift.cashOut;
                document.getElementById('dash-expected-cash').innerText = formatMoney(expected);
                document.getElementById('dash-expected-cash').classList.remove('text-stone-400');
            } else {
                document.getElementById('dash-expected-cash').innerText = "ยังไม่เปิดกะ";
                document.getElementById('dash-expected-cash').classList.add('text-stone-400');
            }

            if (state.drawerLogs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-stone-400 text-xs">ไม่มีรายการ</td></tr>`;
                return;
            }

            tbody.innerHTML = state.drawerLogs.map(log => {
                const isIncome = log.type === 'income';
                const colAmount = isIncome ? 'text-emerald-600' : 'text-red-500';
                const iconMethod = log.method === 'drawer' ? 'payments' : 'account_balance';
                const textMethod = log.method === 'drawer' ? 'ลิ้นชัก' : 'เงินโอนร้าน';
                return `
                <tr class="hover:bg-stone-50">
                    <td class="p-4 text-xs text-stone-500">${log.time}</td>
                    <td class="p-4"><p class="font-bold text-sm text-stone-800">${log.reason}</p><p class="text-[10px] text-stone-400">โดย: ${log.by}</p></td>
                    <td class="p-4"><span class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-stone-500"><span class="material-symbols-outlined text-[14px]">${iconMethod}</span> ${textMethod}</span></td>
                    <td class="p-4 text-right font-black text-sm ${colAmount}">${isIncome ? '+' : '-'} ${formatMoney(log.amount)}</td>
                </tr>`;
            }).join('');
        }

        function openExpenseModal(type) {
            if (!state.shift.isOpen) {
                showToast('กรุณาเปิดกะก่อนทำรายการเงิน', 'error');
                return;
            }
            document.getElementById('exp-type-input').value = type;
            document.getElementById('exp-modal-title').innerText = type === 'expense' ? 'บันทึกรายจ่าย (Expense)' : 'บันทึกรายรับ (Income)';

            const catSelect = document.getElementById('exp-category-input');
            if (type === 'expense') {
                catSelect.innerHTML = `
                    <option value="ค่าน้ำแข็ง">🧊 ค่าน้ำแข็ง</option>
                    <option value="ค่านมสด">🥛 ค่านมสด</option>
                    <option value="ค่าวัตถุดิบ/ผักผลไม้">🍎 ค่าวัตถุดิบ/ผักผลไม้</option>
                    <option value="ค่าส่งพัสดุ/Delivery">🏍️ ค่าส่งพัสดุ/Delivery</option>
                    <option value="ค่าใช้จ่ายจิปาถะ">📦 ค่าใช้จ่ายจิปาถะ</option>
                    <option value="อื่นๆ">📝 อื่นๆ (ระบุในหมายเหตุ)</option>
                `;
            } else {
                catSelect.innerHTML = `
                    <option value="เพิ่มเงินทอนในเก๊ะ">💵 เพิ่มเงินทอนในเก๊ะ</option>
                    <option value="รายรับอื่นๆ">💰 รายรับอื่นๆ (ระบุในหมายเหตุ)</option>
                `;
            }

            const empSelect = document.getElementById('exp-emp-input');
            empSelect.innerHTML = state.employees.filter(e => e.status === 'Active').map(e =>
                `<option value="${e.name}" ${state.currentEmployee && state.currentEmployee.id === e.id ? 'selected' : ''}>${e.name} (${e.role})</option>`
            ).join('');

            document.getElementById('exp-note-input').value = '';
            document.getElementById('exp-amount-input').value = '';
            document.getElementById('exp-method-input').value = 'drawer';
            openModal('expense-form-modal');
        }

        function saveExpense() {
            const type = document.getElementById('exp-type-input').value;
            const method = document.getElementById('exp-method-input').value;
            const category = document.getElementById('exp-category-input').value;
            const note = document.getElementById('exp-note-input').value.trim();
            const amount = parseFloat(document.getElementById('exp-amount-input').value);
            const employeeName = document.getElementById('exp-emp-input').value;

            if (isNaN(amount) || amount <= 0) {
                showToast('กรุณาระบุจำนวนเงินให้ถูกต้อง', 'error');
                return;
            }

            if ((category === 'อื่นๆ' || category === 'รายรับอื่นๆ') && !note) {
                showToast('กรุณาระบุหมายเหตุเพิ่มเติมด้วยครับ', 'error');
                document.getElementById('exp-note-input').focus();
                return;
            }

            const fullReason = note ? `${category} - ${note}` : category;

            if (method === 'drawer') {
                if (type === 'expense') state.shift.cashOut += amount;
                else state.shift.cashIn += amount;
            }

            const now = new Date();
            state.drawerLogs.unshift({
                id: Date.now(),
                type: type,
                method: method,
                reason: fullReason,
                amount: amount,
                time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
                by: employeeName
            });

            closeModal('expense-form-modal');
            updateAllUI();
            showToast('บันทึกรายการสำเร็จ');
        }

        // ================= TIME CLOCK LOGS =================
        function handleTimeClock() {
            const pin = document.getElementById('system-login-pin').value;
            const emp = findActiveEmployeeByPin(state, pin);

            if (!emp) {
                showToast('รหัส PIN ไม่ถูกต้อง', 'error');
                return;
            }

            const clockResult = toggleEmployeeClock(emp);
            appendTimeLog(state, clockResult);
            showToast(`ตอกบัตร${clockResult.typeStr}สำเร็จ: ${emp.name}`, 'success');
            document.getElementById('system-login-pin').value = '';
        }

        function renderTimeClockLogs() {
            const tbody = document.getElementById('timeclock-logs-table');
            if (state.timeLogs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" class="text-center py-6 text-stone-400 text-xs">ไม่มีประวัติตอกบัตร</td></tr>`;
            } else {
                tbody.innerHTML = state.timeLogs.map(log => `
                <tr class="hover:bg-stone-50">
                    <td class="p-3 text-xs text-stone-500">${log.time}</td>
                    <td class="p-3"><p class="font-bold text-sm">${log.empName}</p><p class="text-[9px] text-stone-400 uppercase">${log.role}</p></td>
                    <td class="p-3 text-right font-bold text-xs ${log.isClockedIn ? 'text-emerald-600' : 'text-amber-600'}">${log.type}</td>
                </tr>`).join('');
            }
            openModal('timeclock-logs-modal');
        }

        function openQuickTimeClock() {
            document.getElementById('quick-timeclock-pin').value = '';
            openModal('quick-timeclock-modal');
            setTimeout(() => document.getElementById('quick-timeclock-pin').focus(), 100);
        }

        function processQuickTimeClock() {
            const pin = document.getElementById('quick-timeclock-pin').value;
            const emp = findActiveEmployeeByPin(state, pin);

            if (!emp) {
                showToast('รหัส PIN ไม่ถูกต้อง', 'error');
                document.getElementById('quick-timeclock-pin').value = '';
                return;
            }

            const clockResult = toggleEmployeeClock(emp);
            appendTimeLog(state, clockResult);
            closeModal('quick-timeclock-modal');
            showToast(`ตอกบัตร${clockResult.typeStr}สำเร็จ: ${emp.name}`, 'success');

            if (currentView === 'admin' && !document.getElementById('content-employees').classList.contains('hidden')) {
                renderEmployees();
            }
        }

        // ================= EMPLOYEES =================
        function renderEmployees() {
            const searchInput = document.getElementById('employee-list-search');
            const search = searchInput ? searchInput.value.toLowerCase() : '';
            renderEmployeesTable(state, search);
        }

        function previewEmpPic(e) {
            if (e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    tempEmpPic = ev.target.result;
                    document.getElementById('emp-modal-pic').src = tempEmpPic;
                    document.getElementById('emp-modal-pic').classList.remove('hidden');
                    document.getElementById('emp-modal-icon').classList.add('hidden');
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        }

        function startEditEmp(id) {
            state.pos.targetId = id;
            state.pos.actionType = 'edit_emp';
            document.getElementById('override-title').innerText = 'ยืนยันสิทธิ์แก้ไขข้อมูล';
            document.getElementById('override-desc').innerText = 'ต้องใช้รหัสตัวเอง หรือตำแหน่งสูงกว่า';
            document.getElementById('manager-pin-input').value = '';
            openModal('manager-pin-modal');
            setTimeout(() => document.getElementById('manager-pin-input').focus(), 100);
        }

        function openAddEmployeeModal() {
            tempEmpPic = null;
            document.getElementById('emp-id').value = '';
            document.getElementById('emp-name').value = '';
            document.getElementById('emp-role').value = 'Cafe Staff';
            document.getElementById('emp-pin').value = '';
            document.getElementById('emp-modal-title').innerText = 'เพิ่มพนักงานใหม่';
            document.getElementById('emp-modal-pic').classList.add('hidden');
            document.getElementById('emp-modal-icon').classList.remove('hidden');
            openModal('employee-form-modal');
        }

        function saveEmployee() {
            const result = saveEmployeeRecord(state, {
                id: document.getElementById('emp-id').value,
                name: document.getElementById('emp-name').value.trim(),
                role: document.getElementById('emp-role').value,
                pin: document.getElementById('emp-pin').value.trim(),
                profilePic: tempEmpPic,
            });

            if (!result.ok) {
                showToast(result.reason, 'error');
                return;
            }

            closeModal('employee-form-modal');
            updateAllUI();
            showToast('บันทึกสำเร็จ');
        }

        // ================= MENU MANAGEMENT ADMIN =================
        function renderMenuAdmin() {
            const catList = document.getElementById('admin-cat-list');
            if (catList) {
                catList.innerHTML = state.menu.categories.map(c => `
                <li class="flex justify-between items-center p-3 bg-stone-50 border border-stone-200 rounded-xl hover:bg-stone-100">
                    <span class="text-sm font-bold text-stone-800">${c.name}</span>
                    <button onclick="deleteCategory('${c.id}')" class="text-stone-400 hover:text-red-500"><span class="material-symbols-outlined text-[16px]">delete</span></button>
                </li>
                `).join('');
            }

            const filterContainer = document.getElementById('admin-item-filter');
            if (filterContainer) {
                filterContainer.innerHTML = `<button onclick="adminActiveCategory='all'; renderMenuAdmin();" class="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${adminActiveCategory === 'all' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}">ทั้งหมด</button>` +
                    state.menu.categories.map(c => `<button onclick="adminActiveCategory='${c.id}'; renderMenuAdmin();" class="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${adminActiveCategory === c.id ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}">${c.name}</button>`).join('');
            }

            const itemList = document.getElementById('admin-item-list');
            if (itemList) {
                const filteredItems = adminActiveCategory === 'all' ? state.menu.items : state.menu.items.filter(i => i.cat === adminActiveCategory);
                if (filteredItems.length === 0) {
                    itemList.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-stone-400 text-xs">ไม่มีรายการสินค้า</td></tr>`;
                } else {
                    itemList.innerHTML = filteredItems.map(i => {
                        const catName = state.menu.categories.find(c => c.id === i.cat)?.name || 'ไม่ทราบหมวดหมู่';
                        let ruleText = '';
                        switch (i.rule) {
                            case 'none': ruleText = 'ไม่มีตัวเลือก'; break;
                            case 'standard': ruleText = 'มาตรฐาน'; break;
                            case 'espresso': ruleText = 'เอสเพรสโซ่'; break;
                            case 'americano': ruleText = 'อเมริกาโน่'; break;
                            case 'iced_only': ruleText = 'เย็นเท่านั้น'; break;
                            default: ruleText = i.rule;
                        }
                        return `
                        <tr class="hover:bg-stone-50">
                            <td class="p-3"><p class="font-bold text-sm text-stone-800">${i.name}</p><p class="text-[10px] text-stone-500">${catName}</p></td>
                            <td class="p-3 font-bold text-primary">฿${i.price}</td>
                            <td class="p-3"><span class="text-[10px] font-bold px-2 py-1 rounded border bg-stone-100 text-stone-600 border-stone-200">${ruleText}</span></td>
                            <td class="p-3 text-center">
                                <button onclick="startEditItem(${i.id})" class="text-stone-400 hover:text-primary transition-colors mr-2"><span class="material-symbols-outlined text-[16px]">edit</span></button>
                                <button onclick="deleteItem(${i.id})" class="text-stone-400 hover:text-red-500 transition-colors"><span class="material-symbols-outlined text-[16px]">delete</span></button>
                            </td>
                        </tr>`;
                    }).join('');
                }
            }
        }

        function openCatModal() {
            document.getElementById('cat-id-input').value = '';
            document.getElementById('cat-name-input').value = '';
            openModal('cat-form-modal');
        }

        function saveCategory() {
            const name = document.getElementById('cat-name-input').value.trim();
            if (!name) { showToast('กรุณาระบุชื่อหมวดหมู่', 'error'); return; }
            const newId = 'cat_' + Date.now();
            state.menu.categories.push({ id: newId, name: name });
            closeModal('cat-form-modal');
            updateAllUI();
            showToast('เพิ่มหมวดหมู่สำเร็จ');
        }

        function deleteCategory(id) {
            state.pos.targetId = id;
            state.pos.actionType = 'delete_cat';
            document.getElementById('override-title').innerText = 'ยืนยันสิทธิ์ลบหมวดหมู่';
            document.getElementById('override-desc').innerText = 'ต้องใช้สิทธิ์ Admin หรือ Owner';
            document.getElementById('manager-pin-input').value = '';
            openModal('manager-pin-modal');
            setTimeout(() => document.getElementById('manager-pin-input').focus(), 100);
        }

        function openItemModal() {
            document.getElementById('item-modal-title').innerText = 'เพิ่มเมนูใหม่';
            document.getElementById('item-id-input').value = '';
            document.getElementById('item-name-input').value = '';
            document.getElementById('item-price-input').value = '';
            document.getElementById('item-rule-select').value = 'none';
            const catSelect = document.getElementById('item-cat-select');
            catSelect.innerHTML = state.menu.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            openModal('item-form-modal');
        }

        function startEditItem(id) {
            const item = state.menu.items.find(i => i.id === id);
            if (!item) return;
            document.getElementById('item-modal-title').innerText = 'แก้ไขเมนู';
            document.getElementById('item-id-input').value = item.id;
            document.getElementById('item-name-input').value = item.name;
            document.getElementById('item-price-input').value = item.price;
            document.getElementById('item-rule-select').value = item.rule;
            const catSelect = document.getElementById('item-cat-select');
            catSelect.innerHTML = state.menu.categories.map(c => `<option value="${c.id}" ${c.id === item.cat ? 'selected' : ''}>${c.name}</option>`).join('');
            openModal('item-form-modal');
        }

        function saveItem() {
            const id = document.getElementById('item-id-input').value;
            const name = document.getElementById('item-name-input').value.trim();
            const price = parseFloat(document.getElementById('item-price-input').value);
            const cat = document.getElementById('item-cat-select').value;
            const rule = document.getElementById('item-rule-select').value;
            if (!name || isNaN(price) || !cat) { showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error'); return; }
            if (id) {
                const item = state.menu.items.find(i => i.id == id);
                if (item) { item.name = name; item.price = price; item.cat = cat; item.rule = rule; }
            } else {
                state.menu.items.push({ id: Date.now(), cat: cat, name: name, price: price, rule: rule });
            }
            closeModal('item-form-modal');
            updateAllUI();
            showToast('บันทึกเมนูสำเร็จ');
        }

        function deleteItem(id) {
            state.pos.targetId = id;
            state.pos.actionType = 'delete_item';
            document.getElementById('override-title').innerText = 'ยืนยันสิทธิ์ลบเมนู';
            document.getElementById('override-desc').innerText = 'ต้องใช้สิทธิ์ Admin หรือ Owner';
            document.getElementById('manager-pin-input').value = '';
            openModal('manager-pin-modal');
            setTimeout(() => document.getElementById('manager-pin-input').focus(), 100);
        }


        // ================= SYSTEM MANAGER & PIN OVERRIDE =================
        function verifyOverridePin() {
            const pin = document.getElementById('manager-pin-input').value;
            const action = state.pos.actionType;
            const targetId = state.pos.targetId;

            const actor = findEmployeeByPin(state, pin);
            const result = getPermissionResult(state, actor, action, targetId);

            if (!result.allowed) {
                showToast(result.reason, 'error');
                document.getElementById('manager-pin-input').value = '';
                return;
            }

            if (action === 'topup') {
                closeModal('manager-pin-modal');
                const member = state.members.find(m => m.id === targetId);
                document.getElementById('topup-target-name').innerText = member.nickname || member.name;
                document.getElementById('topup-amount-input').value = '';
                setTimeout(() => {
                    openModal('topup-amount-modal');
                    document.getElementById('topup-amount-input').focus();
                }, 200);
            } else if (action === 'edit_emp') {
                const targetEmp = result.targetEmployee;
                closeModal('manager-pin-modal');
                document.getElementById('emp-modal-title').innerText = 'แก้ไขพนักงาน';
                document.getElementById('emp-id').value = targetEmp.id;
                document.getElementById('emp-name').value = targetEmp.name;
                document.getElementById('emp-role').value = targetEmp.role;
                document.getElementById('emp-pin').value = targetEmp.pin;

                tempEmpPic = targetEmp.profilePic || null;
                const picEl = document.getElementById('emp-modal-pic');
                const iconEl = document.getElementById('emp-modal-icon');
                if (tempEmpPic) {
                    picEl.src = tempEmpPic;
                    picEl.classList.remove('hidden');
                    iconEl.classList.add('hidden');
                } else {
                    picEl.classList.add('hidden');
                    iconEl.classList.remove('hidden');
                }
                setTimeout(() => openModal('employee-form-modal'), 200);
            } else if (action === 'delete_cat') {
                state.menu.categories = state.menu.categories.filter(c => c.id !== targetId);
                closeModal('manager-pin-modal');
                updateAllUI();
                showToast('ลบหมวดหมู่สำเร็จ');
            } else if (action === 'delete_item') {
                state.menu.items = state.menu.items.filter(i => i.id !== targetId);
                closeModal('manager-pin-modal');
                updateAllUI();
                showToast('ลบเมนูสำเร็จ');
            } else if (action === 'delete_coupon_template') {
                state.marketing.couponTemplates = state.marketing.couponTemplates.filter(c => c.id !== targetId);
                closeModal('manager-pin-modal');
                updateAllUI();
                showToast('ลบรูปแบบคูปองสำเร็จ');
            }

            document.getElementById('manager-pin-input').value = '';
        }

// ================= NAVIGATION & VIEWS =================
        function switchTab(tabId) {
            ['pos', 'menu', 'cash', 'marketing', 'history', 'members', 'employees', 'dashboard'].forEach(t => {
                const content = document.getElementById(`content-${t}`);
                if (content) content.classList.add('hidden');

                const btn = document.getElementById(`tab-${t}`);
                if (btn) {
                    btn.className = "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors text-stone-600 hover:bg-stone-200/50" + (t === 'dashboard' ? ' mt-4' : '');
                    btn.querySelector('span').style.fontVariationSettings = "'FILL' 0";
                }
            });

            const activeContent = document.getElementById(`content-${tabId}`);
            if (activeContent) activeContent.classList.remove('hidden');

            const activeBtn = document.getElementById(`tab-${tabId}`);
            if (activeBtn) {
                activeBtn.className = "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors bg-white text-primary font-bold shadow-sm border border-stone-100" + (tabId === 'dashboard' ? ' mt-4' : '');
                activeBtn.querySelector('span').style.fontVariationSettings = "'FILL' 1";
            }

            if (tabId === 'menu') renderMenuAdmin();
            if (tabId === 'cash') renderDrawerLogs();
            if (tabId === 'marketing') renderMarketingAdmin();
        }

        function toggleView() {
            const admin = document.getElementById('admin-view');
            const cust = document.getElementById('customer-view');
            const btn = document.getElementById('view-toggle-btn');

            if (currentView === 'admin') {
                admin.classList.add('hidden');
                cust.classList.remove('hidden');
                btn.innerHTML = `<span class="material-symbols-outlined">storefront</span> กลับจอพนักงาน`;
                btn.classList.replace('bg-primary', 'bg-stone-800');
                currentView = 'customer';
                navCust('home');
            } else {
                cust.classList.add('hidden');
                admin.classList.remove('hidden');
                btn.innerHTML = `<span class="material-symbols-outlined">swap_horiz</span> สลับจอลูกค้า`;
                btn.classList.replace('bg-stone-800', 'bg-primary');
                currentView = 'admin';
            }
            updateAllUI();
        }

        function navCust(tab) {
            ['home', 'history', 'profile'].forEach(t => {
                const el = document.getElementById(`c-tab-${t}`);
                if (el) {
                    el.classList.add('hidden');
                    el.classList.remove('block');
                }
            });

            document.querySelectorAll('.c-nav').forEach(el => {
                el.classList.remove('text-primary');
                el.classList.add('text-stone-400');
                el.querySelector('span').style.fontVariationSettings = "'FILL' 0";
            });

            const tabEl = document.getElementById(`c-tab-${tab}`);
            if (tabEl) {
                tabEl.classList.remove('hidden');
                tabEl.classList.add('block');
            }

            const activeBtn = document.getElementById(`btn-cust-${tab}`);
            if (activeBtn) {
                activeBtn.classList.add('text-primary');
                activeBtn.classList.remove('text-stone-400');
                activeBtn.querySelector('span').style.fontVariationSettings = "'FILL' 1";
            }
        }

        function updateAllUI() {
            checkShiftStatus();
            renderMenu();
            renderCart();
            renderMembers();
            renderEmployees();
            renderHistory();
            renderDashboard();
            renderMenuAdmin();
            renderDrawerLogs();
            renderMarketingAdmin();

            if (state.currentEmployee) {
                const topPic = document.getElementById('top-emp-pic');
                const topIcon = document.getElementById('top-emp-icon');
                if (topPic && topIcon) {
                    if (state.currentEmployee.profilePic) {
                        topPic.src = state.currentEmployee.profilePic;
                        topPic.classList.remove('hidden');
                        topIcon.classList.add('hidden');
                    } else {
                        topPic.classList.add('hidden');
                        topIcon.classList.remove('hidden');
                    }
                }
            }

            const cust = state.members[0];
            if (cust) {
                const cname = document.getElementById('c-name');
                if (cname) cname.innerText = cust.nickname || cust.name;

                const cbal = document.getElementById('c-balance');
                if (cbal) cbal.innerText = cust.balance.toLocaleString('en-US', { minimumFractionDigits: 2 });

                const unusedCoupons = cust.coupons.filter(c => !c.used).length;
                const cCouponsEl = document.getElementById('c-coupons');
                if (cCouponsEl) cCouponsEl.innerText = unusedCoupons;

                const cphone = document.getElementById('c-phone');
                if (cphone) cphone.innerText = cust.phone;

                const ctier = document.getElementById('c-tier');
                if (ctier) ctier.innerText = cust.tier;

                const cspent = document.getElementById('c-total-spent');
                if (cspent) cspent.innerText = formatMoney(cust.totalSpent);

                const cdob = document.getElementById('c-dob');
                if (cdob) cdob.innerText = cust.dob || '-';

                const img = document.getElementById('cust-pic');
                const icon = document.getElementById('cust-pic-icon');
                if (cust.profilePic) {
                    img.src = cust.profilePic;
                    img.classList.remove('hidden');
                    icon.classList.add('hidden');
                } else {
                    img.classList.add('hidden');
                    icon.classList.remove('hidden');
                }
            }

            const totalEwallet = state.members.reduce((sum, m) => sum + m.balance, 0);
            const displayEwallet = document.getElementById('sys-total-ewallet');
            if (displayEwallet) displayEwallet.innerText = formatMoney(totalEwallet);
        }

        // ================= HISTORY =================
        function renderHistory() {
            renderHistoryLists(state);
        }


        // ================= POS MENU & MODALS =================
        function renderMenu() {
            const clist = document.getElementById('cat-list');
            if (clist) {
                clist.innerHTML = state.menu.categories.map(c => `
                <button onclick="setActiveCategory('${c.id}')" class="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors ${activeCategory === c.id ? 'bg-stone-800 text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200'}">${c.name}</button>
                `).join('');
            }

            if (!state.menu.categories.find(c => c.id === activeCategory) && state.menu.categories.length > 0) {
                activeCategory = state.menu.categories[0].id;
            }

            const mlist = document.getElementById('menu-list');
            if (mlist) {
                mlist.innerHTML = state.menu.items.filter(m => m.cat === activeCategory).map(m => {
                    const qtyInCart = state.pos.cart.filter(c => c.itemId === m.id).reduce((sum, c) => sum + c.qty, 0);
                    const badge = qtyInCart > 0 ? `<div class="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md border-2 border-white animate-fade-in">${qtyInCart}</div>` : '';
                    return `
                    <div class="p-3 bg-white border border-stone-200 rounded-2xl text-left hover:border-primary active:scale-95 transition-all shadow-sm flex flex-col justify-between min-h-[90px] cursor-pointer relative" onclick="handleMenuClick(${m.id})">
                        ${badge}
                        <div>
                            <p class="text-xs font-bold text-stone-800 line-clamp-2">${m.name}</p>
                            <p class="text-[10px] text-primary font-bold mt-1">฿${m.price}${m.rule !== 'none' ? '+' : ''}</p>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        function setActiveCategory(id) {
            activeCategory = id;
            renderMenu();
        }

        let currentEditingItem = null;
        let selectedOpts = { type: null, roast: null, sweet: null };
        let modalQty = 1;

        function handleMenuClick(id) {
            const item = state.menu.items.find(i => i.id === id);
            if (item.rule === 'none') {
                addToCart(item, '', 1);
            } else {
                currentEditingItem = item;
                const types = item.rule === 'espresso' ? [{ id: 'hot', n: 'ร้อน', p: -20 }, { id: 'ice', n: 'เย็น', p: 0 }, { id: 'frappe', n: 'ปั่น', p: 20 }] :
                    item.rule === 'americano' ? [{ id: 'hot', n: 'ร้อน', p: 0 }, { id: 'ice', n: 'เย็น', p: 0 }] :
                        item.rule === 'iced_only' ? [{ id: 'ice', n: 'เย็น', p: 0 }] :
                            [{ id: 'hot', n: 'ร้อน', p: 0 }, { id: 'ice', n: 'เย็น', p: 0 }, { id: 'frappe', n: 'ปั่น', p: 20 }];
                selectedOpts.type = types.find(t => t.id === 'ice') || types[0];
                selectedOpts.roast = 'คั่วกลาง';
                selectedOpts.sweet = 'หวานปกติ';
                modalQty = 1;

                document.getElementById('sub-opt-title').innerText = item.name;
                document.getElementById('sub-opt-base-price').innerText = `ราคาพื้นฐาน ฿${item.price}`;
                document.getElementById('sub-opt-note').value = '';
                document.getElementById('modal-qty').innerText = modalQty;
                document.getElementById('section-roast').style.display = item.cat === 'coffee' ? 'block' : 'none';

                document.getElementById('sub-opt-types').innerHTML = types.map(t => `
                    <button onclick="selectedOpts.type={id:'${t.id}',n:'${t.n}',p:${t.p}}; renderSubOptions();" class="py-2 px-1 rounded-xl border-2 text-xs font-bold ${selectedOpts.type.id === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-stone-200 text-stone-500'}">${t.n} ${t.p !== 0 ? t.p + '฿' : ''}</button>
                `).join('');

                renderSubOptions();
                openModal('sub-option-modal');
            }
        }

        function changeModalQty(diff) {
            modalQty += diff;
            if (modalQty < 1) modalQty = 1;
            document.getElementById('modal-qty').innerText = modalQty;
            renderSubOptions();
        }

        function renderSubOptions() {
            document.getElementById('sub-opt-types').innerHTML = document.getElementById('sub-opt-types').innerHTML.replace(/border-primary bg-primary\/10 text-primary/g, 'border-stone-200 text-stone-500');
            const typesBtns = document.getElementById('sub-opt-types').children;
            for (let b of typesBtns) {
                if (b.innerText.includes(selectedOpts.type.n)) {
                    b.className = "py-2 px-1 rounded-xl border-2 text-xs font-bold border-primary bg-primary/10 text-primary";
                } else {
                    b.className = "py-2 px-1 rounded-xl border-2 text-xs font-bold border-stone-200 text-stone-500";
                }
            }

            document.getElementById('sub-opt-roast').innerHTML = ['คั่วเข้ม', 'คั่วกลาง', 'คั่วอ่อน'].map(r => `
                <button onclick="selectedOpts.roast='${r}'; renderSubOptions();" class="py-2 rounded-xl border-2 text-xs font-bold ${selectedOpts.roast === r ? 'border-primary bg-primary/10 text-primary' : 'border-stone-200 text-stone-500'}">${r}</button>
            `).join('');

            document.getElementById('sub-opt-sweetness').innerHTML = ['หวานปกติ', 'หวานน้อย', 'ไม่หวาน'].map(s => `
                <button onclick="selectedOpts.sweet='${s}'; renderSubOptions();" class="py-2 rounded-xl border-2 text-xs font-bold ${selectedOpts.sweet === s ? 'border-primary bg-primary/10 text-primary' : 'border-stone-200 text-stone-500'}">${s}</button>
            `).join('');

            const unitPrice = currentEditingItem.price + selectedOpts.type.p;
            const total = unitPrice * modalQty;
            document.getElementById('sub-opt-total-price').innerText = `฿${total}`;
        }

        function confirmSubOptions() {
            const unitPrice = currentEditingItem.price + selectedOpts.type.p;
            const noteText = document.getElementById('sub-opt-note').value.trim();
            const opts = [selectedOpts.type.n];
            if (currentEditingItem.cat === 'coffee') opts.push(selectedOpts.roast);
            opts.push(selectedOpts.sweet);
            const finalNote = opts.join(', ') + (noteText ? ` [${noteText}]` : '');

            addToCart({ ...currentEditingItem, price: unitPrice }, finalNote, modalQty);
            closeModal('sub-option-modal');
        }

        // ================= CART MANAGEMENT =================
        function addToCart(item, note = '', qty = 1) {
            const existing = state.pos.cart.find(c => c.itemId === item.id && c.note === note && c.price === item.price);
            if (existing) {
                existing.qty += qty;
            } else {
                state.pos.cart.push({ cartId: Date.now(), itemId: item.id, name: item.name, price: item.price, qty: qty, note: note, cat: item.cat });
            }
            renderCart();
            const mainCont = document.getElementById('main-scroll-area');
            if (mainCont) setTimeout(() => mainCont.scrollTo({ top: mainCont.scrollHeight, behavior: 'smooth' }), 100);
        }

        function updateQty(index, change) {
            state.pos.cart[index].qty += change;
            if (state.pos.cart[index].qty <= 0) state.pos.cart.splice(index, 1);
            renderCart();
        }

        function clearCart() {
            state.pos.cart = [];
            document.getElementById('cart-discount-val').value = '';
            state.pos.appliedCouponId = null;
            removeCartMember();
            renderCart();
        }

        function resetDiscount() {
            document.getElementById('cart-discount-val').value = '';
            renderCart();
        }

        function openSelectCartMemberModal() {
            state.pos.actionType = 'select_cart_member';
            document.getElementById('select-member-title').innerText = "ค้นหา/เลือกลูกค้าเข้าบิล";
            document.getElementById('select-member-desc').innerText = "ผูกสมาชิกลงบิลเพื่อสะสมยอดและรับส่วนลดระดับ Tier";
            document.getElementById('select-member-search-input').value = '';
            filterSelectMembers();
            openModal('select-member-modal');
        }

        function filterSelectMembers() {
            const searchInput = document.getElementById('select-member-search-input');
            const search = searchInput ? searchInput.value.toLowerCase() : '';
            const list = document.getElementById('select-member-list');
            if (!list) return;

            const filtered = state.members.filter(m => m.name.toLowerCase().includes(search) || m.phone.includes(search) || (m.nickname && m.nickname.toLowerCase().includes(search)));

            if (filtered.length === 0) {
                list.innerHTML = `<p class="text-center text-sm text-stone-400 py-4">ไม่พบสมาชิก</p>`;
                return;
            }

            list.innerHTML = filtered.map(m => {
                const name = m.nickname ? `${m.nickname} (${m.name})` : m.name;
                const initial = m.nickname ? m.nickname.charAt(0) : m.name.charAt(0);
                const picHtml = m.profilePic ? `<img src="${m.profilePic}" class="w-8 h-8 rounded-full object-cover">` : `<div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">${initial}</div>`;
                return `
                <div class="flex justify-between items-center p-3 border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer" onclick="processSelectMember(${m.id})">
                    <div class="flex items-center gap-3">${picHtml}<div><p class="text-sm font-bold text-stone-800 leading-tight">${name}</p><p class="text-[10px] text-stone-500">${m.phone}</p></div></div>
                    <div class="text-right"><span class="text-[10px] font-bold px-2 py-1 rounded border border-stone-200 bg-white text-stone-600">${m.tier}</span></div>
                </div>`;
            }).join('');
        }

        function processSelectMember(id) {
            const m = state.members.find(x => x.id === id);
            if (state.pos.actionType === 'select_cart_member') {
                state.pos.cartMember = m;
                document.getElementById('cart-member-name').innerText = m.nickname ? `${m.nickname} (${m.name})` : m.name;
                document.getElementById('cart-member-tier').innerText = `ระดับ ${m.tier} | สะสม ${formatMoney(m.totalSpent)}`;
                document.getElementById('cart-member-initial').innerText = m.nickname ? m.nickname.charAt(0) : m.name.charAt(0);
                document.getElementById('cart-member-info').classList.remove('hidden');
                document.getElementById('btn-select-cart-member').classList.add('hidden');
                closeModal('select-member-modal');
                renderCart();
                showToast(`ผูกสมาชิก: ${m.name}`);
            }
        }

        function removeCartMember() {
            state.pos.cartMember = null;
            state.pos.appliedCouponId = null; // ยกเลิกคูปองถ้าลบสมาชิกออก
            document.getElementById('cart-member-info').classList.add('hidden');
            document.getElementById('btn-select-cart-member').classList.remove('hidden');
            renderCart();
        }

        function toggleCoupon() {
            if (state.pos.appliedCouponId) {
                state.pos.appliedCouponId = null;
                renderCart();
            } else {
                const selectEl = document.getElementById('cart-coupon-select');
                if (selectEl && selectEl.value) {
                    state.pos.appliedCouponId = parseInt(selectEl.value);
                    renderCart();
                } else {
                    showToast('ไม่มีคูปองให้เลือกใช้', 'error');
                }
            }
        }

        function renderCart() {
            const summary = calculateCartSummary(state);

            renderCartItems(state);
            renderCartCouponSection(state, summary);
            renderCartSummary(summary);
            renderPaymentButtons(state, summary);
            syncCustomerFacingDisplay(state, summary);

            state.pos.currentTotalDiscount = summary.totalDiscount;
            state.pos.currentAutoDiscount = summary.autoDiscount;
        }

// ================= CHECKOUT =================
        function holdCart() {
            if (state.pos.cart.length === 0) return;
            const now = new Date();
            state.pos.heldOrders.push({ id: Date.now(), time: `${now.getHours()}:${now.getMinutes()}`, cart: [...state.pos.cart] });
            clearCart();
            document.getElementById('held-qty').innerText = state.pos.heldOrders.length;
            showToast('พักบิลเรียบร้อย');
        }

        function openHeldOrders() {
            const list = document.getElementById('held-orders-list');
            if (state.pos.heldOrders.length === 0) {
                list.innerHTML = `<p class="text-center text-sm text-stone-400 py-4">ไม่มีบิลพักไว้</p>`;
            } else {
                list.innerHTML = state.pos.heldOrders.map((h, i) => `
                <div onclick="recallOrder(${i})" class="flex justify-between p-3 border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer">
                    <div><p class="font-bold text-sm">เวลา ${h.time}</p><p class="text-xs text-stone-500">${h.cart.length} รายการ</p></div>
                    <div class="text-right text-primary font-bold">฿${h.cart.reduce((s, c) => s + (c.price * c.qty), 0)}</div>
                </div>`).join('');
            }
            openModal('held-orders-modal');
        }

        function recallOrder(index) {
            if (state.pos.cart.length > 0) {
                showToast('ล้างตะกร้าปัจจุบันก่อน', 'error');
                return;
            }
            state.pos.cart = state.pos.heldOrders[index].cart;
            state.pos.heldOrders.splice(index, 1);
            document.getElementById('held-qty').innerText = state.pos.heldOrders.length;
            renderCart();
            closeModal('held-orders-modal');
        }

        function triggerPayment(method) {
            const total = getCartTotalFromDom();
            const validation = validatePaymentRequest(state, method, total);

            if (!validation.ok) {
                showToast(validation.reason, 'error');
                if (method === 'ewallet' && validation.lackAmount && state.pos.cartMember) {
                    setTimeout(() => { startTopup(state.pos.cartMember.id); }, 1500);
                }
                return;
            }

            state.pos.paymentMethod = method;
            const member = validation.member;
            showConfirm('deduct', total, validation.displayMethod, member);
        }

        function filterPaymentMembers() {
            const searchInput = document.getElementById('ewallet-search-input');
            const search = searchInput ? searchInput.value.toLowerCase() : '';
            const total = parseFloat(document.getElementById('cart-total').innerText.replace(/[฿,]/g, '')) || 0;
            const list = document.getElementById('ewallet-member-select-list');
            if (!list) return;

            const filtered = state.members.filter(m => m.name.toLowerCase().includes(search) || m.phone.includes(search) || (m.nickname && m.nickname.toLowerCase().includes(search)));
            if (filtered.length === 0) {
                list.innerHTML = `<p class="text-center text-sm text-stone-400 py-4">ไม่พบสมาชิก</p>`;
                return;
            }

            list.innerHTML = filtered.map(m => {
                const canAfford = m.balance >= total;
                const name = m.nickname ? `${m.nickname} (${m.name})` : m.name;
                const initial = m.nickname ? m.nickname.charAt(0) : m.name.charAt(0);
                const picHtml = m.profilePic ? `<img src="${m.profilePic}" class="w-8 h-8 rounded-full object-cover">` : `<div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">${initial}</div>`;
                return `
                <div class="flex justify-between items-center p-3 border border-stone-200 rounded-xl hover:bg-stone-50 ${canAfford ? 'cursor-pointer' : 'opacity-50'}" ${canAfford ? `onclick="selectPayMember(${m.id})"` : ''}>
                    <div class="flex items-center gap-3">${picHtml}<div><p class="text-sm font-bold text-stone-800 leading-tight">${name}</p><p class="text-[10px] text-stone-500">${m.phone}</p></div></div>
                    <div class="text-right"><p class="text-[10px] text-stone-400 uppercase tracking-widest font-bold">คงเหลือ</p><p class="font-black ${canAfford ? 'text-primary' : 'text-red-500'}">฿${m.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
                </div>`;
            }).join('');
        }

        function selectPayMember(id) {
            const m = state.members.find(x => x.id === id);
            closeModal('ewallet-pay-modal');
            const total = parseFloat(document.getElementById('cart-total').innerText.replace(/[฿,]/g, '')) || 0;
            showConfirm('deduct', total, 'E-Wallet', m);
        }

        function showConfirm(type, amt, method, member) {
            pendingTx = buildPendingTransaction(type, amt, method, member, state.pos.cart);
            const content = buildConfirmModalContent(type, amt, method, member, state.pos.appliedCouponId);
            document.getElementById('modal-title').innerText = content.title;
            document.getElementById('modal-desc').innerHTML = content.desc;
            openModal('confirm-modal');
        }

        function executeTransaction() {
            if (!pendingTx) return;
            const tx = pendingTx;
            const currentEmployeeName = state.currentEmployee ? state.currentEmployee.name : 'Unknown';

            const execution = executePendingTransaction(state, tx, currentEmployeeName);
            if (execution.upgradeTier && tx.member) {
                setTimeout(() => showToast(`🎉 ${tx.member.nickname || tx.member.name} เลื่อนขั้นเป็นลูกค้าระดับ ${execution.upgradeTier.name}!`, 'success'), 1000);
            }

            const totals = tx.type === 'deduct' ? readReceiptTotalsFromDom() : { subtotal: 0, vat: 0, befVat: 0 };
            window.lastReceipt = buildReceiptData(tx, totals, currentEmployeeName, {
                timeStr: execution.timeStr,
                totalDiscount: state.pos.currentTotalDiscount || 0,
                autoDiscount: state.pos.currentAutoDiscount || 0,
            });

            if (tx.type === 'deduct') {
                clearCart();
            }
            updateAllUI();
            closeModal('confirm-modal');
            showSuccessModal(window.lastReceipt);
        }

        function showSuccessModal(data) {
            const payload = buildSuccessModalPayload(data);
            document.getElementById('success-title').innerText = payload.title;
            document.getElementById('success-details-box').innerHTML = payload.html;
            document.getElementById('success-docs-status').innerHTML = payload.docsHtml;
            openModal('payment-success-modal');
        }

        function finishOrder() {
            closeModal('payment-success-modal');
        }

        function printReceipt() {
            const data = window.lastReceipt;
            if (!data) return;
            document.getElementById('print-area').innerHTML = buildReceiptPrintHtml(data);
            window.print();
        }

        // ================= MEMBERSHIP & CRM ADMIN =================
        function openGiveCouponModal(memberId) {
            state.pos.targetId = memberId;
            const m = state.members.find(x => x.id === memberId);
            if (!m) return;

            document.getElementById('give-coupon-member-name').innerText = m.nickname ? `${m.nickname} (${m.name})` : m.name;

            const selectEl = document.getElementById('give-coupon-select');
            selectEl.innerHTML = state.marketing.couponTemplates.map(ct => `
                <option value="${ct.id}">${ct.name}</option>
            `).join('');

            openModal('give-coupon-modal');
        }

        function confirmGiveCoupon() {
            const m = state.members.find(x => x.id === state.pos.targetId);
            const templateId = document.getElementById('give-coupon-select').value;
            const template = state.marketing.couponTemplates.find(ct => ct.id === templateId);

            if (m && template) {
                m.coupons.push({
                    id: Date.now(),
                    templateId: template.id,
                    name: template.name,
                    type: template.type,
                    value: template.value,
                    used: false
                });
                closeModal('give-coupon-modal');
                updateAllUI();
                showToast(`ส่งคูปอง ${template.name} ให้ ${m.nickname || m.name} สำเร็จ!`, 'success');
            }
        }

        function renderMembers() {
            const searchInput = document.getElementById('search-member');
            const search = searchInput ? searchInput.value.toLowerCase() : '';
            const list = document.getElementById('table-members');
            if (!list) return;

            const filtered = state.members.filter(m => m.name.toLowerCase().includes(search) || m.phone.includes(search) || (m.nickname && m.nickname.toLowerCase().includes(search)));
            if (filtered.length === 0) {
                list.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-stone-400 text-xs">ไม่พบข้อมูล</td></tr>`;
                return;
            }

            list.innerHTML = filtered.map(m => {
                const name = m.nickname ? `${m.nickname} (${m.name})` : m.name;
                const initial = m.nickname ? m.nickname.charAt(0) : m.name.charAt(0);
                const pic = m.profilePic ? `<img src="${m.profilePic}" class="w-8 h-8 rounded-full object-cover">` : `<div class="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold">${initial}</div>`;
                let tCol = m.tier === 'Platinum' ? 'bg-amber-50 text-amber-700 border-amber-200' : (m.tier === 'Gold' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-stone-100 text-stone-600 border-stone-200');
                return `
                <tr class="hover:bg-stone-50 transition-colors group">
                    <td class="p-3 cursor-pointer" onclick="viewMemberProfile(${m.id})">
                        <div class="flex items-center gap-3">${pic}<div><p class="font-bold group-hover:text-primary transition-colors">${name}</p><p class="text-[10px] text-stone-500">${m.phone}</p></div></div>
                    </td>
                    <td class="p-3 text-center cursor-pointer" onclick="viewMemberProfile(${m.id})">
                        <span class="text-[10px] font-bold px-2 py-1 rounded border ${tCol}">${m.tier}</span>
                    </td>
                    <td class="p-3 text-right text-stone-600 font-bold cursor-pointer" onclick="viewMemberProfile(${m.id})">
                        ฿${m.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td class="p-3 text-right font-black ${m.balance > 0 ? 'text-primary' : 'text-stone-400'} cursor-pointer" onclick="viewMemberProfile(${m.id})">
                        ฿${m.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td class="p-3 text-center flex justify-center gap-2">
                        <button onclick="startTopup(${m.id})" class="text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors active:scale-95 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">add</span> เติมเงิน</button>
                        <button onclick="openGiveCouponModal(${m.id})" class="text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors active:scale-95 flex items-center gap-1" title="แจกคูปอง"><span class="material-symbols-outlined text-[14px]">local_activity</span> แจก</button>
                    </td>
                </tr>`;
            }).join('');
        }

        function viewMemberProfile(id) {
            const m = state.members.find(x => x.id === id);
            if (!m) return;

            document.getElementById('mp-name').innerText = m.nickname ? `${m.nickname} (${m.name})` : m.name;
            document.getElementById('mp-phone').innerText = m.phone;
            document.getElementById('mp-tier').innerText = m.tier;
            document.getElementById('mp-balance').innerText = formatMoney(m.balance);

            const picContainer = document.getElementById('mp-pic-container');
            if (m.profilePic) {
                picContainer.innerHTML = `<img src="${m.profilePic}" class="w-full h-full object-cover">`;
            } else {
                const initial = m.nickname ? m.nickname.charAt(0) : m.name.charAt(0);
                picContainer.innerHTML = initial;
            }

            const hist = state.history.filter(h => h.memberPhone === m.phone);
            const list = document.getElementById('mp-history-list');

            if (hist.length === 0) {
                list.innerHTML = '<p class="text-center text-sm text-stone-400 py-8">ยังไม่มีประวัติทำรายการ</p>';
            } else {
                list.innerHTML = hist.map(h => {
                    const isTopup = h.type === 'topup';
                    return `
                    <div class="flex justify-between items-center p-3 border-b border-stone-200/60 last:border-0 bg-white rounded-lg mb-1 shadow-sm">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center ${isTopup ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'}">
                                <span class="material-symbols-outlined text-[14px]">${h.icon}</span>
                            </div>
                            <div>
                                <p class="font-bold text-xs text-stone-800 line-clamp-1">${h.title}</p>
                                <p class="text-[9px] text-stone-500 mt-0.5">${h.time}</p>
                            </div>
                        </div>
                        <div class="font-black text-sm ${isTopup ? 'text-emerald-600' : 'text-primary'}">${isTopup ? '+' : '-'} ฿${h.amount.toLocaleString('en-US')}</div>
                    </div>`;
                }).join('');
            }
            openModal('member-profile-modal');
        }

        function startTopup(id) {
            state.pos.targetId = id;
            state.pos.actionType = 'topup';
            document.getElementById('override-title').innerText = 'ยืนยันสิทธิ์เติมเงิน';
            document.getElementById('override-desc').innerText = 'ต้องใช้สิทธิ์ Admin หรือ Owner';
            document.getElementById('manager-pin-input').value = '';
            openModal('manager-pin-modal');
            setTimeout(() => document.getElementById('manager-pin-input').focus(), 100);
        }

        function proceedToTopupConfirm() {
            const amt = parseFloat(document.getElementById('topup-amount-input').value);
            if (amt > 0) {
                closeModal('topup-amount-modal');
                const m = findMemberById(state, state.pos.targetId);
                showConfirm('topup', amt, 'เงินสด', m);
            } else {
                showToast('ระบุจำนวนเงิน', 'error');
            }
        }

        function openAddMemberModal() {
            document.getElementById('mem-name').value = '';
            document.getElementById('mem-nick').value = '';
            document.getElementById('mem-phone').value = '';
            document.getElementById('mem-dob').value = '';
            document.getElementById('mem-pin').value = '';
            openModal('member-form-modal');
        }

        function saveMember() {
            const n = document.getElementById('mem-name').value.trim();
            const nk = document.getElementById('mem-nick').value.trim();
            const ph = document.getElementById('mem-phone').value.trim();
            const d = document.getElementById('mem-dob').value;
            const pin = document.getElementById('mem-pin').value.trim();

            if (n && nk && ph && pin.length === 6) {
                state.members.push({ id: Date.now(), name: n, nickname: nk, phone: ph, dob: d, pin: pin, tier: 'Silver', balance: 0, totalSpent: 0, profilePic: null, coupons: [] });
                closeModal('member-form-modal');
                updateAllUI();
                showToast('เพิ่มสมาชิกสำเร็จ');
            } else {
                showToast('กรอกข้อมูลไม่ครบ หรือ PIN ไม่ถึง 6 หลัก', 'error');
            }
        }

        // ================= MARKETING ADMIN =================
        function togglePromotion(promoId) {
            if (!canTogglePromotionByEmployee(state.currentEmployee)) {
                showToast('เฉพาะระดับ Owner เท่านั้นที่เปิด/ปิดโปรโมชันได้', 'error');
                return;
            }
            const result = togglePromotionState(state, promoId);
            if (!result.ok) {
                showToast(result.reason, 'error');
                return;
            }
            renderMarketingAdmin();
            updateAllUI();
            showToast(`อัปเดตสถานะ ${result.promo.name} แล้ว`, 'success');
        }

        function openCouponTemplateModal() {
            document.getElementById('ct-name').value = '';
            document.getElementById('ct-type').value = 'free_drink';
            document.getElementById('ct-value').value = '';
            toggleCtValueInput();
            openModal('coupon-template-modal');
        }

        function toggleCtValueInput() {
            const type = document.getElementById('ct-type').value;
            const valueContainer = document.getElementById('ct-value-container');
            if (type === 'fixed_discount') {
                valueContainer.classList.remove('hidden');
            } else {
                valueContainer.classList.add('hidden');
            }
        }

        function saveCouponTemplate() {
            const name = document.getElementById('ct-name').value.trim();
            const type = document.getElementById('ct-type').value;
            const value = parseFloat(document.getElementById('ct-value').value) || 0;

            if (!name) { showToast('กรุณาระบุชื่อคูปอง', 'error'); return; }
            if (type === 'fixed_discount' && value <= 0) { showToast('กรุณาระบุส่วนลดให้ถูกต้อง', 'error'); return; }

            let desc = '';
            let icon = 'sell';
            if (type === 'free_drink') { desc = 'หักลบราคาเครื่องดื่มที่ถูกที่สุดในบิล 100%'; icon = 'local_cafe'; }
            else if (type === 'free_bakery') { desc = 'หักลบราคาขนมที่ถูกที่สุดในบิล 100%'; icon = 'bakery_dining'; }
            else { desc = `ลดราคาท้ายบิล ${value} บาท`; icon = 'sell'; }

            state.marketing.couponTemplates.push({
                id: 'ct_' + Date.now(),
                name: name,
                type: type,
                value: value,
                desc: desc,
                icon: icon
            });

            closeModal('coupon-template-modal');
            updateAllUI();
            showToast('สร้างรูปแบบคูปองสำเร็จ');
        }

        function deleteCouponTemplate(id) {
            state.pos.targetId = id;
            state.pos.actionType = 'delete_coupon_template';
            document.getElementById('override-title').innerText = 'ยืนยันสิทธิ์ลบเทมเพลต';
            document.getElementById('override-desc').innerText = 'ต้องใช้สิทธิ์ Admin หรือ Owner';
            document.getElementById('manager-pin-input').value = '';
            openModal('manager-pin-modal');
            setTimeout(() => document.getElementById('manager-pin-input').focus(), 100);
        }

        function renderMarketingAdmin() {
            const tierList = document.getElementById('marketing-tier-list');
            if (!tierList) return;

            const sortedTiers = [...state.marketing.tiers].sort((a, b) => a.minSpent - b.minSpent);

            tierList.innerHTML = sortedTiers.map(t => `
            <div class="p-4 rounded-2xl border ${t.color.includes('border-') ? t.color.split(' ').find(c => c.startsWith('border-')) : 'border-stone-200'} bg-stone-50 flex flex-col md:flex-row gap-4 items-center relative overflow-hidden">
                <div class="absolute left-0 top-0 bottom-0 w-1.5 ${t.color.split(' ')[0]}"></div>
                <div class="w-full md:w-1/3 pl-3">
                    <span class="text-xs font-bold uppercase tracking-widest text-stone-400 block mb-1">ระดับสมาชิก</span>
                    <p class="font-black text-lg ${t.color.split(' ')[1]}">${t.name}</p>
                </div>
                <div class="w-full md:w-1/3">
                    <label class="text-[10px] font-bold text-stone-500 block mb-1">ยอดใช้จ่ายสะสมขั้นต่ำ (฿)</label>
                    <input type="number" id="tier-min-${t.id}" value="${t.minSpent}" class="w-full p-2 text-sm border border-stone-200 rounded-lg outline-none font-bold text-stone-700 bg-white focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="w-full md:w-1/3">
                    <label class="text-[10px] font-bold text-stone-500 block mb-1">ส่วนลดอัตโนมัติ (%)</label>
                    <div class="relative">
                        <input type="number" id="tier-disc-${t.id}" value="${t.discountPercent}" class="w-full p-2 pr-8 text-sm border border-stone-200 rounded-lg outline-none font-bold text-stone-700 bg-white focus:ring-2 focus:ring-primary/20">
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">%</span>
                    </div>
                </div>
            </div>`).join('');

            // --- Render Promotions ---
            const promoList = document.getElementById('marketing-promo-list');
            if (promoList) {
                promoList.innerHTML = state.marketing.promotions.map(p => `
                <div class="p-4 rounded-xl border ${p.active ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-stone-50 opacity-60'} flex justify-between items-center transition-all">
                    <div>
                        <p class="font-bold text-sm text-stone-800">${p.name}</p>
                        <p class="text-[10px] text-stone-500">${p.desc}</p>
                    </div>
                    <div onclick="togglePromotion('${p.id}')" class="w-10 h-6 ${p.active ? 'bg-emerald-500' : 'bg-stone-300'} rounded-full relative cursor-pointer shadow-inner transition-colors">
                        <div class="w-4 h-4 bg-white rounded-full absolute ${p.active ? 'right-1' : 'left-1'} top-1 shadow-sm transition-all"></div>
                    </div>
                </div>`).join('');
            }

            // --- Render Coupon Templates ---
            const ctList = document.getElementById('marketing-coupon-list');
            if (ctList) {
                ctList.innerHTML = state.marketing.couponTemplates.map(ct => `
                <div class="p-3 rounded-xl border border-stone-200 bg-stone-50 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><span class="material-symbols-outlined">${ct.icon}</span></div>
                    <div class="flex-1">
                        <p class="font-bold text-sm text-stone-800">${ct.name} ${ct.type === 'fixed_discount' ? '(' + ct.value + '฿)' : ''}</p>
                        <p class="text-[10px] text-stone-500">${ct.desc}</p>
                    </div>
                    <button onclick="deleteCouponTemplate('${ct.id}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm shrink-0"><span class="material-symbols-outlined text-[16px]">delete</span></button>
                </div>`).join('');
            }
        }

        function saveMarketingSettings() {
            if (!canTogglePromotionByEmployee(state.currentEmployee)) {
                showToast('เฉพาะระดับ Owner เท่านั้นที่แก้ไขส่วนนี้ได้', 'error');
                return;
            }

            saveTierSettingsFromDom(state);
            updateAllUI();
            showToast('บันทึกการตั้งค่าการตลาดเรียบร้อยแล้ว!', 'success');
        }

        // ================= DASHBOARD =================
        function renderDashboard() {
            const sales = state.history.filter(h => h.type === 'deduct');
            const rev = sales.reduce((sum, h) => sum + h.amount, 0);

            const dashRev = document.getElementById('dash-revenue');
            const dashOrd = document.getElementById('dash-orders');

            if (dashRev) dashRev.innerText = formatMoney(rev);
            if (dashOrd) dashOrd.innerText = sales.length;
        }

        // ================= INITIALIZATION =================
        function uploadPic(e) {
            if (e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    state.members[0].profilePic = ev.target.result;
                    updateAllUI();
                    showToast('อัปเดตโปรไฟล์สำเร็จ');
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        }

                window.SriBrownApp = window.SriBrownApp || {};
        window.SriBrownApp.updateQty = updateQty;

window.onload = () => {
            setInterval(() => {
                const opt = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
                const timeEl = document.getElementById('sys-time');
                if (timeEl) timeEl.innerText = new Date().toLocaleDateString('th-TH', opt);
            }, 1000);
            updateAllUI();
        };
    


Object.assign(window, {
    showToast, openModal, closeModal, formatMoney,
    handleLogin,
    logout,
    checkShiftStatus,
    confirmOpenShift,
    reqCloseShift,
    confirmCloseShift,
    renderDrawerLogs,
    openExpenseModal,
    saveExpense,
    handleTimeClock,
    renderTimeClockLogs,
    openQuickTimeClock,
    processQuickTimeClock,
    renderEmployees,
    previewEmpPic,
    startEditEmp,
    openAddEmployeeModal,
    saveEmployee,
    renderMenuAdmin,
    openCatModal,
    saveCategory,
    deleteCategory,
    openItemModal,
    startEditItem,
    saveItem,
    deleteItem,
    verifyOverridePin,
    switchTab,
    toggleView,
    navCust,
    updateAllUI,
    renderHistory,
    renderMenu,
    setActiveCategory,
    handleMenuClick,
    changeModalQty,
    renderSubOptions,
    confirmSubOptions,
    addToCart,
    updateQty,
    clearCart,
    resetDiscount,
    openSelectCartMemberModal,
    filterSelectMembers,
    processSelectMember,
    removeCartMember,
    toggleCoupon,
    renderCart,
    holdCart,
    openHeldOrders,
    recallOrder,
    triggerPayment,
    filterPaymentMembers,
    selectPayMember,
    showConfirm,
    executeTransaction,
    showSuccessModal,
    finishOrder,
    printReceipt,
    openGiveCouponModal,
    confirmGiveCoupon,
    renderMembers,
    viewMemberProfile,
    startTopup,
    proceedToTopupConfirm,
    openAddMemberModal,
    saveMember,
    togglePromotion,
    openCouponTemplateModal,
    toggleCtValueInput,
    saveCouponTemplate,
    deleteCouponTemplate,
    renderMarketingAdmin,
    saveMarketingSettings,
    renderDashboard,
    uploadPic
});

