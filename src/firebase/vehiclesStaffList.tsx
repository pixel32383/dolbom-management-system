import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export type VehicleCaregiverForm = {
  name: string;
  gender: string;
  birth: string;
  phone: string;
  vehicleNumber: string;
  vehicleName: string;
  assignedVehicle: string;
  status: string;
  hireDate: string;
  route: string;
  notes: string;
};

export type VehicleCaregiverRow = VehicleCaregiverForm & {
  id: number;
  firestoreId?: string;
};

export const VEHICLE_OPTIONS = ["1호차", "2호차", "3호차", "미배정"];
export const ROUTE_OPTIONS = ["동춘동", "송도동", "청학동", "미배정"];

export const TC_EMPTY: VehicleCaregiverForm = {
  name: "",
  gender: "남",
  birth: "",
  phone: "",
  vehicleNumber: "",
  vehicleName: "",
  assignedVehicle: "1호차",
  status: "재직",
  hireDate: "",
  route: "동춘동",
  notes: "",
};

const VEHICLES_COLLECTION = "vehiclesStaff";

type VehicleCaregiverDoc = {
  transportCaregiverName?: string;
  transportCaregiverGender?: string;
  transportCaregiverBirth?: string;
  transportCaregiverPhone?: string;
  vehicleNumber?: string;
  vehicleName?: string;
  assignedVehicle?: string;
  transportCaregiverStatus?: string;
  transportCaregiverHireDate?: string;
  route?: string;
  transportCaregiverNotes?: string;
  name?: string;
  gender?: string;
  birth?: string;
  phone?: string;
  status?: string;
  hireDate?: string;
  notes?: string;
};

const toVehicleCaregiverPayload = (caregiver: VehicleCaregiverForm) => ({
  transportCaregiverName: caregiver.name,
  transportCaregiverGender: caregiver.gender,
  transportCaregiverBirth: caregiver.birth,
  transportCaregiverPhone: caregiver.phone,
  vehicleNumber: caregiver.vehicleNumber,
  vehicleName: caregiver.vehicleName,
  assignedVehicle: caregiver.assignedVehicle,
  transportCaregiverStatus: caregiver.status,
  transportCaregiverHireDate: caregiver.hireDate,
  route: caregiver.route,
  transportCaregiverNotes: caregiver.notes,
});

const mapVehicleCaregiverDoc = (id: number, firestoreId: string, data: VehicleCaregiverDoc): VehicleCaregiverRow => ({
  id,
  firestoreId,
  name: data.transportCaregiverName ?? data.name ?? "",
  gender: data.transportCaregiverGender ?? data.gender ?? "남",
  birth: data.transportCaregiverBirth ?? data.birth ?? "",
  phone: data.transportCaregiverPhone ?? data.phone ?? "",
  vehicleNumber: data.vehicleNumber ?? "",
  vehicleName: data.vehicleName ?? "",
  assignedVehicle: data.assignedVehicle ?? "1호차",
  status: data.transportCaregiverStatus ?? data.status ?? "재직",
  hireDate: data.transportCaregiverHireDate ?? data.hireDate ?? "",
  route: data.route ?? "동춘동",
  notes: data.transportCaregiverNotes ?? data.notes ?? "",
});

export const fetchVehicleCaregivers = async (): Promise<VehicleCaregiverRow[]> => {
  const snapshot = await getDocs(collection(db, VEHICLES_COLLECTION));

  return snapshot.docs
    .map((document, index) => mapVehicleCaregiverDoc(index + 1, document.id, document.data() as VehicleCaregiverDoc))
    .sort((a, b) => a.id - b.id);
};

export const addVehicleCaregiver = async (caregiver: VehicleCaregiverForm): Promise<VehicleCaregiverRow> => {
  const ref = await addDoc(collection(db, VEHICLES_COLLECTION), toVehicleCaregiverPayload(caregiver));
  return { id: Date.now(), firestoreId: ref.id, ...caregiver };
};

export const updateVehicleCaregiver = async (caregiver: VehicleCaregiverRow) => {
  if (!caregiver.firestoreId) return;
  await updateDoc(doc(db, VEHICLES_COLLECTION, caregiver.firestoreId), toVehicleCaregiverPayload(caregiver));
};

export const deleteVehicleCaregiver = async (caregiver: VehicleCaregiverRow) => {
  if (!caregiver.firestoreId) return;
  await deleteDoc(doc(db, VEHICLES_COLLECTION, caregiver.firestoreId));
};
