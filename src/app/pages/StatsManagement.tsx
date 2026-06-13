import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Pill,
  UserCog,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { db } from "../../firebase/firebase";
import {
  fetchAttendanceMonth,
  fetchAttendanceSeniors,
  type AttendanceSenior,
} from "../../firebase/attendanceList";
import { fetchMealProfiles, type MealProfile } from "../../firebase/mealList";
import {
  fetchMedicineLogs,
  fetchMedicines,
  type MedicineLog,
  type MedicineRow,
} from "../../firebase/medicinesList";
import { fetchStaffList, type StaffRow } from "../../firebase/staffList";
import {
  fetchTransports,
  type TransportRun,
} from "../../firebase/transportsList";

type SeniorStatsRow = {
  id: string;
  name: string;
  gender: string;
  status: string;
};

type ChartDatum = { name: string; value: number };
type MonthlyAttendanceRow = {
  month: string;
  present: number;
  absent: number;
  outing: number;
  earlyLeave: number;
  attendanceRate: number;
};

const TODAY_STR = "2026-06-09";
const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

const countBy = <T,>(items: T[], getKey: (item: T) => string): ChartDatum[] => {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item) || "미입력";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts, ([name, value]) => ({ name, value })).sort(
    (a, b) => b.value - a.value || a.name.localeCompare(b.name, "ko"),
  );
};

const calcRate = (present: number, total: number) =>
  total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

const buildMonthlyAttendanceRows = async (
  year: number,
  monthCount: number,
  seniors: AttendanceSenior[],
): Promise<MonthlyAttendanceRow[]> => {
  const rows: MonthlyAttendanceRow[] = [];

  for (let month = 1; month <= monthCount; month += 1) {
    const monthData = await fetchAttendanceMonth(year, month, seniors);
    let present = 0;
    let absent = 0;
    let outing = 0;
    let earlyLeave = 0;

    Object.values(monthData).forEach((dayData) => {
      Object.values(dayData).forEach((status) => {
        if (status === "출석") present += 1;
        if (status === "결석") absent += 1;
        if (status === "외출") outing += 1;
        if (status === "조퇴") earlyLeave += 1;
      });
    });

    rows.push({
      month: `${month}월`,
      present,
      absent,
      outing,
      earlyLeave,
      attendanceRate: calcRate(present, present + absent + outing + earlyLeave),
    });
  }

  return rows;
};

const mapSeniorStatsDoc = (id: string, data: { name?: string; gender?: string; status?: string; state?: string }): SeniorStatsRow => ({
  id,
  name: data.name?.trim() ?? "",
  gender: data.gender ?? "미입력",
  status: data.status ?? data.state ?? "미입력",
});

function StatsPieChart({
  data,
  title,
  suffix = "명",
}: {
  data: ChartDatum[];
  title: string;
  suffix?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <h3 className="text-[13px] font-semibold text-foreground mb-4">
        {title}
      </h3>
      <div className="flex items-center gap-4">
        <PieChart width={120} height={120}>
          <Pie
            data={data}
            cx={55}
            cy={55}
            innerRadius={32}
            outerRadius={52}
            dataKey="value"
            strokeWidth={2}
          >
            {data.map((item, index) => (
              <Cell
                key={`${title}-${item.name}`}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {data.length === 0 && (
            <p className="text-[12px] text-muted-foreground">
              표시할 데이터가 없습니다
            </p>
          )}
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                }}
              />
              <span className="text-[12px] text-muted-foreground truncate">
                {item.name}
              </span>
              <span className="text-[12px] font-semibold text-foreground ml-auto pl-3">
                {item.value}
                {suffix}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({total ? ((item.value / total) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StatsManagement() {
  const [period, setPeriod] = useState<"월별" | "주별">("월별");
  const [seniors, setSeniors] = useState<SeniorStatsRow[]>([]);
  const [attendanceSeniors, setAttendanceSeniors] = useState<
    AttendanceSenior[]
  >([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<
    MonthlyAttendanceRow[]
  >([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [transports, setTransports] = useState<TransportRun[]>([]);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [mealProfiles, setMealProfiles] = useState<Record<number, MealProfile>>(
    {},
  );
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [medicineLogs, setMedicineLogs] = useState<MedicineLog[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;

    const loadStats = async () => {
      try {
        setLoadError("");
        const [seniorSnapshot, vehicleSnapshot] = await Promise.all([
          getDocs(collection(db, "seniors")),
          getDocs(collection(db, "vehicles")),
        ]);
        const seniorRows = seniorSnapshot.docs
          .map((document) => mapSeniorStatsDoc(document.id, document.data()))
          .filter((senior) => senior.name);

        const [
          attendanceSeniorRows,
          staffRows,
          transportRows,
          mealRows,
          medicineRows,
          logRows,
        ] = await Promise.all([
          fetchAttendanceSeniors(),
          fetchStaffList(),
          fetchTransports(),
          fetchMealProfiles(),
          fetchMedicines(),
          fetchMedicineLogs(TODAY_STR),
        ]);

        const monthRows = await buildMonthlyAttendanceRows(
          2026,
          6,
          attendanceSeniorRows,
        );

        if (!alive) return;
        setSeniors(seniorRows);
        setAttendanceSeniors(attendanceSeniorRows);
        setMonthlyAttendance(monthRows);
        setStaff(staffRows);
        setTransports(transportRows);
        setVehicleCount(vehicleSnapshot.size);
        setMealProfiles(mealRows);
        setMedicines(medicineRows);
        setMedicineLogs(logRows);
      } catch (error) {
        console.error("통계 데이터 불러오기 실패:", error);
        if (alive) setLoadError("Firebase 통계 데이터를 불러오지 못했습니다.");
      }
    };

    loadStats();
    return () => {
      alive = false;
    };
  }, []);

  const seniorGenderData = useMemo(
    () => countBy(seniors, (senior) => senior.gender),
    [seniors],
  );
  const seniorStatusData = useMemo(
    () => countBy(seniors, (senior) => senior.status),
    [seniors],
  );
  const staffTeamData = useMemo(
    () => countBy(staff, (member) => member.team),
    [staff],
  );
  const mealTypeData = useMemo(
    () => countBy(Object.values(mealProfiles), (meal) => meal.mealType),
    [mealProfiles],
  );
  const medicineStatusData = useMemo(
    () => countBy(medicineLogs, (log) => log.status),
    [medicineLogs],
  );
  const summary = useMemo(() => {
    const attendanceTotal = monthlyAttendance.reduce(
      (sum, row) => sum + row.present + row.absent + row.outing + row.earlyLeave,
      0,
    );
    const attendancePresent = monthlyAttendance.reduce((sum, row) => sum + row.present, 0);

    return {
      latestRate: calcRate(attendancePresent, attendanceTotal),
      activeStaff: staff.filter((member) => member.status === "재직" || member.status.includes("재직")).length,
      runningTransports: transports.filter((run) => run.status === "운행중").length,
      pendingMedicinePeople: new Set(
        medicineLogs
          .filter((log) => log.status === "미복용")
          .map((log) => log.seniorName),
      ).size,
    };
  }, [medicineLogs, monthlyAttendance, staff, transports]);

  const cards = useMemo(() => [
    {
      label: "어르신",
      value: `${seniors.length}명`,
      sub: `출석 대상 ${attendanceSeniors.length}명`,
      Icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "출석률",
      value: `${summary.latestRate}%`,
      sub: `${period} 기준`,
      Icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "재직 직원",
      value: `${summary.activeStaff}명`,
      sub: `전체 ${staff.length}명`,
      Icon: UserCog,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "운행중",
      value: `${summary.runningTransports}건`,
      sub: `차량 ${vehicleCount}대`,
      Icon: Bus,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "식단 등록",
      value: `${Object.keys(mealProfiles).length}명`,
      sub: "식단관리 기준",
      Icon: UtensilsCrossed,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "미복용 인원",
      value: `${summary.pendingMedicinePeople}명`,
      sub: `처방 ${medicines.length}건`,
      Icon: Pill,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ], [attendanceSeniors.length, mealProfiles, medicines.length, period, seniors.length, staff.length, summary, vehicleCount]);

  return (
    <div className="p-5 max-w-[1400px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">
            통계 관리
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            각 관리 메뉴의 데이터를 기준으로 통계를 표시합니다
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["월별", "주별"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setPeriod(option)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${period === option ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-700">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-6 gap-4 mb-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-border shadow-sm p-4"
          >
            <div
              className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-3`}
            >
              <card.Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-[12px] font-medium text-muted-foreground">
              {card.label}
            </p>
            <p className="text-[24px] font-bold text-foreground leading-tight">
              {card.value}
            </p>
            <p className="text-[11px] text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-[13px] font-semibold text-foreground mb-4">
            월별 출석률
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAttendance}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="attendanceRate"
                  name="출석률"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-[13px] font-semibold text-foreground mb-4">
            월별 출석 상세
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAttendance}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="present"
                  name="출석"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="absent"
                  name="결석"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="outing"
                  name="외출"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="earlyLeave"
                  name="조퇴"
                  fill="#8b5cf6"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatsPieChart title="성별 분포" data={seniorGenderData} />
        <StatsPieChart title="어르신 상태" data={seniorStatusData} />
        <StatsPieChart title="직원 소속팀" data={staffTeamData} />
        <StatsPieChart title="식사유형" data={mealTypeData} />
        <StatsPieChart
          title="복약 상태"
          data={medicineStatusData}
          suffix="건"
        />
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-[13px] font-semibold text-foreground mb-4">
            주의 항목
          </h3>
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-100 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div>
              <p className="text-[12.5px] font-semibold text-amber-800">
                미복용 인원 {summary.pendingMedicinePeople}명
              </p>
              <p className="text-[11.5px] text-amber-700 mt-0.5">
                복약관리 메뉴의 오늘 기록 기준입니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
