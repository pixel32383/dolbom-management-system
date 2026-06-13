import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Bus, GripVertical, Plus, Search, Users, X, Activity } from "lucide-react";
import {
  RUN_EMPTY,
  addTransport,
  deleteTransport,
  fetchTransports,
  updateTransport,
  type TransportDirection,
  type TransportRun,
  type TransportStatus,
} from "../../firebase/transportsList";
import { fetchVehicles, type VehicleRow } from "../../firebase/vehiclesList";
import { db } from "../../firebase/firebase";

type PassengerSenior = {
  name: string;
  address: string;
  dong: string;
};

const ROUTE_OPTIONS = ["동춘동", "송도동", "청학동"];
const STATUS_OPTIONS: TransportStatus[] = ["대기", "운행중", "완료", "취소"];
const DIRECTION_OPTIONS: TransportDirection[] = ["등원", "하원"];
const DIRECTION_FILTERS = ["전체", ...DIRECTION_OPTIONS] as const;
const STATUS_FILTERS = ["전체", ...STATUS_OPTIONS] as const;

function transportRunStatusStyle(status: TransportStatus) {
  if (status === "완료") return "bg-emerald-100 text-emerald-700";
  if (status === "운행중") return "bg-blue-100 text-blue-700";
  if (status === "대기") return "bg-slate-100 text-slate-600";
  return "bg-red-100 text-red-700";
}

const vehicleOrderValue = (vehicleId: string) => Number(vehicleId.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);

const mapPassengerSenior = (data: { name?: string; dong?: string; address?: string; seniorAddress?: string }): PassengerSenior => ({
  name: data.name?.trim() ?? "",
  address: data.seniorAddress ?? data.address ?? "",
  dong: data.dong ?? "",
});

const toRunForm = (run: TransportRun): typeof RUN_EMPTY => ({
  vehicleId: run.vehicleId,
  driver: run.driver,
  direction: run.direction,
  route: run.route,
  scheduledTime: run.scheduledTime,
  actualTime: run.actualTime,
  status: run.status,
  passengers: [...run.passengers],
  notes: run.notes,
});

const matchesRunSearch = (run: TransportRun, keyword: string) =>
  run.vehicleId.includes(keyword) ||
  run.driver.includes(keyword) ||
  run.route.includes(keyword) ||
  run.passengers.some(passenger => passenger.includes(keyword));

const nextRunStatus = (status: TransportStatus) =>
  STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(status) + 1) % STATUS_OPTIONS.length];

export default function TransportManagement({ onActiveCountChange }: { onActiveCountChange?: (count: number) => void }) {
  const [runs, setRuns] = useState<TransportRun[]>([]);
  const [dirFilter, setDirFilter] = useState<"전체" | TransportDirection>("전체");
  const [statusFilter, setStatusFilter] = useState<"전체" | TransportStatus>("전체");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...RUN_EMPTY });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof RUN_EMPTY, string>>>({});
  const [detailId, setDetailId] = useState<number | null>(null);
  const [passengerSearch, setPassengerSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [seniors, setSeniors] = useState<PassengerSenior[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [draggedRunId, setDraggedRunId] = useState<number | null>(null);
  const [dragOverRunId, setDragOverRunId] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [transportList, vehicleList, seniorSnapshot] = await Promise.all([
          fetchTransports(),
          fetchVehicles(),
          getDocs(collection(db, "seniors")),
        ]);
        const seniorList = seniorSnapshot.docs
          .map(document => mapPassengerSenior(document.data()))
          .filter(senior => senior.name)
          .sort((a, b) => a.name.localeCompare(b.name, "ko"));

        setRuns(transportList);
        setVehicles(vehicleList);
        setSeniors(seniorList);
      } catch (error) {
        console.error("송영 데이터 불러오기 실패:", error);
        setLoadError("Firebase 송영, 차량 또는 어르신 데이터를 불러오지 못해 기본 데이터를 표시 중입니다.");
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    onActiveCountChange?.(runs.filter(run => run.status === "운행중").length);
  }, [runs, onActiveCountChange]);

  const vehicleOptions = useMemo(() => {
    const options = (vehicles.length > 0
      ? vehicles.map(vehicle => vehicle.vehicleId).filter(Boolean)
      : ["1호차", "2호차", "3호차"]
    ).sort((a, b) => vehicleOrderValue(a) - vehicleOrderValue(b) || a.localeCompare(b, "ko", { numeric: true }));
    return form.vehicleId && !options.includes(form.vehicleId) ? [form.vehicleId, ...options] : options;
  }, [form.vehicleId, vehicles]);

  const passengerOptions = seniors
    .filter(senior => senior.dong === form.route || senior.address.includes(form.route))
    .filter(senior => !passengerSearch.trim() || senior.name.includes(passengerSearch.trim()));

  const filtered = useMemo(() => {
    const keyword = search.trim();
    return [...runs]
      .filter(run => {
        const matchDir = dirFilter === "전체" || run.direction === dirFilter;
        const matchStatus = statusFilter === "전체" || run.status === statusFilter;
        const matchSearch = !keyword || matchesRunSearch(run, keyword);
        return matchDir && matchStatus && matchSearch;
      })
      .sort((a, b) => a.order - b.order || a.id - b.id);
  }, [dirFilter, runs, search, statusFilter]);

  const openNew = () => {
    setForm({ ...RUN_EMPTY, vehicleId: vehicleOptions[0] ?? RUN_EMPTY.vehicleId });
    setEditId(null);
    setErrors({});
    setPassengerSearch("");
    setShowForm(true);
  };

  const openEdit = (run: TransportRun) => {
    setForm(toRunForm(run));
    setEditId(run.id);
    setErrors({});
    setPassengerSearch("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setErrors({});
  };

  const updateForm = <K extends keyof typeof RUN_EMPTY>(key: K, value: typeof RUN_EMPTY[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => current[key] ? { ...current, [key]: "" } : current);
  };

  const deleteRun = async (run: TransportRun) => {
    const previous = runs;
    setRuns(current => current.filter(item => item.id !== run.id));
    if (detailId === run.id) setDetailId(null);

    try {
      await deleteTransport(run);
    } catch (error) {
      console.error("송영 운행 데이터 삭제 실패:", error);
      setLoadError("화면에서는 삭제됐지만 Firebase 삭제에 실패했습니다.");
      setRuns(previous);
    }
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof typeof RUN_EMPTY, string>> = {};
    if (!form.vehicleId.trim()) nextErrors.vehicleId = "차량을 선택하세요";
    if (!form.driver.trim()) nextErrors.driver = "기사를 입력하세요";
    if (!form.route.trim()) nextErrors.route = "담당구역을 선택하세요";
    if (!form.scheduledTime.trim()) nextErrors.scheduledTime = "예정시간을 입력하세요";
    if (form.passengers.length === 0) nextErrors.passengers = "탑승자를 선택하세요";
    return nextErrors;
  };

  const submitForm = async () => {
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (editId !== null) {
      const target = runs.find(run => run.id === editId);
      if (!target) return;
      const updated: TransportRun = { ...target, ...form };
      setRuns(current => current.map(run => run.id === editId ? updated : run));
      try {
        await updateTransport(updated);
      } catch (error) {
        console.error("송영 운행 데이터 수정 실패:", error);
        setLoadError("화면에는 수정됐지만 Firebase 저장에 실패했습니다.");
      }
    } else {
      const nextOrder = Math.max(0, ...runs.map(run => run.order)) + 1;
      try {
        const created = await addTransport({ ...form, order: nextOrder });
        setRuns(current => [...current, created]);
      } catch (error) {
        console.error("송영 운행 데이터 저장 실패:", error);
        setLoadError("운행 등록에 실패했습니다.");
      }
    }

    closeForm();
  };

  const cycleStatus = async (run: TransportRun) => {
    const next = nextRunStatus(run.status);
    const updated = { ...run, status: next };
    setRuns(current => current.map(item => item.id === run.id ? updated : item));
    try {
      await updateTransport(updated);
    } catch (error) {
      console.error("운행 상태 저장 실패:", error);
      setLoadError("운행 상태를 Firebase에 저장하지 못했습니다.");
    }
  };

  const reorderRuns = (fromId: number, toId: number) => {
    if (fromId === toId) return;
    setRuns(current => {
      const ordered = [...current].sort((a, b) => a.order - b.order || a.id - b.id);
      const fromIndex = ordered.findIndex(run => run.id === fromId);
      const toIndex = ordered.findIndex(run => run.id === toId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const [moved] = ordered.splice(fromIndex, 1);
      ordered.splice(toIndex, 0, moved);
      const next = ordered.map((run, index) => ({ ...run, order: index + 1 }));
      next.forEach(run => updateTransport(run).catch(() => undefined));
      return next;
    });
  };

  const togglePassenger = (name: string) => {
    setForm(current => ({
      ...current,
      passengers: current.passengers.includes(name)
        ? current.passengers.filter(passenger => passenger !== name)
        : [...current.passengers, name],
    }));
  };

  const passengerCount = new Set(runs.flatMap(run => run.passengers)).size;
  const summaryCards = useMemo(() => [
    { label: "등록된 운행", value: `${runs.length}건`, sub: "전체 운행 카드", Icon: Bus, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "운행중", value: `${runs.filter(run => run.status === "운행중").length}건`, sub: "현재 운행 상태", Icon: Activity, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "총 탑승인원", value: `${passengerCount}명`, sub: "중복 제외 탑승자", Icon: Users, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
  ], [passengerCount, runs]);
  const inputCls = (error?: string) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${error ? "border-red-400 focus:border-red-500" : "border-border focus:border-primary"}`;

  return (
    <div className="p-5 max-w-[1300px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">송영 관리</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">차량별 등원·하원 운행을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditMode(mode => !mode)} className={`px-3 py-1.5 text-[13px] font-medium rounded-lg border transition-colors ${editMode ? "bg-slate-900 text-white border-slate-900" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}>
            편집
          </button>
          <button onClick={openNew} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            운행 등록
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-700">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-5">
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

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {DIRECTION_FILTERS.map(direction => (
            <button key={direction} onClick={() => setDirFilter(direction)} className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${dirFilter === direction ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}>
              {direction}
            </button>
          ))}
          {STATUS_FILTERS.map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${statusFilter === status ? "bg-slate-900 text-white border-slate-900" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}>
              {status}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            className="w-56 pl-9 pr-3 py-1.5 bg-white border border-border rounded-lg text-[13px] focus:outline-none focus:border-primary transition-colors"
            placeholder="차량 · 기사 · 탑승자 검색"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(run => (
          <div
            key={run.firestoreId ?? run.id}
            draggable={editMode}
            onDragStart={() => setDraggedRunId(run.id)}
            onDragOver={event => {
              if (!editMode) return;
              event.preventDefault();
              setDragOverRunId(run.id);
            }}
            onDrop={event => {
              event.preventDefault();
              if (draggedRunId !== null) reorderRuns(draggedRunId, run.id);
              setDraggedRunId(null);
              setDragOverRunId(null);
            }}
            onDragEnd={() => {
              setDraggedRunId(null);
              setDragOverRunId(null);
            }}
            className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${dragOverRunId === run.id ? "border-primary scale-[1.01] shadow-md" : "border-border"}`}
          >
            <div className="flex items-start gap-3">
              {editMode && <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-grab" />}
              <button onClick={() => setDetailId(detailId === run.id ? null : run.id)} className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-foreground">{run.vehicleId}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${transportRunStatusStyle(run.status)}`}>{run.status}</span>
                  <span className="text-[11px] text-muted-foreground">{run.direction}</span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1">{run.route} · {run.scheduledTime} · {run.driver || "담당자 미정"}</p>
                {detailId === run.id && (
                  <div className="mt-3 text-[12px] text-muted-foreground">
                    <p>탑승자: {run.passengers.length ? run.passengers.join(", ") : "-"}</p>
                    <p>실제시간: {run.actualTime || "-"}</p>
                    <p>특이사항: {run.notes || "-"}</p>
                  </div>
                )}
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => cycleStatus(run)} className="px-2.5 py-1 text-[11px] font-medium text-primary bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
                  상태
                </button>
                {editMode && (
                  <>
                    <button onClick={() => openEdit(run)} className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground bg-muted hover:bg-slate-200 rounded-md transition-colors">
                      수정
                    </button>
                    <button onClick={() => deleteRun(run)} className="px-2.5 py-1 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-border shadow-sm py-12 text-center text-[13px] text-muted-foreground">
            검색 결과가 없습니다
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[620px]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-foreground">{editId ? "운행 수정" : "운행 등록"}</h2>
              <button onClick={closeForm} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">차량 <span className="text-red-500">*</span></label>
                  <select className={inputCls(errors.vehicleId)} value={form.vehicleId} onChange={event => updateForm("vehicleId", event.target.value)}>
                    {vehicleOptions.map(vehicleId => <option key={vehicleId} value={vehicleId}>{vehicleId}</option>)}
                  </select>
                  {errors.vehicleId && <p className="text-[11px] text-red-500 mt-0.5">{errors.vehicleId}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">방향</label>
                  <select className="w-full px-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary" value={form.direction} onChange={event => updateForm("direction", event.target.value as TransportDirection)}>
                    {DIRECTION_OPTIONS.map(direction => <option key={direction} value={direction}>{direction}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">상태</label>
                  <select className="w-full px-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary" value={form.status} onChange={event => updateForm("status", event.target.value as TransportStatus)}>
                    {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">기사 <span className="text-red-500">*</span></label>
                  <input className={inputCls(errors.driver)} value={form.driver} onChange={event => updateForm("driver", event.target.value)} />
                  {errors.driver && <p className="text-[11px] text-red-500 mt-0.5">{errors.driver}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">담당구역 <span className="text-red-500">*</span></label>
                  <select className={inputCls(errors.route)} value={form.route} onChange={event => {
                    updateForm("route", event.target.value);
                    updateForm("passengers", []);
                  }}>
                    {ROUTE_OPTIONS.map(route => <option key={route} value={route}>{route}</option>)}
                  </select>
                  {errors.route && <p className="text-[11px] text-red-500 mt-0.5">{errors.route}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">예정시간 <span className="text-red-500">*</span></label>
                  <input className={inputCls(errors.scheduledTime)} value={form.scheduledTime} onChange={event => updateForm("scheduledTime", event.target.value)} />
                  {errors.scheduledTime && <p className="text-[11px] text-red-500 mt-0.5">{errors.scheduledTime}</p>}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">탑승자 <span className="text-red-500">*</span></label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input className="w-full pl-9 pr-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary" placeholder="어르신 검색" value={passengerSearch} onChange={event => setPassengerSearch(event.target.value)} />
                </div>
                <div className={`max-h-36 overflow-y-auto rounded-lg border p-2 flex flex-wrap gap-1.5 ${errors.passengers ? "border-red-400" : "border-border"}`}>
                  {passengerOptions.map(senior => (
                    <button key={senior.name} type="button" onClick={() => togglePassenger(senior.name)} className={`px-2.5 py-1 text-[11.5px] rounded-lg border transition-colors ${form.passengers.includes(senior.name) ? "border-primary bg-blue-50 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {senior.name}
                    </button>
                  ))}
                  {passengerOptions.length === 0 && <p className="text-[12px] text-muted-foreground p-2">선택 가능한 어르신이 없습니다</p>}
                </div>
                {errors.passengers && <p className="text-[11px] text-red-500 mt-0.5">{errors.passengers}</p>}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">특이사항</label>
                <textarea className="w-full px-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary resize-none" rows={3} value={form.notes} onChange={event => updateForm("notes", event.target.value)} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={closeForm} className="px-4 py-2 text-[13px] font-medium text-foreground bg-white border border-border rounded-lg hover:bg-muted transition-colors">
                취소
              </button>
              <button onClick={submitForm} className="px-4 py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
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
