import { addDoc, collection, deleteDoc, deleteField, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export type StaffForm = {
  name: string;
  gender: string;
  birth: string;
  phone: string;
  position: string;
  department: string;
  status: string;
  hireDate: string;
  certNumber: string;
  notes: string;
};

export type StaffRow = StaffForm & {
  id: number;
  firestoreId?: string;
};

export const STAFF_EMPTY: StaffForm = {
  name: "",
  gender: "여",
  birth: "",
  phone: "",
  position: "보호사",
  department: "1팀",
  status: "재직",
  hireDate: "",
  certNumber: "",
  notes: "",
};

const STAFF_COLLECTION = "staff";

type StaffDoc = {
  staffBirth?: string;
  staffCertNumber?: string;
  staffDepartment?: string;
  staffGender?: string;
  staffHireDate?: string;
  staffName?: string;
  staffNotes?: string;
  staffPhone?: string;
  staffPosition?: string;
  staffStatus?: string;
  birth?: string;
  certNumber?: string;
  department?: string;
  gender?: string;
  hireDate?: string;
  name?: string;
  notes?: string;
  phone?: string;
  position?: string;
  status?: string;
};

const toStaffPayload = (staff: StaffForm) => ({
  staffName: staff.name,
  staffGender: staff.gender,
  staffBirth: staff.birth,
  staffPhone: staff.phone,
  staffPosition: staff.position,
  staffDepartment: staff.department,
  staffStatus: staff.status,
  staffHireDate: staff.hireDate,
  staffCertNumber: staff.certNumber,
  staffNotes: staff.notes,
});

const legacyStaffFields = {
  birth: deleteField(),
  certNumber: deleteField(),
  department: deleteField(),
  gender: deleteField(),
  hireDate: deleteField(),
  id: deleteField(),
  name: deleteField(),
  notes: deleteField(),
  phone: deleteField(),
  position: deleteField(),
  status: deleteField(),
};

const mapStaffDoc = (fallbackId: number, firestoreId: string, data: StaffDoc): StaffRow => ({
  id: fallbackId,
  firestoreId,
  name: data.staffName ?? data.name ?? "",
  gender: data.staffGender ?? data.gender ?? "여",
  birth: data.staffBirth ?? data.birth ?? "",
  phone: data.staffPhone ?? data.phone ?? "",
  position: data.staffPosition ?? data.position ?? "보호사",
  department: data.staffDepartment ?? data.department ?? "1팀",
  status: data.staffStatus ?? data.status ?? "재직",
  hireDate: data.staffHireDate ?? data.hireDate ?? "",
  certNumber: data.staffCertNumber ?? data.certNumber ?? "",
  notes: data.staffNotes ?? data.notes ?? "",
});

export const fetchStaffList = async (): Promise<StaffRow[]> => {
  const snapshot = await getDocs(collection(db, STAFF_COLLECTION));

  const staffList = snapshot.docs
    .map((document, index) => mapStaffDoc(index + 1, document.id, document.data() as StaffDoc))
    .sort((a, b) => a.id - b.id);

  Promise.all(staffList.map(staff => updateStaff(staff))).catch(error => {
    console.error("직원 legacy 필드 정리 실패:", error);
  });

  return staffList;
};

export const addStaff = async (staff: StaffForm): Promise<StaffRow> => {
  const newStaff = { id: Date.now(), ...staff };
  const ref = await addDoc(collection(db, STAFF_COLLECTION), toStaffPayload(newStaff));
  return { firestoreId: ref.id, ...newStaff };
};

export const updateStaff = async (staff: StaffRow) => {
  if (!staff.firestoreId) return;
  await updateDoc(doc(db, STAFF_COLLECTION, staff.firestoreId), {
    ...toStaffPayload(staff),
    ...legacyStaffFields,
  });
};

export const deleteStaff = async (staff: StaffRow) => {
  if (!staff.firestoreId) return;
  await deleteDoc(doc(db, STAFF_COLLECTION, staff.firestoreId));
};
