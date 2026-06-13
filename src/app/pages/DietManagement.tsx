import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, X } from "lucide-react";
import {
  ensureMealProfiles,
  fetchMealProfiles,
  fetchMealSeniors,
  saveMealProfile,
  type MealProfile,
  type MealSenior,
} from "../../firebase/mealList";

const MEAL_TYPES = ["일반식", "다진식", "연식", "저염식"];
const MEAL_AMOUNTS = ["전량", "3/4", "1/2", "1/4", "소량"];
const ALLERGY_OPTIONS = ["계란", "우유", "밀", "땅콩", "견과류", "새우", "게", "조개", "복숭아", "생선"];
const DISEASE_OPTIONS = ["당뇨", "고혈압", "신장질환", "통풍", "고지혈증", "위장질환", "치매", "골다공증"];
const MEAL_TYPE_STYLE: Record<string, string> = {
  일반식: "bg-emerald-50 text-emerald-700",
  다진식: "bg-blue-50 text-blue-700",
  연식: "bg-amber-50 text-amber-700",
  저염식: "bg-violet-50 text-violet-700",
};
const ROOM_FILTERS = ["전체", "미소방", "희망방", "사랑방"];
const MEAL_TYPE_FILTERS = ["전체", ...MEAL_TYPES];

type SortKey = "name" | "room" | "mealType" | "mealAmount";
type SortDirection = "asc" | "desc";

const emptyProfile = (elderlyId: number): MealProfile => ({
  elderlyId,
  mealType: "일반식",
  mealAmount: "전량",
  allergies: [],
  diseases: [],
  guardianRequest: "",
  staffMemo: "",
});

export default function DietManagement() {
  const [profiles, setProfiles] = useState<Record<number, MealProfile>>({});
  const [elderlyList, setElderlyList] = useState<MealSenior[]>([]);
  const [search, setSearch] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState("전체");
  const [roomFilter, setRoomFilter] = useState("전체");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MealProfile | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [elderlySearch, setElderlySearch] = useState("");
  const [selectedElderlyId, setSelectedElderlyId] = useState<number | null>(null);

  useEffect(() => {
    const loadMealData = async () => {
      try {
        setLoadError("");
        const [mealProfiles, seniors] = await Promise.all([
          fetchMealProfiles(),
          fetchMealSeniors(),
        ]);
        const completedProfiles = await ensureMealProfiles(mealProfiles, seniors);
        setProfiles(completedProfiles);
        setElderlyList(seniors);
      } catch (error) {
        console.error("식단 데이터 불러오기 실패:", error);
        setLoadError("Firebase 식단 데이터를 불러오지 못했습니다.");
      }
    };

    loadMealData();
  }, []);

  const filteredElderly = useMemo(() => {
    return elderlyList
      .filter(elderly => {
        const profile = profiles[elderly.id];
        const keyword = search.trim();
        const matchSearch = !keyword || elderly.name.includes(keyword) || elderly.room.includes(keyword);
        const matchType = mealTypeFilter === "전체" || profile?.mealType === mealTypeFilter;
        const matchRoom = roomFilter === "전체" || elderly.room === roomFilter;
        return matchSearch && matchType && matchRoom;
      })
      .sort((a, b) => {
        const aProfile = profiles[a.id];
        const bProfile = profiles[b.id];
        const aValue = sortKey === "name" ? a.name : sortKey === "room" ? a.room : aProfile?.[sortKey] ?? "";
        const bValue = sortKey === "name" ? b.name : sortKey === "room" ? b.room : bProfile?.[sortKey] ?? "";
        const result = String(aValue).localeCompare(String(bValue), "ko", { numeric: true });
        return sortDirection === "asc" ? result : -result;
      });
  }, [elderlyList, mealTypeFilter, profiles, roomFilter, search, sortDirection, sortKey]);

  const filteredRegisterSeniors = useMemo(() => {
    const keyword = elderlySearch.trim();
    if (!keyword) return elderlyList;
    return elderlyList.filter(senior => senior.name.includes(keyword) || senior.room.includes(keyword));
  }, [elderlyList, elderlySearch]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(direction => direction === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3" />;
    return sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const openNew = () => {
    setSelectedElderlyId(null);
    setElderlySearch("");
    setEditForm(emptyProfile(0));
    setEditId(null);
  };

  const closeEditor = () => {
    setEditId(null);
    setEditForm(null);
    setSelectedElderlyId(null);
    setElderlySearch("");
  };

  const openEdit = (elderlyId: number) => {
    const profile = profiles[elderlyId] ?? emptyProfile(elderlyId);
    const senior = elderlyList.find(item => item.id === elderlyId);
    setSelectedElderlyId(elderlyId);
    setElderlySearch(senior?.name ?? "");
    setEditForm({
      ...profile,
      allergies: [...profile.allergies],
      diseases: [...profile.diseases],
    });
    setEditId(elderlyId);
  };

  const saveEdit = async () => {
    if (!editForm) return;
    const targetId = selectedElderlyId ?? editForm.elderlyId;
    if (!targetId) {
      setLoadError("식단을 등록할 어르신을 선택하세요.");
      return;
    }

    const profile = { ...editForm, elderlyId: targetId };
    setProfiles(current => ({ ...current, [targetId]: profile }));
    try {
      await saveMealProfile(profile);
    } catch (error) {
      console.error("식단 데이터 저장 실패:", error);
      setLoadError("화면에는 반영됐지만 Firebase 저장에 실패했습니다.");
    }
    closeEditor();
  };

  const toggleArrayValue = (field: "allergies" | "diseases", value: string) => {
    setEditForm(current => {
      if (!current) return current;
      const exists = current[field].includes(value);
      return {
        ...current,
        [field]: exists ? current[field].filter(item => item !== value) : [...current[field], value],
      };
    });
  };

  const selectSeniorForForm = (elderlyId: number) => {
    const senior = elderlyList.find(item => item.id === elderlyId);
    const profile = profiles[elderlyId] ?? emptyProfile(elderlyId);
    setSelectedElderlyId(elderlyId);
    setElderlySearch(senior?.name ?? "");
    setEditForm(current => ({
      ...profile,
      ...current,
      elderlyId,
      allergies: current?.allergies ?? [...profile.allergies],
      diseases: current?.diseases ?? [...profile.diseases],
    }));
  };

  const renderSortButton = (label: string, key: SortKey) => (
    <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <SortIcon column={key} />
    </button>
  );

  return (
    <div className="p-5 max-w-[1200px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">식단 관리</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">어르신별 식사 유형과 주의사항을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              className="w-56 pl-9 pr-3 py-1.5 bg-white border border-border rounded-lg text-[13px] focus:outline-none focus:border-primary transition-colors"
              placeholder="이름 · 호실 검색"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <button onClick={openNew} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            식단 등록
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-700">
          {loadError}
        </div>
      )}

      <div className="mb-3 flex flex-col gap-2">
        <div className="flex gap-1.5">
          {MEAL_TYPE_FILTERS.map(type => (
            <button
              key={type}
              onClick={() => setMealTypeFilter(type)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${mealTypeFilter === type ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {ROOM_FILTERS.map(room => (
            <button
              key={room}
              onClick={() => setRoomFilter(room)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${roomFilter === room ? "bg-slate-900 text-white border-slate-900" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}
            >
              {room}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[13px] font-semibold text-foreground">식단 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-muted/60">
                <th className="px-5 py-2.5 text-left font-semibold text-muted-foreground">{renderSortButton("이름", "name")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{renderSortButton("호실", "room")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{renderSortButton("식사유형", "mealType")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{renderSortButton("식사량", "mealAmount")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">알레르기</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">질환</th>
                <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground w-20">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredElderly.map(elderly => {
                const profile = profiles[elderly.id] ?? emptyProfile(elderly.id);
                const isOpen = detailId === elderly.id;
                return (
                  <tr key={elderly.firestoreId ?? elderly.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-foreground">
                      <button className="text-left hover:text-primary" onClick={() => setDetailId(isOpen ? null : elderly.id)}>
                        {elderly.name}
                      </button>
                      {isOpen && (
                        <div className="mt-2 text-[11.5px] text-muted-foreground leading-relaxed">
                          <p>보호자 요청: {profile.guardianRequest || "-"}</p>
                          <p>직원 메모: {profile.staffMemo || "-"}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">{elderly.room}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${MEAL_TYPE_STYLE[profile.mealType] ?? "bg-slate-100 text-slate-600"}`}>
                        {profile.mealType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">{profile.mealAmount}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{profile.allergies.length ? profile.allergies.join(", ") : "-"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{profile.diseases.length ? profile.diseases.join(", ") : "-"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => openEdit(elderly.id)} className="px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted hover:bg-slate-200 rounded transition-colors">
                        수정
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredElderly.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[13px] text-muted-foreground">검색 결과가 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeEditor} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[580px]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-foreground">{editId === null ? "식단 등록" : "식단 수정"}</h2>
              <button onClick={closeEditor} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">어르신</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    className="w-full pl-9 pr-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                    placeholder="어르신 이름 또는 호실 검색"
                    value={elderlySearch}
                    onChange={event => setElderlySearch(event.target.value)}
                  />
                </div>
                <select
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary"
                  value={selectedElderlyId ?? ""}
                  onChange={event => selectSeniorForForm(Number(event.target.value))}
                  disabled={editId !== null}
                >
                  <option value="">어르신 선택</option>
                  {selectedElderlyId && !filteredRegisterSeniors.some(senior => senior.id === selectedElderlyId) && (
                    <option value={selectedElderlyId}>
                      {elderlyList.find(senior => senior.id === selectedElderlyId)?.name ?? "선택된 어르신"}
                    </option>
                  )}
                  {filteredRegisterSeniors.map(senior => (
                    <option key={senior.id} value={senior.id}>
                      {senior.name} · {senior.room}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">식사유형</label>
                  <select className="w-full px-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary" value={editForm.mealType} onChange={event => setEditForm(current => current ? { ...current, mealType: event.target.value } : current)}>
                    {MEAL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">식사량</label>
                  <select className="w-full px-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary" value={editForm.mealAmount} onChange={event => setEditForm(current => current ? { ...current, mealAmount: event.target.value } : current)}>
                    {MEAL_AMOUNTS.map(amount => <option key={amount} value={amount}>{amount}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-2">알레르기</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALLERGY_OPTIONS.map(option => (
                    <button key={option} type="button" onClick={() => toggleArrayValue("allergies", option)} className={`px-2.5 py-1 text-[11.5px] rounded-lg border transition-colors ${editForm.allergies.includes(option) ? "border-red-300 bg-red-50 text-red-600" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-2">질환</label>
                <div className="flex flex-wrap gap-1.5">
                  {DISEASE_OPTIONS.map(option => (
                    <button key={option} type="button" onClick={() => toggleArrayValue("diseases", option)} className={`px-2.5 py-1 text-[11.5px] rounded-lg border transition-colors ${editForm.diseases.includes(option) ? "border-blue-300 bg-blue-50 text-blue-600" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">보호자 요청</label>
                <input className="w-full px-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary" value={editForm.guardianRequest} onChange={event => setEditForm(current => current ? { ...current, guardianRequest: event.target.value } : current)} />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">직원 메모</label>
                <textarea className="w-full px-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary resize-none" rows={3} value={editForm.staffMemo} onChange={event => setEditForm(current => current ? { ...current, staffMemo: event.target.value } : current)} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={closeEditor} className="px-4 py-2 text-[13px] font-medium text-foreground bg-white border border-border rounded-lg hover:bg-muted transition-colors">
                취소
              </button>
              <button onClick={saveEdit} className="px-4 py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
