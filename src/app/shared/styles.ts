export const SCHEDULE_COLORS: Record<string, string> = {
  복약: "bg-amber-400",
  프로그램: "bg-blue-500",
  행사: "bg-emerald-500",
  송영: "bg-violet-500",
};

export function statusStyle(status: string) {
  if (status === "출석") return "bg-emerald-100 text-emerald-700";
  if (status === "결석") return "bg-red-100 text-red-700";
  if (status === "외출") return "bg-amber-100 text-amber-700";
  if (status === "조퇴") return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

export function transportStatusStyle(status: string) {
  if (status === "운행중") return "bg-blue-100 text-blue-700";
  if (status === "대기") return "bg-slate-100 text-slate-600";
  if (status === "완료") return "bg-emerald-100 text-emerald-700";
  if (status === "취소") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}
