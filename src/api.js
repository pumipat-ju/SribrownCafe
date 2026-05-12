const API_BASE = 'http://localhost:8000';

export async function fetchJSON(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'request error');
    }

    return res.json();
}

/**
 * 🔓 สั่งเปิดเก๊ะเก็บเงิน (Manual หรือ หลังบันทึกรายการเงินสด)
 */
export async function triggerDrawer(reason, employeeName = 'System', extra = {}) {
    try {
        await fetchJSON('/hardware/open-drawer', {
            method: 'POST',
            body: JSON.stringify({
                reason,
                employee: employeeName,
                ...extra,
            }),
        });
        return true;
    } catch (e) {
        console.error('Open drawer failed:', e);
        alert('บันทึกสำเร็จ แต่เปิดเก๊ะไม่สำเร็จ กรุณาเช็ค Hardware Agent / Printer');
        return false;
    }
}

/**
 * 🖨️ สั่งพิมพ์ใบเสร็จ (และเปิดเก๊ะถ้าเป็นเงินสด)
 */
export async function triggerReceiptAndDrawer(method, transactionData, cartItems) {
    try {
        const payload = {
            txn: {
                ...transactionData,
                items: cartItems,
            },
        };

        const endpoint = method === 'CASH' ? '/hardware/print-and-open' : '/hardware/print-receipt';

        await fetchJSON(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return true;
    } catch (e) {
        console.error('Print/open failed:', e);
        alert('บันทึกบิลสำเร็จ แต่พิมพ์ใบเสร็จหรือเปิดเก๊ะไม่สำเร็จ');
        return false;
    }
}