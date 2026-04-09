import { ROLES } from "../state.js";

export function findActiveEmployeeByPin(state, pin) {
  return state.employees.find((e) => e.pin === pin && e.status === "Active") || null;
}

export function toggleEmployeeClock(employee) {
  const now = new Date();
  employee.isClockedIn = !employee.isClockedIn;
  return {
    employee,
    isClockedIn: employee.isClockedIn,
    typeStr: employee.isClockedIn ? "เข้างาน (IN)" : "ออกงาน (OUT)",
    timeStr: `${now.toLocaleDateString('th-TH')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
  };
}

export function appendTimeLog(state, clockResult) {
  state.timeLogs.unshift({
    id: Date.now(),
    empName: clockResult.employee.name,
    role: clockResult.employee.role,
    type: clockResult.typeStr,
    time: clockResult.timeStr,
    isClockedIn: clockResult.isClockedIn,
  });
}

export function saveEmployeeRecord(state, payload) {
  const { id, name, role, pin, profilePic } = payload;

  if (!name || pin.length !== 6) {
    return { ok: false, reason: "ข้อมูลไม่ครบ หรือ PIN ไม่ถึง 6 หลัก" };
  }

  if (id) {
    const employee = state.employees.find((e) => String(e.id) === String(id));
    if (!employee) return { ok: false, reason: "ไม่พบพนักงานที่ต้องการแก้ไข" };

    employee.name = name;
    employee.role = role;
    employee.pin = pin;
    if (profilePic) employee.profilePic = profilePic;

    return { ok: true, mode: "edit", employee };
  }

  const newEmployee = {
    id: Date.now(),
    name,
    role,
    pin,
    status: "Active",
    isClockedIn: false,
    profilePic: profilePic || null,
  };

  state.employees.push(newEmployee);
  return { ok: true, mode: "create", employee: newEmployee };
}

export function getRoleBadgeClass(role) {
  if (role === "Owner") return "bg-purple-100 text-purple-700 border-purple-200";
  if (role === "Administrator") return "bg-primary/10 text-primary border-primary/20";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

export function canManageMarketing(actor) {
  return !!actor && ROLES[actor.role] >= ROLES["Owner"];
}
