import { deleteField, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface SettingRow {
  facilityName: string;
  operatingHours: string;
  capacity: string;
  adminName: string;
  adminPhone: string;
  adminEmail: string;
  notifUrgent: boolean;
  notifSchedule: boolean;
}

export const DEFAULT_SETTING: SettingRow = {
  facilityName: "돌봄 요양원",
  operatingHours: "09:00 - 18:00",
  capacity: "50명",
  adminName: "김관리자",
  adminPhone: "010-9999-0000",
  adminEmail: "admin@dolbom.kr",
  notifUrgent: true,
  notifSchedule: false,
};

const SETTING_DOC_ID = "default";

export async function fetchSetting(): Promise<SettingRow> {
  const snapshot = await getDoc(doc(db, "setting", SETTING_DOC_ID));
  if (!snapshot.exists()) return DEFAULT_SETTING;

  return {
    ...DEFAULT_SETTING,
    ...(snapshot.data() as Partial<SettingRow>),
  };
}

export async function saveSetting(setting: SettingRow) {
  await setDoc(
    doc(db, "setting", SETTING_DOC_ID),
    {
      ...setting,
      notifSound: deleteField(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
