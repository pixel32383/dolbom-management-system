import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export type TransportStatus = "대기" | "운행중" | "완료" | "취소";
export type TransportDirection = "등원" | "하원";

export type TransportRunForm = {
  vehicleId: string;
  driver: string;
  direction: TransportDirection;
  route: string;
  scheduledTime: string;
  actualTime: string;
  status: TransportStatus;
  passengers: string[];
  notes: string;
};

export type TransportRun = TransportRunForm & {
  id: number;
  order: number;
  firestoreId?: string;
};

export const RUN_EMPTY: TransportRunForm = {
  vehicleId: "1호차",
  driver: "",
  direction: "등원",
  route: "동춘동",
  scheduledTime: "",
  actualTime: "",
  status: "대기",
  passengers: [],
  notes: "",
};

const TRANSPORTS_COLLECTION = "transports";

type TransportDoc = Partial<TransportRunForm>;
type TransportPayload = TransportRunForm & { order?: number };

const normalizeStatus = (status?: string): TransportStatus => {
  if (status === "운행중" || status === "완료" || status === "취소" || status === "대기") return status;
  if (status?.includes("중")) return "운행중";
  if (status?.includes("완")) return "완료";
  if (status?.includes("취")) return "취소";
  return "대기";
};

const normalizeDirection = (direction?: string): TransportDirection =>
  direction === "하원" ? "하원" : "등원";

const toTransportPayload = (run: TransportPayload) => ({
  vehicleId: run.vehicleId,
  driver: run.driver,
  direction: run.direction,
  route: run.route,
  scheduledTime: run.scheduledTime,
  actualTime: run.actualTime,
  status: run.status,
  passengers: run.passengers,
  notes: run.notes,
  order: run.order ?? 0,
});

const mapTransportDoc = (id: number, firestoreId: string, data: TransportDoc & { order?: number }): TransportRun => ({
  id,
  order: typeof data.order === "number" ? data.order : id,
  firestoreId,
  vehicleId: data.vehicleId ?? "1호차",
  driver: data.driver ?? "",
  direction: normalizeDirection(data.direction),
  route: data.route ?? "동춘동",
  scheduledTime: data.scheduledTime ?? "",
  actualTime: data.actualTime ?? "",
  status: normalizeStatus(data.status),
  passengers: Array.isArray(data.passengers) ? data.passengers : [],
  notes: data.notes ?? "",
});

export const fetchTransports = async (): Promise<TransportRun[]> => {
  const snapshot = await getDocs(collection(db, TRANSPORTS_COLLECTION));

  return snapshot.docs
    .map((document, index) => mapTransportDoc(index + 1, document.id, document.data() as TransportDoc & { order?: number }))
    .sort((a, b) => a.order - b.order || a.id - b.id);
};

export const addTransport = async (run: TransportPayload): Promise<TransportRun> => {
  const ref = await addDoc(collection(db, TRANSPORTS_COLLECTION), toTransportPayload(run));
  return { id: Date.now(), order: run.order ?? Date.now(), firestoreId: ref.id, ...run };
};

export const updateTransport = async (run: TransportRun) => {
  if (!run.firestoreId) return;
  await updateDoc(doc(db, TRANSPORTS_COLLECTION, run.firestoreId), toTransportPayload(run));
};

export const deleteTransport = async (run: TransportRun) => {
  if (!run.firestoreId) return;
  await deleteDoc(doc(db, TRANSPORTS_COLLECTION, run.firestoreId));
};
