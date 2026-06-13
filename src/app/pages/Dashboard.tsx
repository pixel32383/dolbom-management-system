import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Users,
} from "lucide-react";
import { db } from "../../firebase/firebase";
import {
  fetchAttendanceMonth,
  fetchAttendanceSeniors,
  type AttendanceSenior,
  type AttStatus,
} from "../../firebase/attendanceList";
import {
  fetchNotifications,
  type NotificationRow,
} from "../../firebase/notificationsList";
import { fetchPrograms, type ProgramRow } from "../../firebase/programsList";
import { fetchStaffList, type StaffRow } from "../../firebase/staffList";
import {
  fetchTransports,
  type TransportRun,
} from "../../firebase/transportsList";
import { statusStyle, transportStatusStyle } from "../shared/styles";

type DashboardSenior = {
  id: string;
  name: string;
  age: number | string;
  dong: string;
  room: string;
};

const formatDate = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const shiftDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isActiveStaff = (staff: StaffRow) =>
  staff.status === "재직" || staff.status.includes("재직");
const isRunningTransport = (run: TransportRun) => run.status === "운행중";

export default function Dashboard({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [seniors, setSeniors] = useState<DashboardSenior[]>([]);
  const [attendanceSeniors, setAttendanceSeniors] = useState<
    AttendanceSenior[]
  >([]);
  const [todayAttendance, setTodayAttendance] = useState<
    Record<string, AttStatus>
  >({});
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [transports, setTransports] = useState<TransportRun[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [notices, setNotices] = useState<NotificationRow[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;

    const loadDashboard = async () => {
      try {
        setLoadError("");
        const seniorSnapshot = await getDocs(collection(db, "seniors"));
        const seniorRows = seniorSnapshot.docs
          .map((document) => {
            const data = document.data() as {
              name?: string;
              age?: number | string;
              dong?: string;
              room?: string;
            };
            return {
              id: document.id,
              name: data.name?.trim() ?? "",
              age: data.age ?? "",
              dong: data.dong ?? "",
              room: data.room ?? "",
            };
          })
          .filter((senior) => senior.name)
          .sort((a, b) => a.name.localeCompare(b.name, "ko"));

        const [
          attendanceRows,
          staffRows,
          transportRows,
          programRows,
          noticeRows,
        ] = await Promise.all([
          fetchAttendanceSeniors(),
          fetchStaffList(),
          fetchTransports(),
          fetchPrograms(),
          fetchNotifications(),
        ]);
        const monthData = await fetchAttendanceMonth(
          selectedDate.getFullYear(),
          selectedDate.getMonth() + 1,
          attendanceRows,
        );

        if (!alive) return;
        setSeniors(seniorRows);
        setAttendanceSeniors(attendanceRows);
        setTodayAttendance(monthData[selectedDate.getDate()] ?? {});
        setStaff(staffRows);
        setTransports(transportRows);
        setPrograms(programRows);
        setNotices(noticeRows);
      } catch (error) {
        console.error("대시보드 데이터 불러오기 실패:", error);
        if (alive)
          setLoadError("Firebase 대시보드 데이터를 불러오지 못했습니다.");
      }
    };

    loadDashboard();
    return () => {
      alive = false;
    };
  }, [selectedDate]);

  const attendanceCounts = useMemo(() => {
    const values = Object.values(todayAttendance);
    const present = values.filter((status) => status === "출석").length;
    const absent = values.filter((status) => status === "결석").length;
    const outing = values.filter((status) => status === "외출").length;
    const earlyLeave = values.filter((status) => status === "조퇴").length;
    return {
      present,
      absent,
      outing,
      earlyLeave,
      total: present + absent + outing + earlyLeave,
    };
  }, [todayAttendance]);

  const today = new Date();
  const selectedDateKey = formatDate(selectedDate);
  const currentDateKey = formatDate(today);
  const yesterdayKey = formatDate(shiftDate(today, -1));
  const tomorrowKey = formatDate(shiftDate(today, 1));
  const selectedDateLabel = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;
  const dateTitle =
    selectedDateKey === currentDateKey
      ? "오늘의 현황"
      : selectedDateKey === yesterdayKey
        ? "어제 현황"
        : selectedDateKey === tomorrowKey
          ? "내일 현황"
          : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 현황`;
  const dateShortLabel = dateTitle.replace("의 현황", "").replace(" 현황", "");

  const totalElderly = seniors.length;
  const attending = attendanceCounts.present;
  const nonAttend =
    attendanceCounts.absent +
    attendanceCounts.outing +
    attendanceCounts.earlyLeave;
  const attendRate =
    attendanceCounts.total > 0
      ? Math.round((attending / attendanceCounts.total) * 100)
      : 0;
  const activeStaff = staff.filter(isActiveStaff).length;
  const runningTransports = transports.filter(isRunningTransport).length;
  const passengerCount = new Set(transports.flatMap((run) => run.passengers))
    .size;
  const scheduleItems = programs
    .filter((program) => program.date === selectedDateKey)
    .slice(0, 6);
  const transportItems = transports.slice(0, 3);
  const noticeItems = notices.slice(0, 5);
  const attendanceRows = attendanceSeniors.slice(0, 8).map((senior) => {
    const profile = seniors.find((item) => item.name === senior.name);
    return {
      ...senior,
      age: profile?.age ?? "",
      dong: profile?.dong ?? "",
      room: profile?.room ?? "",
      todayStatus: todayAttendance[senior.name] ?? "-",
    };
  });

  const kpiCards = [
    {
      label: "총 이용자",
      value: `${totalElderly}명`,
      sub: "어르신 관리 등록 기준",
      Icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: `${dateShortLabel} 출석`,
      value: `${attending}명`,
      sub: `출석률 ${attendRate}%`,
      Icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "미출석",
      value: `${nonAttend}명`,
      sub: `결석 ${attendanceCounts.absent} · 외출 ${attendanceCounts.outing} · 조퇴 ${attendanceCounts.earlyLeave}`,
      Icon: AlertTriangle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "운영 인력",
      value: `${activeStaff}명`,
      sub: "직원관리 재직 기준",
      Icon: UserCog,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="p-5 max-w-[1400px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate((date) => shiftDate(date, -1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="어제 현황"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-[18px] font-semibold text-foreground tracking-tight">
              {dateTitle}
            </h1>
            <button
              type="button"
              onClick={() => setSelectedDate((date) => shiftDate(date, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="내일 현황"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {selectedDateLabel} 기준 운영 현황입니다
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedDate(new Date())}
          className="px-3 py-1.5 text-[12.5px] font-medium rounded-lg bg-white border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          오늘
        </button>
      </div>

      {loadError && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-[12px] border border-red-100">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-5">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow cursor-default"
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
              {card.value}
            </p>
            <p className="text-[12px] text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
            <h2 className="text-[13px] font-semibold text-foreground">
              송영 관리
            </h2>
            <button
              onClick={() => onNavigate("송영 관리")}
              className="text-[12px] text-primary hover:text-blue-700 font-medium transition-colors flex items-center gap-0.5"
            >
              전체 보기
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {transportItems.map((run) => (
              <div
                key={run.firestoreId ?? run.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <Car className="w-4.5 h-4.5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[13px] font-semibold text-foreground">
                      {run.vehicleId}
                    </p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${transportStatusStyle(run.status)}`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-0.5">
                    {run.driver || "담당자 미정"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {run.route} · {run.scheduledTime}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-muted-foreground">탑승</p>
                  <p className="text-[16px] font-bold text-foreground tabular-nums">
                    {run.passengers.length}
                  </p>
                </div>
              </div>
            ))}
            {transports.length === 0 && (
              <p className="py-6 text-center text-[12px] text-muted-foreground">
                등록된 운행이 없습니다
              </p>
            )}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-border text-[12px] text-muted-foreground">
            등록 운행 {transports.length}건 · 운행중 {runningTransports}건 ·
            중복 제외 탑승 {passengerCount}명
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
            <h2 className="text-[13px] font-semibold text-foreground">
              {dateTitle.replace("현황", "일정")}
            </h2>
            <button
              onClick={() => onNavigate("일정 · 프로그램")}
              className="text-[12px] text-primary hover:text-blue-700 font-medium transition-colors flex items-center gap-0.5"
            >
              전체 보기
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-y-3">
              {scheduleItems.map((item) => (
                <div
                  key={item.firestoreId ?? item.id}
                  className="flex items-start gap-2.5"
                >
                  <span className="text-[11px] text-muted-foreground w-10 shrink-0 pt-0.5 text-right tabular-nums">
                    {item.time}
                  </span>
                  <div className="w-[3px] self-stretch rounded-full shrink-0 bg-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-foreground leading-tight truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {item.staff || item.category}
                    </p>
                  </div>
                </div>
              ))}
              {scheduleItems.length === 0 && (
                <p className="py-6 text-center text-[12px] text-muted-foreground">
                  등록된 일정이 없습니다
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-4">
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
            <h2 className="text-[13px] font-semibold text-foreground">
              {dateTitle.replace("현황", "출석 현황")}
            </h2>
            <button
              onClick={() => onNavigate("출석 관리")}
              className="text-[12px] text-primary hover:text-blue-700 font-medium transition-colors flex items-center gap-0.5"
            >
              전체 보기
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-muted/60">
                  <th className="px-5 py-2.5 text-left font-semibold text-muted-foreground">
                    어르신
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">
                    나이
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">
                    동
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">
                    방
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendanceRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-muted/40 transition-colors cursor-default"
                  >
                    <td className="px-5 py-2.5 font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">
                      {row.age}
                    </td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground text-[12px]">
                      {row.dong}
                    </td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground text-[12px]">
                      {row.room}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyle(row.todayStatus)}`}
                      >
                        {row.todayStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {attendanceRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-[12px] text-muted-foreground"
                    >
                      출석 데이터가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
            <h2 className="text-[13px] font-semibold text-foreground">
              공지 · 알림
            </h2>
            <button
              onClick={() => onNavigate("공지 · 알림 관리")}
              className="text-[12px] text-primary hover:text-blue-700 font-medium transition-colors flex items-center gap-0.5"
            >
              전체 보기
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {noticeItems.map((notice) => (
              <button
                key={notice.id}
                onClick={() => onNavigate("공지 · 알림 관리")}
                className="w-full px-5 py-3 hover:bg-muted/40 transition-colors cursor-pointer flex items-start gap-3 text-left"
              >
                <span
                  className={`mt-0.5 shrink-0 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none ${
                    notice.urgent
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {notice.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[12.5px] font-medium leading-snug ${notice.urgent ? "text-red-700" : "text-foreground"}`}
                  >
                    {notice.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {notice.date}
                  </p>
                </div>
              </button>
            ))}
            {noticeItems.length === 0 && (
              <p className="py-8 text-center text-[12px] text-muted-foreground">
                등록된 공지가 없습니다
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
