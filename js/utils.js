export function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    const icon = document.getElementById('toast-icon');
    icon.innerText = type === 'error' ? 'error' : 'check_circle';
    icon.className = `material-symbols-outlined ${type === 'error' ? 'text-red-400' : 'text-emerald-400'}`;
    toast.classList.remove('opacity-0', '-translate-y-5', 'pointer-events-none');
    setTimeout(() => toast.classList.add('opacity-0', '-translate-y-5', 'pointer-events-none'), 3000);
}

export function openModal(id) {
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove('opacity-0', 'pointer-events-none');
        const card = m.querySelector('[data-modal-card]') || m.querySelector('div[id$="-card"]');
        if (card) card.classList.remove('scale-95');
    }
}

export function closeModal(id) {
    const m = document.getElementById(id);
    if (m) {
        m.classList.add('opacity-0', 'pointer-events-none');
        const card = m.querySelector('[data-modal-card]') || m.querySelector('div[id$="-card"]');
        if (card) card.classList.add('scale-95');
    }
}

export function formatMoney(num) {
    return '฿' + Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
