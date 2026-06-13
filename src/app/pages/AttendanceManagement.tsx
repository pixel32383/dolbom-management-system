import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
  Search,
} from "lucide-react";
import {
  fetchAttendanceMonth,
  fetchAttendanceSeniors,
  updateAttendanceStatus,
  type AttendanceSenior,
  type AttStatus,
} from "../../firebase/attendanceList";

const ATT_CELL_STYLE: Record<AttStatus, string> = {
  출석: "bg-emerald-400 hover:bg-emerald-500",
  결석: "bg-red-400 hover:bg-red-500",
  외출: "bg-amber-400 hover:bg-amber-500",
  조퇴: "bg-violet-400 hover:bg-violet-500",
  "-": "bg-slate-100",
};

const ATTENDANCE_STATUSES = ["출석", "결석", "외출", "조퇴"] as const;
const STATUS_CYCLE: AttStatus[] = [...ATTENDANCE_STATUSES, "-"];
const ATTENDANCE_STATUS_META: Record<
  Exclude<AttStatus, "-">,
  {
    label: string;
    sub: string;
    badge: string;
    Icon: typeof CheckCircle2;
    iconBg: string;
    iconColor: string;
  }
> = {
  출석: {
    label: "출석률",
    sub: "출석 기록 비율",
    badge: "bg-emerald-100 text-emerald-700",
    Icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  결석: {
    label: "결석률",
    sub: "결석 기록 비율",
    badge: "bg-red-100 text-red-700",
    Icon: AlertTriangle,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
  },
  외출: {
    label: "외출률",
    sub: "외출 기록 비율",
    badge: "bg-amber-100 text-amber-700",
    Icon: LogOut,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  조퇴: {
    label: "조퇴율",
    sub: "조퇴 기록 비율",
    badge: "bg-violet-100 text-violet-700",
    Icon: Clock,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
};
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function AttendanceManagement() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);
  const [data, setData] = useState<Record<number, Record<string, AttStatus>>>(
    {},
  );
  const [seniors, setSeniors] = useState<AttendanceSenior[]>([]);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    let alive = true;

    const loadAttendance = async () => {
      try {
        setLoadError("");
        const seniorList = await fetchAttendanceSeniors();
        const monthData = await fetchAttendanceMonth(year, month, seniorList);
        if (!alive) return;
        setSeniors(seniorList);
        setData(monthData);
      } catch (error) {
        console.error("출석 데이터 불러오기 실패:", error);
        if (alive) setLoadError("Firebase 출석 데이터를 불러오지 못했습니다.");
      }
    };

    loadAttendance();
    return () => {
      alive = false;
    };
  }, [year, month]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const dayLabel = (day: number) => {
    const date = new Date(year, month - 1, day);
    return {
      weekday: WEEKDAYS[date.getDay()],
      isSat: date.getDay() === 6,
      isSun: date.getDay() === 0,
    };
  };

  const navigate = (delta: number) => {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const selectMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setShowMonthPicker(false);
  };

  const toggleCell = (day: number, name: string) => {
    const senior = seniors.find((item) => item.name === name);
    if (!senior) return;

    const current = data[day]?.[name] ?? "-";
    const next =
      STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    setData((currentData) => ({
      ...currentData,
      [day]: { ...currentData[day], [name]: next },
    }));

    updateAttendanceStatus(year, month, day, senior, next).catch((error) => {
      console.error("출석 상태 저장 실패:", error);
      setLoadError("변경한 출석 상태를 Firebase에 저장하지 못했습니다.");
    });
  };

  const filteredSeniors = useMemo(() => {
    const keyword = search.trim();
    return seniors.filter(
      (senior) => !keyword || senior.name.includes(keyword),
    );
  }, [search, seniors]);

  const totalByName = (name: string, status: AttStatus) =>
    days.filter((day) => data[day]?.[name] === status).length;

  const summary = useMemo(() => {
    const counts: Record<AttStatus, number> = {
      출석: 0,
      결석: 0,
      외출: 0,
      조퇴: 0,
      "-": 0,
    };
    days.forEach((day) => {
      filteredSeniors.forEach((senior) => {
        counts[data[day]?.[senior.name] ?? "-"] += 1;
      });
    });
    return counts;
  }, [data, days, filteredSeniors]);

  const summaryTotal =
    summary.출석 + summary.결석 + summary.외출 + summary.조퇴;
  const summaryRate = (status: Exclude<AttStatus, "-">) =>
    summaryTotal > 0 ? Math.round((summary[status] / summaryTotal) * 100) : 0;

  const today = new Date();
  const isToday = (day: number) =>
    year === today.getFullYear() &&
    month === today.getMonth() + 1 &&
    day === today.getDate();

  return (
    <div className="p-5 max-w-[1800px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">
            출석 관리
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            어르신별 월간 출석 현황을 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center gap-1 bg-white border border-border rounded-lg px-1 py-1 shadow-sm">
            <button
              onClick={() => navigate(-1)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setShowMonthPicker((value) => !value)}
              className="text-[13px] font-semibold text-foreground px-2 min-w-[92px] h-7 rounded-md text-center tabular-nums hover:bg-muted transition-colors"
            >
              {year}년 {month}월
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
              ›
            </button>
            {showMonthPicker && (
              <div className="absolute top-10 right-0 z-10 w-72 rounded-xl border border-border bg-white shadow-lg p-3">
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {[year - 1, year, year + 1].map((optionYear) => (
                    <button
                      key={optionYear}
                      onClick={() => selectMonth(optionYear, month)}
                      className={`px-2 py-1.5 text-[12px] rounded-lg ${optionYear === year ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
                    >
                      {optionYear}년
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (optionMonth) => (
                      <button
                        key={optionMonth}
                        onClick={() => selectMonth(year, optionMonth)}
                        className={`px-2 py-1.5 text-[12px] rounded-lg ${optionMonth === month ? "bg-slate-900 text-white" : "hover:bg-muted text-muted-foreground"}`}
                      >
                        {optionMonth}월
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              className="w-48 pl-9 pr-3 py-1.5 bg-white border border-border rounded-lg text-[13px] focus:outline-none focus:border-primary transition-colors"
              placeholder="어르신 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-[12px] border border-red-100">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-5">
        {ATTENDANCE_STATUSES.map((status) => {
          const card = ATTENDANCE_STATUS_META[status];
          return (
            <div
              key={status}
              className="bg-white rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {card.label}
                </p>
                <div
                  className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}
                >
                  <card.Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-[26px] font-bold text-foreground leading-none mb-1 tracking-tight">
                {summaryRate(status)}%
              </p>
              <p
                className="text-[12px] text-muted-foreground truncate"
                title={card.sub}
              >
                {card.sub}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px] min-w-[1400px]">
            <thead>
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-10 bg-muted/60 px-4 py-2.5 text-left font-semibold text-muted-foreground w-32">
                  어르신
                </th>
                {days.map((day) => {
                  const label = dayLabel(day);
                  return (
                    <th
                      key={day}
                      className={`px-1 py-2 text-center font-semibold ${label.isSun ? "text-red-500" : label.isSat ? "text-blue-500" : "text-muted-foreground"}`}
                    >
                      <div>{day}</div>
                      <div className="text-[10px] font-medium">
                        {label.weekday}
                      </div>
                    </th>
                  );
                })}
                {ATTENDANCE_STATUSES.map((status) => (
                  <th
                    key={status}
                    className="px-2 py-2 text-center font-semibold text-muted-foreground"
                  >
                    {status}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSeniors.map((senior) => (
                <tr key={senior.id} className="hover:bg-muted/30">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-foreground">
                    {senior.name}
                  </td>
                  {days.map((day) => {
                    const status = data[day]?.[senior.name] ?? "-";
                    return (
                      <td
                        key={day}
                        className={`px-1 py-1.5 text-center ${isToday(day) ? "bg-blue-50" : ""}`}
                      >
                        <button
                          onClick={() => toggleCell(day, senior.name)}
                          className={`mx-auto h-6 w-6 rounded-md text-[10px] font-semibold text-white transition-colors ${ATT_CELL_STYLE[status]} ${status === "-" ? "text-slate-400" : ""}`}
                          title={`${senior.name} ${day}일 ${status}`}
                        >
                          {status === "-" ? "-" : status.slice(0, 1)}
                        </button>
                      </td>
                    );
                  })}
                  {ATTENDANCE_STATUSES.map((status) => (
                    <td key={status} className="px-2 py-2 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${ATTENDANCE_STATUS_META[status].badge}`}
                      >
                        {totalByName(senior.name, status)}일
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              {filteredSeniors.length === 0 && (
                <tr>
                  <td
                    colSpan={days.length + 5}
                    className="py-12 text-center text-[13px] text-muted-foreground"
                  >
                    검색 결과가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
