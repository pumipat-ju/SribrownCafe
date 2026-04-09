export const ROLES = { 'Owner': 4, 'Administrator': 3, 'Cafe Staff': 2, 'Part-time Staff': 1 };

export let state = {
            currentEmployee: null,
            shift: {
                isOpen: false,
                startCash: 0,
                salesCash: 0,
                topupCash: 0,
                cashIn: 0,
                cashOut: 0,
                openedBy: null,
                openTime: null
            },
            employees: [
                { id: 1, name: 'บอส', role: 'Owner', pin: '999999', status: 'Active', isClockedIn: false, profilePic: null },
                { id: 2, name: 'นัท', role: 'Administrator', pin: '111111', status: 'Active', isClockedIn: true, profilePic: null },
                { id: 3, name: 'จอย', role: 'Part-time Staff', pin: '222222', status: 'Active', isClockedIn: false, profilePic: null }
            ],
            members: [
                { id: 1, phone: '081-123-4567', name: 'พลอยไพลิน', nickname: 'พลอย', dob: '1995-05-15', pin: '123456', tier: 'Platinum', totalSpent: 6500, balance: 750.00, profilePic: null, coupons: [] },
                { id: 2, phone: '089-987-6543', name: 'ณัฐพงษ์', nickname: 'นัท', dob: '', pin: '654321', tier: 'Silver', totalSpent: 450, balance: 120.00, profilePic: null, coupons: [{ id: 99, templateId: 'ct_1', name: 'ฟรีเครื่องดื่ม 1 แก้ว', type: 'free_drink', value: 0, used: false }] }
            ],
            marketing: {
                tiers: [
                    { id: 'silver', name: 'Silver', minSpent: 0, discountPercent: 0, color: 'bg-stone-100 text-stone-600 border-stone-200' },
                    { id: 'gold', name: 'Gold', minSpent: 1000, discountPercent: 5, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                    { id: 'platinum', name: 'Platinum', minSpent: 5000, discountPercent: 10, color: 'bg-amber-50 text-amber-700 border-amber-200' }
                ],
                promotions: [
                    { id: 'promo_1', name: 'กาแฟแก้วที่ 2 ลด 50%', desc: 'ลดราคาแก้วที่ถูกที่สุดในหมวดกาแฟ', active: true }
                ],
                couponTemplates: [
                    { id: 'ct_1', name: 'ฟรีเครื่องดื่ม 1 แก้ว', type: 'free_drink', value: 0, desc: 'หักลบราคาเครื่องดื่มที่ถูกที่สุดในบิล 100%', icon: 'local_cafe' },
                    { id: 'ct_2', name: 'ฟรีเบเกอรี่ 1 ชิ้น', type: 'free_bakery', value: 0, desc: 'หักลบราคาขนมที่ถูกที่สุดในบิล 100%', icon: 'bakery_dining' },
                    { id: 'ct_3', name: 'ส่วนลด 20 บาท', type: 'fixed_discount', value: 20, desc: 'ลดราคาท้ายบิล 20 บาท', icon: 'sell' }
                ]
            },
            menu: {
                categories: [
                    { id: 'coffee', name: '☕️ กาแฟ' }, { id: 'tea', name: '🍵 ชา' }, { id: 'milk', name: '🥛 นม/โกโก้' },
                    { id: 'soda', name: '🥤 โซดา' }, { id: 'bakery', name: '🥐 ขนมอบ' }, { id: 'cake', name: '🍰 เค้ก' }, { id: 'food', name: '🍝 อาหารคาว' }
                ],
                items: [
                    { id: 1, cat: 'coffee', name: 'เอสเพรสโซ่', price: 100, rule: 'espresso' }, { id: 2, cat: 'coffee', name: 'อเมริกาโน่', price: 90, rule: 'americano' },
                    { id: 3, cat: 'coffee', name: 'ลาเต้', price: 100, rule: 'standard' }, { id: 4, cat: 'coffee', name: 'คาปูชิโน่', price: 100, rule: 'standard' },
                    { id: 5, cat: 'coffee', name: 'มอคค่า', price: 110, rule: 'standard' }, { id: 6, cat: 'tea', name: 'ชาไทย', price: 80, rule: 'standard' },
                    { id: 7, cat: 'tea', name: 'ชาเขียวมัทฉะ', price: 100, rule: 'standard' }, { id: 8, cat: 'milk', name: 'โกโก้', price: 90, rule: 'standard' },
                    { id: 9, cat: 'milk', name: 'นมสด', price: 80, rule: 'standard' }, { id: 10, cat: 'soda', name: 'สตรอว์เบอร์รีโซดา', price: 75, rule: 'iced_only' },
                    { id: 11, cat: 'soda', name: 'ยูซุโซดา', price: 85, rule: 'iced_only' }, { id: 12, cat: 'bakery', name: 'โทสต์น้ำผึ้ง', price: 120, rule: 'none' },
                    { id: 13, cat: 'bakery', name: 'โทสต์กระทะร้อน', price: 150, rule: 'none' }, { id: 14, cat: 'bakery', name: 'ครัวซองต์เนยสด', price: 85, rule: 'none' },
                    { id: 15, cat: 'cake', name: 'บราวนี่', price: 75, rule: 'none' }, { id: 19, cat: 'cake', name: 'ชีสเค้กหน้าไหม้', price: 140, rule: 'none' },
                    { id: 16, cat: 'food', name: 'พิซซ่าฮาวายเอี้ยน', price: 199, rule: 'none' }, { id: 17, cat: 'food', name: 'สปาเก็ตตี้คาโบนาร่า', price: 149, rule: 'none' },
                    { id: 18, cat: 'food', name: 'เฟรนช์ฟรายส์', price: 89, rule: 'none' }
                ]
            },
            history: [],
            timeLogs: [],
            drawerLogs: [],
            pos: {
                cart: [],
                heldOrders: [],
                actionType: null,
                targetId: null,
                paymentMethod: null,
                currentTotalDiscount: 0,
                currentAutoDiscount: 0,
                cartMember: null,
                appliedCouponId: null
            }
        };
