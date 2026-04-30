import React from 'react';

export default function ReceiptPrintout({ txn, printType = 'SHORT', taxForm = null }) {
    if (!txn) return null;

    let displayItems = [];
    if (typeof txn.items === 'string') {
        try { displayItems = JSON.parse(txn.items); } catch (e) { }
    } else if (Array.isArray(txn.items)) {
        displayItems = txn.items;
    }

    return (
        <>
            <style type="text/css">
                {`
                .print-only-receipt { display: none; }
                @media print { 
                    @page { size: 80mm auto; margin: 0mm; }
                    body * { visibility: hidden; }
                    .print-only-receipt, .print-only-receipt * { visibility: visible; }
                    .print-only-receipt {
                        display: block !important; position: absolute; left: 0; top: 0;
                        width: 80mm !important; padding: 5mm !important; 
                        background: white !important; color: black !important;
                        font-family: sans-serif;
                    }
                    .font-mono-print { font-family: monospace, sans-serif; }
                }
                `}
            </style>

            {/* ======================================================== */}
            {/* 📊 โหมด: Z-REPORT / X-REPORT (รูปแบบ Sribrown POS เต็มยศ) */}
            {/* ======================================================== */}
            {txn.type === 'Z_REPORT' || txn.type === 'SHIFT_CLOSE' || txn.type === 'X_REPORT' ? (
                <div className="print-only-receipt font-mono-print">

                    {/* 1. Header */}
                    <div className="text-center mb-4">
                        <h1 className="font-bold text-[18px] leading-tight mb-1">Sribrown POS</h1>
                        <p className="text-[10px] mb-2">Print Time: {new Date().toLocaleString('th-TH')}</p>
                        <h2 className="font-bold text-[14px] mb-2">
                            {txn.type === 'X_REPORT' ? 'X-Report (รายงานระหว่างกะ)' : 'End Drawer Report'}
                        </h2>
                        <p className="text-[11px] font-bold">Drawer ID: {txn.id || txn.bill_id}</p>
                    </div>

                    <div className="mb-3 text-[11px] leading-snug">
                        <h1 className="font-bold text-[14px] mb-1">Sri Brown Cafe' กังสดาล</h1>
                        <p>Start Drawer: {new Date(txn.startTime).toLocaleString('th-TH')}</p>
                        <p className="pl-4">Start By: {txn.cashier}</p>
                        {txn.type !== 'X_REPORT' && txn.endTime && (
                            <>
                                <p>End Drawer: {new Date(txn.endTime).toLocaleString('th-TH')}</p>
                                <p className="pl-4">End By: {txn.cashier}</p>
                            </>
                        )}
                    </div>

                    {/* 2. Sales by Category */}
                    <div className="mb-3 text-[11px]">
                        <h3 className="font-bold mb-1 underline">Sales by Category</h3>
                        {Object.entries(txn.salesByCategory || {}).length > 0 ? (
                            Object.entries(txn.salesByCategory).map(([cat, data]) => (
                                <div key={cat} className="flex justify-between">
                                    <span className="w-[45%] pl-2 truncate">{cat}</span>
                                    <span className="w-[15%] text-center">{data.qty}</span>
                                    <span className="w-[40%] text-right">
                                        {(data.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-[10px] pl-2 italic text-stone-400">ไม่มีข้อมูลหมวดหมู่</p>
                        )}
                    </div>

                    {/* 3. Sales Summary */}
                    <div className="mb-3 text-[11px] border-t border-b border-black border-dashed py-2 space-y-0.5">
                        <div className="flex justify-between"><span>Sub Total</span><span>{(txn.subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span>Discount</span><span>-{(txn.totalDiscount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span>Exclude SVC</span><span>0.00</span></div>
                        <div className="flex justify-between"><span>Non-VAT Sales</span><span>0.00</span></div>
                        <div className="flex justify-between"><span>Sales before VAT</span><span>{(txn.salesBeforeVat || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span>Include VAT</span><span>{(txn.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span>Total Rounding</span><span>0.00</span></div>
                        <div className="flex justify-between font-bold text-[12px] mt-1"><span>Total Sales</span><span>{(txn.netSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between mt-1"><span>Number of Bills</span><span>{txn.totalBills || 0}</span></div>
                        <div className="flex justify-between"><span>Average Trans</span><span>{(txn.avgTrans || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    </div>

                    {/* 4. Sales by Channel */}
                    <div className="mb-3 text-[11px]">
                        <h3 className="font-bold mb-1 underline">Sales by Channel</h3>
                        <p className="font-bold">Restaurant</p>
                        <div className="flex justify-between pl-2">
                            <span>- Table</span>
                            <span>{txn.totalBills || 0}</span>
                            <span>{(txn.netSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* 🌟 5. Discount & Promotion (ปรับ Format ใหม่ 3 คอลัมน์เป๊ะๆ) */}
                    <div className="mb-3 text-[11px] border-t border-black border-dashed pt-2">
                        <h3 className="font-bold mb-1 underline">Discount & Promotion</h3>
                        {txn.discountsBreakdown && Object.keys(txn.discountsBreakdown).length > 0 ? (
                            <>
                                {Object.entries(txn.discountsBreakdown).map(([name, data]) => (
                                    <div key={name} className="flex text-[11px] w-full mb-0.5">
                                        <span className="flex-1 truncate">- {name}</span>
                                        <span className="w-16 text-right">({data.count} บิล)</span>
                                        <span className="w-16 text-right font-mono-print">{(data.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-bold text-[11px] mt-1 pt-1 border-t border-black border-dashed">
                                    <span>รวมส่วนลดทั้งหมด</span>
                                    <span>{(txn.totalDiscount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-center italic">ไม่มีส่วนลดในกะนี้</p>
                        )}
                    </div>

                    {/* 6. Payment */}
                    <div className="mb-3 text-[11px] border-t border-black border-dashed pt-2">
                        <h3 className="font-bold mb-1 underline">Payment</h3>
                        <div className="flex justify-between"><span>By Cash</span><span>{(txn.salesCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span>By QR payment</span><span>{(txn.salesQr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span>By E-Wallet</span><span>{(txn.salesWallet || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between font-bold mt-1 pt-1 border-t border-black border-dashed">
                            <span>Total Revenue payment</span>
                            <span>{((txn.salesCash || 0) + (txn.salesQr || 0) + (txn.salesWallet || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* 7. Drawer */}
                    <div className="mb-3 text-[11px] border-t border-black border-dashed pt-2">
                        <h3 className="font-bold mb-1 underline">Drawer</h3>
                        <div className="flex justify-between"><span>Start Drawer</span><span>{(txn.startCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span>Cash Sales</span><span>{(txn.salesCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span>Topup E-Wallet</span><span>{(txn.topupCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span>Paid In/Out</span><span>{((txn.cashIn || 0) - (txn.cashOut || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>

                        <div className="flex justify-between font-bold mt-1 pt-1 border-t border-black border-dashed">
                            <span>Expected in Drawer</span><span>{(txn.expectedCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>Actual in Drawer</span><span>{(txn.actualCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>Difference</span><span>{(txn.difference || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between mt-1"><span>Total Bills</span><span>{txn.totalBills || 0}</span></div>
                    </div>

                    {/* 8. Void & Cancel */}
                    <div className="mb-6 text-[11px] border-t border-b border-black border-dashed py-2">
                        <h3 className="font-bold mb-1 underline">Void & Cancel</h3>
                        <div className="flex justify-between"><span>Void All</span><span className="w-8 text-center">0</span><span className="w-16 text-right">0.00</span></div>
                        <div className="flex justify-between"><span>Cancel Bill</span><span className="w-8 text-center">0</span><span className="w-16 text-right">0.00</span></div>
                    </div>

                    {/* 9. Signatures */}
                    <div className="space-y-8 text-center text-[11px]">
                        <div>
                            <p>.......................................</p>
                            <p className="mt-1">Cashier Signature</p>
                        </div>
                        <div>
                            <p>.......................................</p>
                            <p className="mt-1">Manager Signature</p>
                        </div>
                    </div>
                    <div className="text-center mt-4">
                        <p className="text-[10px]">- - - - - - - - - - - - - - -</p>
                    </div>
                </div>

            ) : (

                /* ======================================================== */
                /* 🛍️ โหมดที่ 2: บิลปกติ (SALE, TOPUP, EXPENSE) อิงโค้ดเดิมของเพื่อน */
                /* ======================================================== */
                <div className="print-only-receipt">
                    <div className="text-center mb-2">
                        <h1 className="font-bold text-[16px] leading-tight">SRI BROWN CAFE</h1>
                        <p className="text-[10px] leading-tight">123 ถ.มิตรภาพ อ.เมือง จ.ขอนแก่น 40000</p>
                        <p className="text-[10px] leading-tight">โทร. 080-123-4567</p>
                        <p className="text-[10px] leading-tight">เลขประจำตัวผู้เสียภาษี: 0123456789012 (สำนักงานใหญ่)</p>
                        <h2 className="font-bold text-[12px] mt-2 border-b border-black border-dashed pb-1">
                            {printType === 'FULL' ? 'ใบกำกับภาษีเต็มรูป (TAX INVOICE)' : 'ใบกำกับภาษีอย่างย่อ (ABB)'}
                        </h2>
                    </div>

                    {printType === 'FULL' && taxForm && (
                        <div className="mb-2 text-[10px] space-y-0.5 leading-tight">
                            <p><strong>ชื่อลูกค้า:</strong> {taxForm.name}</p>
                            <p><strong>เลขผู้เสียภาษี:</strong> {taxForm.taxId}</p>
                            <p><strong>สาขา:</strong> {taxForm.branch === 'HQ' ? 'สำนักงานใหญ่' : `สาขา ${taxForm.branchId}`}</p>
                            <p className="break-words whitespace-pre-wrap"><strong>ที่อยู่:</strong> {taxForm.address}</p>
                            <div className="border-b border-black border-dashed my-1"></div>
                        </div>
                    )}

                    <div className="mb-2 text-[10px] leading-tight">
                        <p><strong>เลขที่:</strong> {txn.bill_id || txn.id}</p>
                        <p><strong>วันที่:</strong> {new Date(txn.date_raw || txn.timestamp || txn.created_at).toLocaleString('th-TH')}</p>
                        <p><strong>พนักงาน:</strong> {txn.cashier}</p>
                    </div>

                    <table className="w-full mb-2 text-[10px] leading-tight border-collapse">
                        <thead className="border-t border-b border-black border-dashed">
                            <tr>
                                <th className="text-left py-1 w-[65%]">รายการ</th>
                                <th className="text-center py-1 w-[12%]">จำนวน</th>
                                <th className="text-right py-1 w-[23%]">รวม</th>
                            </tr>
                        </thead>
                        <tbody className="border-b border-black border-dashed">
                            {displayItems.length > 0 ? (
                                displayItems.map((item, idx) => (
                                    <tr key={item.cartKey || idx}>
                                        <td className="py-2 align-top">
                                            <div className="w-full pr-2 leading-normal font-bold">{item.name}</div>
                                            {item.options && (
                                                <div className="text-[9px] text-gray-600 w-full pr-2 leading-relaxed mt-0.5">
                                                    - {item.options}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-center py-2 align-top leading-normal">{item.qty}</td>
                                        <td className="text-right py-2 align-top leading-normal">
                                            {((item.price || 0) * (item.qty || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="py-4 text-[11px] whitespace-pre-wrap leading-relaxed text-center">
                                        {txn.desc || 'ไม่มีรายละเอียดสินค้า'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="space-y-0.5 text-[10px] mb-2 leading-tight">
                        {txn.subtotal !== undefined && <div className="flex justify-between"><span>รวมเป็นเงิน (Subtotal)</span><span>{txn.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
                        {txn.discount > 0 && <div className="flex justify-between"><span>ส่วนลด (Discount)</span><span>-{txn.discount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
                        {txn.beforeVat !== undefined && <div className="flex justify-between"><span>มูลค่าสินค้า (Before VAT)</span><span>{txn.beforeVat?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
                        {txn.vatAmount !== undefined && <div className="flex justify-between"><span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span><span>{txn.vatAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}

                        <div className="flex justify-between font-bold text-[12px] mt-1 border-t border-black border-dashed pt-1">
                            <span>ยอดชำระสุทธิ (Net Total)</span><span>{parseFloat(txn.amount || txn.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {txn.paymentMethod && (
                        <div className="space-y-0.5 text-[10px] mb-4 border-t border-black border-dashed pt-1 leading-tight">
                            <div className="flex justify-between"><span>ชำระผ่าน ({txn.paymentMethod})</span><span>{txn.receivedAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || parseFloat(txn.amount || txn.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                            {txn.paymentMethod === 'CASH' && txn.change !== undefined && <div className="flex justify-between"><span>เงินทอน (Change)</span><span>{txn.change?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
                        </div>
                    )}

                    <div className="text-center text-[10px] mt-2 mb-4 leading-tight">
                        <p>ขอบคุณที่ใช้บริการ</p>
                        <p>Please come again</p>
                        <p className="mt-2">- - - - - - - - - - -</p>
                    </div>
                </div>
            )}
        </>
    );
}