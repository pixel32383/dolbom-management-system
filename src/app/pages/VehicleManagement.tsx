import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, X } from "lucide-react";
import {
  VEHICLE_EMPTY,
  addVehicle,
  deleteVehicle,
  fetchVehicles,
  updateVehicle,
  type VehicleForm,
  type VehicleRow,
} from "../../firebase/vehiclesList";

const VEHICLE_STATUSES = ["운행가능", "정비중", "운행불가"];
const FUEL_TYPES = ["디젤", "LPG", "가솔린", "전기"];
type SortKey = "vehicleId" | "mileage";
type SortDir = "asc" | "desc";

function vehicleStatusStyle(status: string) {
  if (status === "운행가능") return "bg-emerald-100 text-emerald-700";
  if (status === "정비중") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

const vehicleOrderValue = (vehicleId: string) => Number(vehicleId.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
const mileageValue = (mileage: string) => Number(mileage.replace(/[^\d]/g, "")) || 0;
const STATUS_FILTERS = ["전체", ...VEHICLE_STATUSES];

const toVehicleForm = (vehicle: VehicleRow): VehicleForm => ({
  vehicleId: vehicle.vehicleId,
  name: vehicle.name,
  plateNumber: vehicle.plateNumber,
  capacity: String(vehicle.capacity),
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

const matchesVehicleSearch = (vehicle: VehicleRow, keyword: string) =>
  vehicle.name.includes(keyword) ||
  vehicle.vehicleId.includes(keyword) ||
  vehicle.plateNumber.includes(keyword) ||
  vehicle.assignedDriver.includes(keyword);

export default function VehicleManagement() {
  const [list, setList] = useState<VehicleRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<VehicleForm>({ ...VEHICLE_EMPTY });
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleForm, string>>>({});
  const [editMode, setEditMode] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("vehicleId");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setList(await fetchVehicles());
      } catch (error) {
        console.error("차량 데이터 불러오기 실패:", error);
        setLoadError("Firebase 차량 데이터를 불러오지 못해 기본 데이터를 표시 중입니다.");
      }
    };

    loadVehicles();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim();
    return [...list]
      .filter(vehicle => {
        const matchSearch = !keyword || matchesVehicleSearch(vehicle, keyword);
        const matchStatus = statusFilter === "전체" || vehicle.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const result = sortKey === "vehicleId"
          ? vehicleOrderValue(a.vehicleId) - vehicleOrderValue(b.vehicleId)
          : mileageValue(a.mileage) - mileageValue(b.mileage);
        return sortDir === "asc" ? result : -result;
      });
  }, [list, search, sortDir, sortKey, statusFilter]);

  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(direction => direction === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const sortButton = (label: string, key: SortKey) => (
    <button type="button" onClick={() => changeSort(key)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <SortIcon column={key} />
    </button>
  );

  const openNew = () => {
    setForm({ ...VEHICLE_EMPTY });
    setEditId(null);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (vehicle: VehicleRow) => {
    setForm(toVehicleForm(vehicle));
    setEditId(vehicle.id);
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setErrors({});
  };

  const updateForm = <K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => current[key] ? { ...current, [key]: "" } : current);
  };

  const deleteRow = async (vehicle: VehicleRow) => {
    const previous = list;
    setList(current => current.filter(item => item.id !== vehicle.id));
    if (detailId === vehicle.id) setDetailId(null);

    try {
      await deleteVehicle(vehicle);
    } catch (error) {
      console.error("차량 데이터 삭제 실패:", error);
      setLoadError("화면에서는 삭제됐지만 Firebase 삭제에 실패했습니다.");
      setList(previous);
    }
  };

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!form.vehicleId.trim()) nextErrors.vehicleId = "차량번호를 입력하세요";
    if (!form.name.trim()) nextErrors.name = "차종을 입력하세요";
    if (!form.plateNumber.trim()) nextErrors.plateNumber = "차량번호판을 입력하세요";
    return nextErrors;
  };

  const submitForm = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (editId !== null) {
      const target = list.find(vehicle => vehicle.id === editId);
      if (!target) return;
      const updated: VehicleRow = { ...target, ...form, capacity: Number(form.capacity) || 0 };
      setList(current => current.map(vehicle => vehicle.id === editId ? updated : vehicle));
      try {
        await updateVehicle(updated);
      } catch (error) {
        console.error("차량 데이터 수정 실패:", error);
        setLoadError("화면에는 수정됐지만 Firebase 저장에 실패했습니다.");
      }
    } else {
      try {
        const created = await addVehicle(form);
        setList(current => [...current, created]);
      } catch (error) {
        console.error("차량 데이터 저장 실패:", error);
        setLoadError("차량 등록에 실패했습니다.");
      }
    }

    closeForm();
  };

  const inputCls = (error?: string) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${error ? "border-red-400 focus:border-red-500" : "border-border focus:border-primary"}`;

  return (
    <div className="p-5 max-w-[1200px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">차량 관리</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">송영 차량 정보와 정비 상태를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              className="w-56 pl-9 pr-3 py-1.5 bg-white border border-border rounded-lg text-[13px] focus:outline-none focus:border-primary transition-colors"
              placeholder="차량 · 번호판 · 기사 검색"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <button onClick={() => setEditMode(mode => !mode)} className={`px-3 py-1.5 text-[13px] font-medium rounded-lg border transition-colors ${editMode ? "bg-slate-900 text-white border-slate-900" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}>
            편집
          </button>
          <button onClick={openNew} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            차량 등록
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-700">
          {loadError}
        </div>
      )}

      <div className="mb-3 flex gap-1.5">
        {STATUS_FILTERS.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${statusFilter === status ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[13px] font-semibold text-foreground">차량 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-muted/60">
                <th className="px-5 py-2.5 text-left font-semibold text-muted-foreground">{sortButton("차량", "vehicleId")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">차종</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">번호판</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">정원</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">상태</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("주행거리", "mileage")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">담당기사</th>
                {editMode && <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground w-24">관리</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(vehicle => {
                const isOpen = detailId === vehicle.id;
                return (
                  <tr key={vehicle.firestoreId ?? vehicle.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-foreground">
                      <button onClick={() => setDetailId(isOpen ? null : vehicle.id)} className="hover:text-primary">
                        {vehicle.vehicleId}
                      </button>
                      {isOpen && (
                        <div className="mt-2 text-[11.5px] text-muted-foreground leading-relaxed">
                          <p>연식: {vehicle.year || "-"}</p>
                          <p>연료: {vehicle.fuelType || "-"}</p>
                          <p>다음 점검: {vehicle.nextInspection || "-"}</p>
                          <p>특이사항: {vehicle.notes || "-"}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{vehicle.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{vehicle.plateNumber}</td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">{vehicle.capacity}명</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${vehicleStatusStyle(vehicle.status)}`}>{vehicle.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">{vehicle.mileage}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{vehicle.assignedDriver}</td>
                    {editMode && (
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(vehicle)} className="px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted hover:bg-slate-200 rounded transition-colors">
                            수정
                          </button>
                          <button onClick={() => deleteRow(vehicle)} className="px-2 py-0.5 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors">
                            삭제
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={editMode ? 8 : 7} className="py-12 text-center text-[13px] text-muted-foreground">검색 결과가 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[560px]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-foreground">{editId ? "차량 수정" : "차량 등록"}</h2>
              <button onClick={closeForm} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">차량</label>
                  <input className={inputCls(errors.vehicleId)} value={form.vehicleId} onChange={event => updateForm("vehicleId", event.target.value)} />
                  {errors.vehicleId && <p className="text-[11px] text-red-500 mt-0.5">{errors.vehicleId}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">차종</label>
                  <input className={inputCls(errors.name)} value={form.name} onChange={event => updateForm("name", event.target.value)} />
                  {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">번호판</label>
                  <input className={inputCls(errors.plateNumber)} value={form.plateNumber} onChange={event => updateForm("plateNumber", event.target.value)} />
                  {errors.plateNumber && <p className="text-[11px] text-red-500 mt-0.5">{errors.plateNumber}</p>}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">정원</label>
                  <input className={inputCls()} value={form.capacity} onChange={event => updateForm("capacity", event.target.value)} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">상태</label>
                  <select className={inputCls()} value={form.status} onChange={event => updateForm("status", event.target.value)}>
                    {VEHICLE_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">연식</label>
                  <input className={inputCls()} value={form.year} onChange={event => updateForm("year", event.target.value)} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">연료</label>
                  <select className={inputCls()} value={form.fuelType} onChange={event => updateForm("fuelType", event.target.value)}>
                    {FUEL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">주행거리</label>
                  <input className={inputCls()} value={form.mileage} onChange={event => updateForm("mileage", event.target.value)} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">최근 점검</label>
                  <input className={inputCls()} value={form.lastInspection} onChange={event => updateForm("lastInspection", event.target.value)} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">다음 점검</label>
                  <input className={inputCls()} value={form.nextInspection} onChange={event => updateForm("nextInspection", event.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">보험 만료</label>
                  <input className={inputCls()} value={form.insExpiry} onChange={event => updateForm("insExpiry", event.target.value)} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">담당기사</label>
                  <input className={inputCls()} value={form.assignedDriver} onChange={event => updateForm("assignedDriver", event.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">특이사항</label>
                <textarea className={inputCls()} rows={3} value={form.notes} onChange={event => updateForm("notes", event.target.value)} />
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
