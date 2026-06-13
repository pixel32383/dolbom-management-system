import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type MealProfile = {
  elderlyId: number;
  mealType: string;
  mealAmount: string;
  allergies: string[];
  diseases: string[];
  guardianRequest: string;
  staffMemo: string;
};

export type MealSenior = {
  id: number;
  firestoreId?: string;
  name: string;
  age: number;
  gender: string;
  room: string;
};

const MEAL_COLLECTION = "meal";
const MEAL_TYPES = ["일반식", "다진식", "연식", "저염식"];
const MEAL_AMOUNTS = ["전량", "3/4", "1/2", "1/4", "소량"];
const ALLERGIES = ["계란", "우유", "밀", "땅콩", "견과류", "새우", "게", "복숭아", "생선"];
const DISEASES = ["당뇨", "고혈압", "신장질환", "고지혈증", "위장질환", "치매"];
const REQUESTS = [
  "",
  "짜지 않게 부탁드립니다",
  "천천히 식사 도움 필요",
  "소화 잘 되는 음식으로",
  "단 음식 제한 부탁드립니다",
  "해산물 주의",
];
const MEMOS = [
  "",
  "식사량 관찰 필요",
  "복약 후 식사",
  "식사 보조 필요",
  "저염식 위주",
  "씹기 불편하여 다진식 제공",
];

type MealDoc = Partial<MealProfile>;

const toMealPayload = (profile: MealProfile) => ({
  elderlyId: profile.elderlyId,
  mealType: profile.mealType,
  mealAmount: profile.mealAmount,
  allergies: profile.allergies,
  diseases: profile.diseases,
  guardianRequest: profile.guardianRequest,
  staffMemo: profile.staffMemo,
});

const mapMealDoc = (data: MealDoc): MealProfile | null => {
  const elderlyId = Number(data.elderlyId);
  if (!elderlyId) return null;

  return {
    elderlyId,
    mealType: data.mealType ?? "일반식",
    mealAmount: data.mealAmount ?? "전량",
    allergies: Array.isArray(data.allergies) ? data.allergies : [],
    diseases: Array.isArray(data.diseases) ? data.diseases : [],
    guardianRequest: data.guardianRequest ?? "",
    staffMemo: data.staffMemo ?? "",
  };
};

const pickSome = (items: string[], seed: number) =>
  items.filter((_, index) => (seed + index * 3) % 7 === 0).slice(0, 2);

export const createMealProfile = (elderlyId: number, seed = elderlyId): MealProfile => ({
  elderlyId,
  mealType: MEAL_TYPES[seed % MEAL_TYPES.length],
  mealAmount: MEAL_AMOUNTS[(seed * 2) % MEAL_AMOUNTS.length],
  allergies: pickSome(ALLERGIES, seed),
  diseases: pickSome(DISEASES, seed + 2),
  guardianRequest: REQUESTS[seed % REQUESTS.length],
  staffMemo: MEMOS[(seed * 3) % MEMOS.length],
});

export const fetchMealProfiles = async (): Promise<Record<number, MealProfile>> => {
  const snapshot = await getDocs(collection(db, MEAL_COLLECTION));

  const profiles: Record<number, MealProfile> = {};
  snapshot.docs.forEach(document => {
    const profile = mapMealDoc(document.data() as MealDoc);
    if (profile) profiles[profile.elderlyId] = profile;
  });

  return profiles;
};

export const saveMealProfile = async (profile: MealProfile) => {
  await setDoc(doc(db, MEAL_COLLECTION, String(profile.elderlyId)), toMealPayload(profile), { merge: true });
};

export const ensureMealProfiles = async (
  profiles: Record<number, MealProfile>,
  seniors: MealSenior[],
): Promise<Record<number, MealProfile>> => {
  const nextProfiles = { ...profiles };
  const missingProfiles = seniors
    .filter(senior => !nextProfiles[senior.id])
    .map((senior, index) => createMealProfile(senior.id, senior.id + index));

  missingProfiles.forEach(profile => {
    nextProfiles[profile.elderlyId] = profile;
  });

  await Promise.all(missingProfiles.map(profile => saveMealProfile(profile)));
  return nextProfiles;
};

export const fetchMealSeniors = async (): Promise<MealSenior[]> => {
  const snapshot = await getDocs(collection(db, "seniors"));

  if (snapshot.empty) return [];

  return snapshot.docs
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((document, index) => {
      const data = document.data() as {
        name?: string;
        age?: number | string;
        gender?: string;
        room?: string;
      };
      return {
        id: index + 1,
        firestoreId: document.id,
        name: data.name?.trim() ?? "",
        age: Number(data.age ?? 0),
        gender: data.gender ?? "",
        room: data.room ?? "",
      };
    })
    .filter(senior => senior.name)
    .sort((a, b) => a.id - b.id);
};
