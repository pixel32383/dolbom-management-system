import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type MedTiming = "아침" | "점심" | "저녁" | "취침전";
export type MedStatus = "복용" | "미복용" | "보류";
export type MedDay = "월" | "화" | "수" | "목" | "금" | "토" | "일";

export type MedicineForm = {
  elderlyId: number;
  name: string;
  dosage: string;
  timings: MedTiming[];
  days: MedDay[];
  prescriber: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export type MedicineRow = MedicineForm & {
  id: number;
  firestoreId?: string;
};

export type MedicineLog = {
  medId: number;
  elderlyId: number;
  date: string;
  timing: MedTiming;
  status: MedStatus;
};

const MEDICINES_COLLECTION = "medicines";
const MEDICINE_LOGS_COLLECTION = "medicineLogs";

type MedicineDoc = Partial<MedicineForm> & { medicineId?: number; id?: number };
type MedicineLogDoc = Partial<MedicineLog>;

const normalizeTiming = (value: unknown): MedTiming => {
  if (value === "점심" || value === "저녁" || value === "취침전") return value;
  return "아침";
};

const normalizeStatus = (value: unknown): MedStatus => {
  if (value === "복용" || value === "보류") return value;
  return "미복용";
};

const toMedicinePayload = (medicine: MedicineRow | MedicineForm & { id?: number }) => ({
  medicineId: medicine.id ?? Date.now(),
  elderlyId: medicine.elderlyId,
  name: medicine.name,
  dosage: medicine.dosage,
  timings: medicine.timings,
  days: medicine.days,
  prescriber: medicine.prescriber,
  startDate: medicine.startDate,
  endDate: medicine.endDate,
  notes: medicine.notes,
});

const mapMedicineDoc = (firestoreId: string, index: number, data: MedicineDoc): MedicineRow => ({
  id: Number(data.medicineId ?? data.id ?? index + 1),
  firestoreId,
  elderlyId: Number(data.elderlyId ?? 0),
  name: data.name ?? "",
  dosage: data.dosage ?? "1정",
  timings: Array.isArray(data.timings) ? data.timings.map(normalizeTiming) : ["아침"],
  days: Array.isArray(data.days) ? (data.days as MedDay[]) : ["월", "화", "수", "목", "금", "토", "일"],
  prescriber: data.prescriber ?? "",
  startDate: data.startDate ?? "",
  endDate: data.endDate ?? "",
  notes: data.notes ?? "",
});

const logDocId = (log: Pick<MedicineLog, "medId" | "date" | "timing">) => `${log.date}_${log.medId}_${log.timing}`;

export const buildInitialMedicineLogs = (medicines: MedicineRow[], date: string): MedicineLog[] => {
  const logs: MedicineLog[] = [];
  medicines.forEach((medicine) => {
    medicine.timings.forEach((timing) => {
      const rand = (medicine.id * 3 + timing.charCodeAt(0)) % 5;
      logs.push({
        medId: medicine.id,
        elderlyId: medicine.elderlyId,
        date,
        timing,
        status: rand < 4 ? "복용" : "미복용",
      });
    });
  });
  return logs;
};

export const fetchMedicines = async (): Promise<MedicineRow[]> => {
  const snapshot = await getDocs(collection(db, MEDICINES_COLLECTION));

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs
    .map((document, index) => mapMedicineDoc(document.id, index, document.data() as MedicineDoc))
    .filter((medicine) => medicine.name)
    .sort((a, b) => a.id - b.id);
};

export const addMedicine = async (medicine: MedicineForm): Promise<MedicineRow> => {
  const id = Date.now();
  const ref = doc(db, MEDICINES_COLLECTION, String(id));
  const newMedicine = { id, firestoreId: ref.id, ...medicine };
  await setDoc(ref, toMedicinePayload(newMedicine), { merge: true });
  return newMedicine;
};

export const updateMedicine = async (medicine: MedicineRow) => {
  await setDoc(doc(db, MEDICINES_COLLECTION, medicine.firestoreId ?? String(medicine.id)), toMedicinePayload(medicine), { merge: true });
};

export const deleteMedicine = async (medicine: MedicineRow) => {
  await deleteDoc(doc(db, MEDICINES_COLLECTION, medicine.firestoreId ?? String(medicine.id)));
};

export const fetchMedicineLogs = async (date: string): Promise<MedicineLog[]> => {
  const snapshot = await getDocs(collection(db, MEDICINE_LOGS_COLLECTION));
  return snapshot.docs
    .map((document) => document.data() as MedicineLogDoc)
    .filter((log) => log.date === date && log.medId && log.elderlyId && log.timing && log.status)
    .map((log) => ({
      medId: Number(log.medId),
      elderlyId: Number(log.elderlyId),
      date: log.date ?? date,
      timing: normalizeTiming(log.timing),
      status: normalizeStatus(log.status),
    }));
};

export const saveMedicineLog = async (log: MedicineLog) => {
  await setDoc(doc(db, MEDICINE_LOGS_COLLECTION, logDocId(log)), log, { merge: true });
};

export const saveMedicineLogs = async (logs: MedicineLog[]) => {
  await Promise.all(logs.map((log) => saveMedicineLog(log)));
};
