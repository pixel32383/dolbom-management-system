import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";

export type AttStatus = "출석" | "결석" | "외출" | "조퇴" | "-";

export type AttendanceSenior = {
  id: string;
  name: string;
  status: string;
};

export type AttendanceMonthData = Record<number, Record<string, AttStatus>>;

const ATTENDANCE_COLLECTION = "attendance";
const SENIORS_COLLECTION = "seniors";
const DUMMY_ID_PREFIX = "mock-";

const statusMap: Record<string, AttStatus> = {
  정상: "출석",
  병가: "결석",
  외출: "외출",
  조퇴: "조퇴",
};

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
const documentKey = (date: string, seniorId: string) => `${date}_${seniorId}`;

const defaultStatus = (senior: AttendanceSenior, year: number, month: number, day: number): AttStatus => {
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date.getDay() === 0 || date.getDay() === 6 || date > today) return "-";

  const todayKey = dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
  if (dateKey(year, month, day) === todayKey) {
    return statusMap[senior.status] ?? "출석";
  }

  const seed = senior.name.charCodeAt(0) + day * 7 + month * 13;
  const value = seed % 10;
  if (value < 7) return "출석";
  if (value < 8) return "결석";
  if (value < 9) return "외출";
  return "조퇴";
};

const emptyMonthData = (year: number, month: number, seniors: AttendanceSenior[]): AttendanceMonthData => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const data: AttendanceMonthData = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    data[day] = {};
    seniors.forEach(senior => {
      data[day][senior.name] = defaultStatus(senior, year, month, day);
    });
  }

  return data;
};

type AttendanceDoc = {
  date?: string;
  year?: number;
  month?: number;
  day?: number;
  seniorId?: string;
  seniorName?: string;
  status?: AttStatus;
};

const isAttStatus = (status?: string): status is AttStatus =>
  status === "출석" || status === "결석" || status === "외출" || status === "조퇴" || status === "-";

export const fetchAttendanceSeniors = async (): Promise<AttendanceSenior[]> => {
  const snapshot = await getDocs(collection(db, SENIORS_COLLECTION));

  return snapshot.docs
    .map(document => {
      const data = document.data() as { name?: string; status?: string; state?: string };
      return {
        id: document.id,
        name: data.name?.trim() ?? "",
        status: data.status ?? data.state ?? "정상",
      };
    })
    .filter(senior => senior.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
};

export const fetchAttendanceMonth = async (
  year: number,
  month: number,
  seniors: AttendanceSenior[],
): Promise<AttendanceMonthData> => {
  const data = emptyMonthData(year, month, seniors);
  const snapshot = await getDocs(query(
    collection(db, ATTENDANCE_COLLECTION),
    where("year", "==", year),
    where("month", "==", month),
  ));

  snapshot.docs.forEach(document => {
    const item = document.data() as AttendanceDoc;
    if (!item.seniorName || !item.day || !isAttStatus(item.status)) return;

    data[item.day] = {
      ...data[item.day],
      [item.seniorName]: item.status,
    };
  });

  return data;
};

export const updateAttendanceStatus = async (
  year: number,
  month: number,
  day: number,
  senior: AttendanceSenior,
  status: AttStatus,
) => {
  const date = dateKey(year, month, day);
  const key = documentKey(date, senior.id || `${DUMMY_ID_PREFIX}${senior.name}`);

  await setDoc(doc(db, ATTENDANCE_COLLECTION, key), {
    date,
    year,
    month,
    day,
    seniorId: senior.id,
    seniorName: senior.name,
    status,
  }, { merge: true });
};
