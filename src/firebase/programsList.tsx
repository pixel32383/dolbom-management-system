import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type ProgramCategory = "프로그램" | "행사" | "기타";

export type ProgramForm = {
  date: string;
  time: string;
  title: string;
  category: ProgramCategory;
  staff: string;
  description: string;
};

export type ProgramRow = ProgramForm & {
  id: number;
  firestoreId?: string;
};

const PROGRAMS_COLLECTION = "programs";

type ProgramDoc = Partial<ProgramForm> & {
  programId?: number;
  id?: number;
};

const normalizeCategory = (category?: string): ProgramCategory => {
  if (category === "행사" || category === "기타" || category === "프로그램") return category;
  return "프로그램";
};

const toProgramPayload = (program: (ProgramRow | ProgramForm) & { id?: number }) => ({
  programId: program.id ?? Date.now(),
  date: program.date,
  time: program.time,
  title: program.title,
  category: program.category,
  staff: program.staff,
  description: program.description,
});

const mapProgramDoc = (firestoreId: string, index: number, data: ProgramDoc): ProgramRow => ({
  id: Number(data.programId ?? data.id ?? index + 1),
  firestoreId,
  date: data.date ?? "",
  time: data.time ?? "",
  title: data.title ?? "",
  category: normalizeCategory(data.category),
  staff: data.staff ?? "",
  description: data.description ?? "",
});

const sortPrograms = (programs: ProgramRow[]) =>
  [...programs].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id - b.id);

export const fetchPrograms = async (): Promise<ProgramRow[]> => {
  const snapshot = await getDocs(collection(db, PROGRAMS_COLLECTION));
  return sortPrograms(snapshot.docs.map((document, index) => mapProgramDoc(document.id, index, document.data() as ProgramDoc)));
};

export const savePrograms = async (programs: ProgramRow[]) => {
  await Promise.all(programs.map(program => {
    const ref = doc(db, PROGRAMS_COLLECTION, String(program.id));
    return setDoc(ref, toProgramPayload(program), { merge: true });
  }));
};

export const addProgram = async (program: ProgramForm): Promise<ProgramRow> => {
  const id = Date.now();
  const ref = doc(db, PROGRAMS_COLLECTION, String(id));
  const newProgram = { id, firestoreId: ref.id, ...program };
  await setDoc(ref, toProgramPayload(newProgram), { merge: true });
  return newProgram;
};

export const updateProgram = async (program: ProgramRow) => {
  const ref = doc(db, PROGRAMS_COLLECTION, program.firestoreId ?? String(program.id));
  await setDoc(ref, toProgramPayload(program), { merge: true });
};

export const deleteProgram = async (program: ProgramRow) => {
  await deleteDoc(doc(db, PROGRAMS_COLLECTION, program.firestoreId ?? String(program.id)));
};
