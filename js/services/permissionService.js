import { ROLES } from "../state.js";

export function findEmployeeByPin(state, pin) {
  return state.employees.find((e) => e.pin === pin && e.status === "Active") || null;
}

export function canManageTopup(actor) {
  return ROLES[actor.role] >= ROLES["Administrator"];
}

export function canDeleteMenu(actor) {
  return ROLES[actor.role] >= ROLES["Administrator"];
}

export function canDeleteCouponTemplate(actor) {
  return ROLES[actor.role] >= ROLES["Administrator"];
}

export function canEditEmployee(actor, targetEmployee) {
  return actor.id === targetEmployee.id || ROLES[actor.role] > ROLES[targetEmployee.role];
}

export function getPermissionResult(state, actor, actionType, targetId) {
  if (!actor) return { allowed: false, reason: "รหัส PIN ไม่ถูกต้อง" };

  if (actionType === "topup") {
    return canManageTopup(actor)
      ? { allowed: true }
      : { allowed: false, reason: "ต้องใช้สิทธิ์ Admin ขึ้นไป" };
  }

  if (actionType === "edit_emp") {
    const targetEmployee = state.employees.find((e) => e.id === targetId);
    if (!targetEmployee) return { allowed: false, reason: "ไม่พบพนักงานเป้าหมาย" };
    return canEditEmployee(actor, targetEmployee)
      ? { allowed: true, targetEmployee }
      : { allowed: false, reason: "สิทธิ์ไม่เพียงพอในการแก้ไข" };
  }

  if (actionType === "delete_cat" || actionType === "delete_item") {
    return canDeleteMenu(actor)
      ? { allowed: true }
      : { allowed: false, reason: "สิทธิ์ไม่เพียงพอ (ต้องระดับ Admin ขึ้นไป)" };
  }

  if (actionType === "delete_coupon_template") {
    return canDeleteCouponTemplate(actor)
      ? { allowed: true }
      : { allowed: false, reason: "สิทธิ์ไม่เพียงพอ (ต้องระดับ Admin ขึ้นไป)" };
  }

  return { allowed: false, reason: "ไม่รู้จัก action นี้" };
}
