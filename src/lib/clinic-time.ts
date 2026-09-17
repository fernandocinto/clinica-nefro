import type { Shift } from "@/lib/supabase/database.types";

const CLINIC_TIMEZONE = "America/Sao_Paulo";
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type ClinicNow = { date: string; time: string; dayOfWeek: number };

// Data/hora "local" da clínica (fuso fixo, já que tenants são clínicas no
// Brasil), usada para resolver disponibilidade de cardápio e turno atual.
export function getClinicNow(): ClinicNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = map.hour === "24" ? "00" : map.hour;

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${hour}:${map.minute}:${map.second}`,
    dayOfWeek: WEEKDAY_INDEX[map.weekday],
  };
}

export function getShiftForTime(time: string): Shift {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}
