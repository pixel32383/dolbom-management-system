import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Plus, Search } from "lucide-react";
import { fetchMealSeniors, type MealSenior } from "../../firebase/mealList";
import {
  addMedicine,
  buildInitialMedicineLogs,
  deleteMedicine,
  fetchMedicineLogs,
  fetchMedicines,
  saveMedicineLog,
  saveMedicineLogs,
  updateMedicine,
  type MedDay,
  type MedicineLog,
  type MedicineRow,
  type MedStatus,
  type MedTiming,
} from "../../firebase/medicinesList";

type MedicineFormState = Omit<MedicineRow, "id" | "firestoreId">;

const TODAY_STR = "2026-06-09";
const TIMINGS: MedTiming[] = ["아침", "점심", "저녁", "취침전"];
const DAYS: MedDay[] = ["월", "화", "수", "목", "금", "토", "일"];
const ROOM_FILTERS = ["전체", "미소방", "희망방", "사랑방"];

const EMPTY_FORM: MedicineFormState = {
  elderlyId: 0,
  name: "",
  dosage: "1정",
  timings: ["아침"],
  days: DAYS,
  prescriber: "",
  startDate: "",
  endDate: "",
  notes: "",
};

const timingColor: Record<MedTiming, string> = {
  아침: "bg-amber-100 text-amber-700",
  점심: "bg-emerald-100 text-emerald-700",
  저녁: "bg-blue-100 text-blue-700",
  취침전: "bg-violet-100 text-violet-700",
};

const toMedicineForm = (medicine: MedicineRow): MedicineFormState => ({
  elderlyId: medicine.elderlyId,
  name: medicine.name,
  dosage: medicine.dosage,
  timings: [...medicine.timings],
  days: [...medicine.days],
  prescriber: medicine.prescriber,
  startDate: medicine.startDate,
  endDate: medicine.endDate,
  notes: medicine.notes,
});

const getNextStatus = (status: MedStatus): MedStatus =>
  status === "복용" ? "미복용" : status === "미복용" ? "보류" : "복용";

const medicineMatchesKeyword = (medicine: MedicineRow, keyword: string) =>
  [medicine.name, medicine.dosage, medicine.prescriber, medicine.notes]
    .some((value) => value.toLowerCase().includes(keyword));

const elderlyMatchesKeyword = (elderly: MealSenior, keyword: string) =>
  elderly.name.toLowerCase().includes(keyword);

export default function MedicationManagement({
  onPendingPeopleChange,
}: {
  onPendingPeopleChange?: (count: number) => void;
}) {
  const [meds, setMeds] = useState<MedicineRow[]>([]);
  const [logs, setLogs] = useState<MedicineLog[]>([]);
  const [selectedElderlyId, setSelectedElderlyId] = useState<number | "전체">("전체");
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("전체");
  const [formRoomFilter, setFormRoomFilter] = useState("전체");
  const [activeTab, setActiveTab] = useState<"오늘복약" | "목록">("오늘복약");
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<MedicineFormState>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Partial<Record<keyof MedicineFormState, string>>>({});
  const [loadError, setLoadError] = useState("");
  const [elderlyList, setElderlyList] = useState<MealSenior[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadError("");
        const [medicineList, savedLogs, seniorList] = await Promise.all([
          fetchMedicines(),
          fetchMedicineLogs(TODAY_STR),
          fetchMealSeniors(),
        ]);
        const fallbackLogs = buildInitialMedicineLogs(medicineList, TODAY_STR);
        const mergedLogs = fallbackLogs.map((log) => {
          const saved = savedLogs.find((item) => item.medId === log.medId && item.timing === log.timing);
          return saved ?? log;
        });

        setMeds(medicineList);
        setLogs(mergedLogs);
        setElderlyList(seniorList);
        if (savedLogs.length === 0) await saveMedicineLogs(mergedLogs);
      } catch (error) {
        console.error("복약 데이터 불러오기 실패:", error);
        setLoadError("Firebase 복약 데이터를 불러오지 못했습니다.");
      }
    };
    load();
  }, []);

  useEffect(() => {
    const pendingPeople = new Set(
      logs.filter((log) => log.date === TODAY_STR && log.status === "미복용").map((log) => log.elderlyId)
    ).size;
    onPendingPeopleChange?.(pendingPeople);
  }, [logs, onPendingPeopleChange]);

  const elderlyWithMeds = elderlyList.filter((elderly) => meds.some((medicine) => medicine.elderlyId === elderly.id));
  const searchTerm = search.trim().toLowerCase();
  const medicineMatches = (medicine: MedicineRow) => medicineMatchesKeyword(medicine, searchTerm);
  const elderlyMatches = (elderly: MealSenior) => elderlyMatchesKeyword(elderly, searchTerm);

  const filteredElderly = elderlyWithMeds.filter((elderly) =>
    (roomFilter === "전체" || elderly.room === roomFilter) &&
    (!searchTerm || elderlyMatches(elderly) || meds.some((medicine) => medicine.elderlyId === elderly.id && medicineMatches(medicine)))
  );

  const displayElderly = selectedElderlyId === "전체"
    ? filteredElderly
    : filteredElderly.filter((elderly) => elderly.id === selectedElderlyId);

  const getVisibleMeds = (elderly: MealSenior) => {
    const elderlyMeds = meds.filter((medicine) => medicine.elderlyId === elderly.id);
    if (!searchTerm || elderlyMatches(elderly)) return elderlyMeds;
    return elderlyMeds.filter(medicineMatches);
  };

  const visibleListMeds = meds.filter((medicine) => {
    const elderly = elderlyList.find((item) => item.id === medicine.elderlyId);
    return (
      (selectedElderlyId === "전체" || medicine.elderlyId === selectedElderlyId) &&
      (!elderly || roomFilter === "전체" || elderly.room === roomFilter) &&
      (!searchTerm || medicineMatches(medicine) || (elderly ? elderlyMatches(elderly) : false))
    );
  });

  const totals = useMemo(() => ({
    meds: meds.length,
    taken: logs.filter((log) => log.date === TODAY_STR && log.status === "복용").length,
    pending: logs.filter((log) => log.date === TODAY_STR && log.status === "미복용").length,
    hold: logs.filter((log) => log.date === TODAY_STR && log.status === "보류").length,
  }), [logs, meds.length]);

  const pendingNames = useMemo(() => {
    const ids = new Set(logs.filter((log) => log.date === TODAY_STR && log.status === "미복용").map((log) => log.elderlyId));
    return elderlyList.filter((elderly) => ids.has(elderly.id)).map((elderly) => elderly.name);
  }, [elderlyList, logs]);

  const summaryCards = useMemo(() => [
    { label: "전체 처방약", value: `${totals.meds}종`, sub: "등록 약품", Icon: Plus, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "오늘 복용 완료", value: `${totals.taken}건`, sub: "복용 확인", Icon: CheckCircle2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "미복용", value: `${totals.pending}건`, sub: pendingNames.length > 0 ? pendingNames.join(", ") : "없음", Icon: AlertTriangle, iconBg: "bg-red-50", iconColor: "text-red-500" },
    { label: "보류", value: `${totals.hold}건`, sub: "확인 필요", Icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ], [pendingNames, totals]);

  const formElderlyOptions = useMemo(() => {
    return elderlyList
      .filter((elderly) => formRoomFilter === "전체" || elderly.room === formRoomFilter)
      .sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
  }, [elderlyList, formRoomFilter]);

  const openNew = (elderlyId?: number) => {
    setForm({ ...EMPTY_FORM, elderlyId: elderlyId ?? 0 });
    setEditId(null);
    setErrors({});
    setFormRoomFilter("전체");
    setShowForm(true);
  };

  const openEdit = (medicine: MedicineRow) => {
    setForm(toMedicineForm(medicine));
    setEditId(medicine.id);
    setErrors({});
    setFormRoomFilter(elderlyList.find((elderly) => elderly.id === medicine.elderlyId)?.room ?? "전체");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setErrors({});
  };

  const updateForm = <K extends keyof MedicineFormState>(key: K, value: MedicineFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => prev[key] ? { ...prev, [key]: "" } : prev);
  };

  const removeMedicine = async (medicine: MedicineRow) => {
    setMeds((prev) => prev.filter((item) => item.id !== medicine.id));
    setLogs((prev) => prev.filter((log) => log.medId !== medicine.id));
    try {
      await deleteMedicine(medicine);
    } catch (error) {
      console.error("복약 정보 삭제 실패:", error);
      setLoadError("Firebase에서 복약 정보를 삭제하지 못했습니다.");
      setMeds((prev) => [...prev, medicine].sort((a, b) => a.id - b.id));
    }
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof MedicineFormState, string>> = {};
    if (!form.elderlyId) nextErrors.elderlyId = "어르신을 선택하세요";
    if (!form.name.trim()) nextErrors.name = "약품명을 입력하세요";
    if (form.timings.length === 0) nextErrors.timings = "복약 시간을 선택하세요";
    return nextErrors;
  };

  const submitForm = async () => {
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (editId !== null) {
      const target = meds.find((medicine) => medicine.id === editId);
      if (!target) return;
      const updated = { ...target, ...form };
      setMeds((prev) => prev.map((medicine) => medicine.id === editId ? updated : medicine));
      await updateMedicine(updated);
    } else {
      const created = await addMedicine(form);
      setMeds((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      const newLogs: MedicineLog[] = created.timings.map((timing) => ({
        medId: created.id,
        elderlyId: created.elderlyId,
        date: TODAY_STR,
        timing,
        status: "미복용",
      }));
      setLogs((prev) => [...prev, ...newLogs]);
      await saveMedicineLogs(newLogs);
    }

    closeForm();
  };

  const toggleLog = (medId: number, elderlyId: number, timing: MedTiming) => {
    setLogs((prev) => {
      const exists = prev.find((log) => log.medId === medId && log.date === TODAY_STR && log.timing === timing);
      const updated = exists
        ? { ...exists, status: getNextStatus(exists.status) }
        : { medId, elderlyId, date: TODAY_STR, timing, status: "복용" as MedStatus };

      saveMedicineLog(updated).catch((error) => {
        console.error("복약 로그 저장 실패:", error);
        setLoadError("복약 상태를 Firebase에 저장하지 못했습니다.");
      });

      return exists
        ? prev.map((log) => log.medId === medId && log.date === TODAY_STR && log.timing === timing ? updated : log)
        : [...prev, updated];
    });
  };

  const getLogStatus = (medId: number, timing: MedTiming): MedStatus =>
    logs.find((log) => log.medId === medId && log.date === TODAY_STR && log.timing === timing)?.status ?? "미복용";

  const inputCls = (error?: string) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${error ? "border-red-400 focus:border-red-500" : "border-border focus:border-primary"}`;

  return (
    <div className="p-5 max-w-[1400px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">복약 관리</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">어르신별 복약 현황을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              className="w-44 pl-9 pr-3 py-1.5 bg-white border border-border rounded-lg text-[13px] focus:outline-none focus:border-primary transition-colors"
              placeholder="어르신/약 검색..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button onClick={() => setEditMode((value) => !value)}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${editMode ? "text-white bg-slate-700 hover:bg-slate-800 shadow-sm" : "text-foreground bg-white border border-border hover:bg-muted"}`}>
            {editMode ? "편집 완료" : "편집"}
          </button>
          <button onClick={() => openNew()}
            className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />복약 등록
          </button>
        </div>
      </div>

      {loadError && <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-[12px] border border-red-100">{loadError}</div>}

      <div className="grid grid-cols-4 gap-4 mb-5">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-[26px] font-bold text-foreground leading-none mb-1 tracking-tight">{card.value}</p>
            <p className="text-[12px] text-muted-foreground truncate" title={card.sub}>{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-4">
        {(["오늘복약", "목록"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-[12.5px] font-medium rounded-lg transition-colors ${activeTab === tab ? "bg-primary text-white shadow-sm" : "bg-white border border-border text-muted-foreground hover:bg-muted"}`}>
            {tab === "오늘복약" ? "오늘 복약 현황" : "처방약 목록"}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 mb-4">
        {ROOM_FILTERS.map((room) => (
          <button key={room} onClick={() => { setRoomFilter(room); setSelectedElderlyId("전체"); }}
            className={`px-3.5 py-1.5 text-[12.5px] font-medium rounded-lg transition-colors ${roomFilter === room ? "bg-slate-700 text-white shadow-sm" : "bg-white border border-border text-muted-foreground hover:bg-muted"}`}>
            {room}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <div className="w-44 shrink-0 bg-white rounded-xl border border-border shadow-sm overflow-hidden self-start sticky top-4">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-[12px] font-semibold text-foreground">어르신 목록</p>
          </div>
          <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
            <button onClick={() => setSelectedElderlyId("전체")}
              className={`w-full px-3 py-2 text-left text-[12.5px] transition-colors ${selectedElderlyId === "전체" ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"}`}>
              전체
            </button>
            {filteredElderly.map((elderly) => {
              const count = meds.filter((medicine) => medicine.elderlyId === elderly.id).length;
              const pending = logs.filter((log) => log.elderlyId === elderly.id && log.date === TODAY_STR && log.status === "미복용").length;
              return (
                <button key={elderly.id} onClick={() => setSelectedElderlyId(elderly.id)}
                  className={`w-full px-3 py-2 text-left transition-colors flex items-center justify-between ${selectedElderlyId === elderly.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"}`}>
                  <span className="text-[12.5px]">{elderly.name}</span>
                  <div className="flex items-center gap-1">
                    {pending > 0 && <span className="w-4 h-4 flex items-center justify-center rounded-full bg-red-400 text-white text-[9px] font-bold">{pending}</span>}
                    <span className="text-[10px] text-muted-foreground">{count}종</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          {activeTab === "오늘복약" && displayElderly.map((elderly) => {
            const elderlyMeds = getVisibleMeds(elderly);
            return (
              <div key={elderly.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-[12px] font-bold text-blue-700">{elderly.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{elderly.name}</p>
                      <p className="text-[11px] text-muted-foreground">{elderly.age}세 · {elderly.room} · {elderlyMeds.length}종 처방</p>
                    </div>
                  </div>
                  <button onClick={() => openNew(elderly.id)} className="text-[12px] text-primary hover:text-blue-700 font-medium flex items-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" />약 추가
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {elderlyMeds.map((medicine) => (
                    <div key={medicine.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[13px] font-medium text-foreground">{medicine.name}</p>
                          <span className="text-[11px] text-muted-foreground">{medicine.dosage}</span>
                          {medicine.notes && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{medicine.notes}</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground">처방: {medicine.prescriber} · {medicine.startDate} ~ {medicine.endDate}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {medicine.timings.map((timing) => {
                          const status = getLogStatus(medicine.id, timing);
                          return (
                            <button key={timing} onClick={() => toggleLog(medicine.id, elderly.id, timing)}
                              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border transition-all ${
                                status === "복용" ? "border-emerald-300 bg-emerald-50"
                                : status === "보류" ? "border-amber-300 bg-amber-50"
                                : "border-slate-200 bg-slate-50 hover:border-slate-300"
                              }`}>
                              <span className={`text-[10px] font-medium ${timingColor[timing].split(" ")[1]}`}>{timing}</span>
                              <span className={`text-[10px] font-semibold ${status === "복용" ? "text-emerald-600" : status === "보류" ? "text-amber-600" : "text-slate-400"}`}>
                                {status === "복용" ? "✓" : status === "보류" ? "△" : "○"}
                              </span>
                            </button>
                          );
                        })}
                        {editMode && (
                          <div className="flex items-center gap-1 pl-1 border-l border-border">
                            <button onClick={() => openEdit(medicine)} className="px-2 py-1 text-[11px] font-medium text-muted-foreground bg-muted hover:bg-slate-200 rounded transition-colors">수정</button>
                            <button onClick={() => removeMedicine(medicine)} className="px-2 py-1 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors">삭제</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {activeTab === "목록" && (
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-foreground">처방약 목록</h2>
                <span className="text-[12px] text-muted-foreground">{visibleListMeds.length}종</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="px-5 py-2.5 text-left font-semibold text-muted-foreground">어르신</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">약품명</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">용량</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">복약 시간</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">처방 병원</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">비고</th>
                      {editMode && <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground w-16">관리</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleListMeds.map((medicine) => {
                      const elderly = elderlyList.find((item) => item.id === medicine.elderlyId);
                      return (
                        <tr key={medicine.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-2.5 font-medium text-foreground">{elderly?.name ?? "-"}</td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{medicine.name}</td>
                          <td className="px-3 py-2.5 text-center text-muted-foreground">{medicine.dosage}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {medicine.timings.map((timing) => <span key={timing} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${timingColor[timing]}`}>{timing}</span>)}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{medicine.prescriber}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-[11.5px]">{medicine.notes || "-"}</td>
                          {editMode && (
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => openEdit(medicine)} className="px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted hover:bg-slate-200 rounded transition-colors">수정</button>
                                <button onClick={() => removeMedicine(medicine)} className="px-2 py-0.5 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors">삭제</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">{editId ? "복약 정보 수정" : "복약 등록"}</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">처방약 정보를 입력하세요</p>
              </div>
              <button onClick={closeForm} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground text-lg">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">어르신 <span className="text-red-500">*</span></label>
                <div className="flex gap-1.5 mb-2">
                  {ROOM_FILTERS.map((room) => (
                    <button
                      key={room}
                      type="button"
                      onClick={() => {
                        setFormRoomFilter(room);
                        updateForm("elderlyId", 0);
                      }}
                      className={`px-2.5 py-1 text-[11.5px] font-medium rounded-lg border transition-colors ${formRoomFilter === room ? "bg-slate-900 text-white border-slate-900" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}
                    >
                      {room}
                    </button>
                  ))}
                </div>
                <select className={inputCls(errors.elderlyId)} value={form.elderlyId} onChange={(event) => updateForm("elderlyId", Number(event.target.value))}>
                  <option value={0}>어르신 선택</option>
                  {form.elderlyId !== 0 && !formElderlyOptions.some((elderly) => elderly.id === form.elderlyId) && (
                    <option value={form.elderlyId}>
                      {elderlyList.find((elderly) => elderly.id === form.elderlyId)?.name ?? "선택된 어르신"}
                    </option>
                  )}
                  {formElderlyOptions.map((elderly) => (
                    <option key={elderly.id} value={elderly.id}>
                      {elderly.name} · {elderly.room}
                    </option>
                  ))}
                </select>
                {errors.elderlyId && <p className="text-[11px] text-red-500 mt-0.5">{errors.elderlyId}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">약품명 <span className="text-red-500">*</span></label>
                  <input className={inputCls(errors.name)} value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
                  {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">용량</label>
                  <input className={inputCls()} value={form.dosage} onChange={(event) => updateForm("dosage", event.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1.5">복약 시간 <span className="text-red-500">*</span></label>
                <div className={`flex gap-2 rounded-lg ${errors.timings ? "ring-1 ring-red-400" : ""}`}>
                  {TIMINGS.map((timing) => (
                    <button key={timing} onClick={() => updateForm(
                      "timings",
                      form.timings.includes(timing) ? form.timings.filter((item) => item !== timing) : [...form.timings, timing],
                    )}
                      className={`flex-1 py-2 text-[12px] rounded-lg border transition-colors font-medium ${form.timings.includes(timing) ? `border-transparent ${timingColor[timing]}` : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {timing}
                    </button>
                  ))}
                </div>
                {errors.timings && <p className="text-[11px] text-red-500 mt-0.5">{errors.timings}</p>}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">처방 병원</label>
                <input className={inputCls()} value={form.prescriber} onChange={(event) => updateForm("prescriber", event.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">처방 시작일</label>
                  <input className={inputCls()} value={form.startDate} onChange={(event) => updateForm("startDate", event.target.value)} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">처방 종료일</label>
                  <input className={inputCls()} value={form.endDate} onChange={(event) => updateForm("endDate", event.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">복약 메모</label>
                <input className={inputCls()} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={closeForm} className="px-4 py-2 text-[13px] font-medium text-foreground bg-white border border-border rounded-lg hover:bg-muted transition-colors">취소</button>
              <button onClick={submitForm} className="px-4 py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
                <Plus className="w-3.5 h-3.5" />{editId ? "수정 완료" : "등록 완료"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
