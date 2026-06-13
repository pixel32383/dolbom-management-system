import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export type VehicleForm = {
  vehicleId: string;
  name: string;
  plateNumber: string;
  capacity: string;
  status: string;
  year: string;
  fuelType: string;
  mileage: string;
  lastInspection: string;
  nextInspection: string;
  insExpiry: string;
  assignedDriver: string;
  notes: string;
};

export type VehicleRow = Omit<VehicleForm, "capacity"> & {
  id: number;
  capacity: number;
  firestoreId?: string;
};

export const VEHICLE_EMPTY: VehicleForm = {
  vehicleId: "",
  name: "",
  plateNumber: "",
  capacity: "",
  status: "운행가능",
  year: "",
  fuelType: "디젤",
  mileage: "",
  lastInspection: "",
  nextInspection: "",
  insExpiry: "",
  assignedDriver: "",
  notes: "",
};

const VEHICLES_COLLECTION = "vehicles";

type VehicleDoc = {
  vehicleId?: string;
  vehicleName?: string;
  name?: string;
  plateNumber?: string;
  capacity?: number | string;
  status?: string;
  year?: string;
  fuelType?: string;
  mileage?: string;
  lastInspection?: string;
  nextInspection?: string;
  insExpiry?: string;
  assignedDriver?: string;
  notes?: string;
};

const toVehiclePayload = (vehicle: VehicleForm | VehicleRow) => ({
  vehicleId: vehicle.vehicleId,
  vehicleName: vehicle.name,
  plateNumber: vehicle.plateNumber,
  capacity: Number(vehicle.capacity) || 0,
  status: vehicle.status,
  year: vehicle.year,
  fuelType: vehicle.fuelType,
  mileage: vehicle.mileage,
  lastInspection: vehicle.lastInspection,
  nextInspection: vehicle.nextInspection,
  insExpiry: vehicle.insExpiry,
  assignedDriver: vehicle.assignedDriver,
  notes: vehicle.notes,
});

const mapVehicleDoc = (id: number, firestoreId: string, data: VehicleDoc): VehicleRow => ({
  id,
  firestoreId,
  vehicleId: data.vehicleId ?? "",
  name: data.vehicleName ?? data.name ?? "",
  plateNumber: data.plateNumber ?? "",
  capacity: Number(data.capacity) || 0,
  status: data.status ?? "운행가능",
  year: data.year ?? "",
  fuelType: data.fuelType ?? "디젤",
  mileage: data.mileage ?? "",
  lastInspection: data.lastInspection ?? "",
  nextInspection: data.nextInspection ?? "",
  insExpiry: data.insExpiry ?? "",
  assignedDriver: data.assignedDriver ?? "",
  notes: data.notes ?? "",
});

export const fetchVehicles = async (): Promise<VehicleRow[]> => {
  const snapshot = await getDocs(collection(db, VEHICLES_COLLECTION));
  const vehicleDocuments = snapshot.docs.filter(document => {
    const data = document.data() as VehicleDoc;
    return Boolean(data.vehicleId);
  });

  return vehicleDocuments
    .map((document, index) => mapVehicleDoc(index + 1, document.id, document.data() as VehicleDoc))
    .sort((a, b) => a.id - b.id);
};

export const addVehicle = async (vehicle: VehicleForm): Promise<VehicleRow> => {
  const ref = await addDoc(collection(db, VEHICLES_COLLECTION), toVehiclePayload(vehicle));
  return { id: Date.now(), firestoreId: ref.id, ...vehicle, capacity: Number(vehicle.capacity) || 0 };
};

export const updateVehicle = async (vehicle: VehicleRow) => {
  if (!vehicle.firestoreId) return;
  await updateDoc(doc(db, VEHICLES_COLLECTION, vehicle.firestoreId), toVehiclePayload(vehicle));
};

export const deleteVehicle = async (vehicle: VehicleRow) => {
  if (!vehicle.firestoreId) return;
  await deleteDoc(doc(db, VEHICLES_COLLECTION, vehicle.firestoreId));
};
