import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Clock, Plus, Search, UserCheck, Users, X } from "lucide-react";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

type ElderlyRow = {
  id: number;
  firestoreId?: string;
  name: string;
  age: number;
  gender: string;
  dong: string;
  room: string;
  status: string;
  guardian: string;
  phone: string;
  address: string;
  admissionDate: string;
  notes: string;
};
type SortKey = "name" | "age" | "gender" | "dong" | "room" | "status" | "guardian";
type SortDirection = "asc" | "desc";

const DONG_OPTIONS = ["동춘동", "송도동", "청학동"] as const;
const DONG_FILTERS = ["전체", ...DONG_OPTIONS] as const;
const ROOM_OPTIONS = ["미소방", "희망방", "사랑방"];
const STATUS_OPTIONS = ["정상", "주의", "병가", "퇴소"];
const ABSENT_STATUSES = ["병가", "조퇴"] as const;

const getDongFromAddress = (address = "") =>
  DONG_OPTIONS.find(dong => address.includes(dong)) ?? "동춘동";

type SeniorDoc = {
  age?: number | string;
  dateRegistration?: string;
  dong?: string;
  gender?: string;
  guardian?: string;
  guardianName?: string;
  name?: string;
  room?: string;
  seniorAddress?: string;
  seniorPhone?: string;
  specialNote?: string;
  state?: string;
  status?: string;
  phone?: string;
  address?: string;
  admissionDate?: string;
  notes?: string;
};

const mapSeniorDoc = (id: number, firestoreId: string, data: SeniorDoc): ElderlyRow => ({
  id,
  firestoreId,
  name: data.name ?? "",
  age: Number(data.age ?? 0),
  gender: data.gender ?? "여",
  dong: data.dong && DONG_OPTIONS.includes(data.dong as typeof DONG_OPTIONS[number])
    ? data.dong
    : getDongFromAddress(data.address ?? data.seniorAddress),
  room: data.room ?? "희망방",
  status: data.status ?? data.state ?? "정상",
  guardian: data.guardian ?? data.guardianName ?? "",
  phone: data.phone ?? data.seniorPhone ?? "",
  address: data.address ?? data.seniorAddress ?? "",
  admissionDate: data.admissionDate ?? data.dateRegistration ?? "",
  notes: data.notes ?? data.specialNote ?? "",
});

const EMPTY_FORM = {
  name: "",
  age: "",
  gender: "여",
  dong: "동춘동",
  room: "희망방",
  status: "정상",
  guardian: "",
  phone: "",
  address: "",
  admissionDate: "",
  notes: "",
};

type ElderlyForm = typeof EMPTY_FORM;

const toSeniorPayload = (form: ElderlyForm) => ({
  name: form.name,
  age: Number(form.age),
  gender: form.gender,
  dong: form.dong,
  room: form.room,
  status: form.status,
  state: form.status,
  guardian: form.guardian,
  guardianName: form.guardian,
  phone: form.phone,
  seniorPhone: form.phone,
  address: form.address,
  seniorAddress: form.address,
  admissionDate: form.admissionDate,
  dateRegistration: form.admissionDate,
  notes: form.notes,
  specialNote: form.notes,
});

const toElderlyRow = (form: ElderlyForm, id: number, base: Partial<ElderlyRow> = {}): ElderlyRow => ({
  ...base,
  id,
  name: form.name,
  age: Number(form.age),
  gender: form.gender,
  dong: form.dong,
  room: form.room,
  status: form.status,
  guardian: form.guardian,
  phone: form.phone,
  address: form.address,
  admissionDate: form.admissionDate,
  notes: form.notes,
});

const toElderlyForm = (row: ElderlyRow): ElderlyForm => ({
  name: row.name,
  age: String(row.age),
  gender: row.gender,
  dong: row.dong,
  room: row.room,
  status: row.status,
  guardian: row.guardian,
  phone: row.phone,
  address: row.address,
  admissionDate: row.admissionDate,
  notes: row.notes,
});

function RegisterField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-foreground mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function RegisterModal({
  onClose,
  onSubmit,
  initialForm = EMPTY_FORM,
  title = "어르신 등록",
  description = "어르신 정보를 입력하세요",
  submitLabel = "등록 완료",
}: {
  onClose: () => void;
  onSubmit: (data: ElderlyForm) => void;
  initialForm?: ElderlyForm;
  title?: string;
  description?: string;
  submitLabel?: string;
}) {
  const [form, setForm] = useState({ ...initialForm });
  const [errors, setErrors] = useState<Partial<Record<keyof ElderlyForm, string>>>({});

  const set = (key: keyof ElderlyForm, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => current[key] ? { ...current, [key]: "" } : current);
  };

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!form.name.trim()) nextErrors.name = "이름을 입력하세요";
    if (!form.age || Number.isNaN(Number(form.age)) || Number(form.age) <= 0) nextErrors.age = "올바른 나이를 입력하세요";
    if (!form.guardian.trim()) nextErrors.guardian = "보호자를 입력하세요";
    if (!form.phone.trim()) nextErrors.phone = "연락처를 입력하세요";
    if (!form.admissionDate.trim()) nextErrors.admissionDate = "입소일을 입력하세요";
    return nextErrors;
  };

  const handleSubmit = () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onSubmit(form);
  };

  const inputCls = (error?: string) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${error ? "border-red-400 focus:border-red-500" : "border-border focus:border-primary"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[560px]">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <RegisterField label="이름" required>
              <input className={inputCls(errors.name)} value={form.name} onChange={event => set("name", event.target.value)} />
              {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
            </RegisterField>
            <RegisterField label="나이" required>
              <input className={inputCls(errors.age)} value={form.age} onChange={event => set("age", event.target.value)} />
              {errors.age && <p className="text-[11px] text-red-500 mt-0.5">{errors.age}</p>}
            </RegisterField>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <RegisterField label="성별">
              <select className={inputCls()} value={form.gender} onChange={event => set("gender", event.target.value)}>
                <option value="여">여</option>
                <option value="남">남</option>
              </select>
            </RegisterField>
            <RegisterField label="동">
              <select className={inputCls()} value={form.dong} onChange={event => set("dong", event.target.value)}>
                {DONG_OPTIONS.map(dong => <option key={dong} value={dong}>{dong}</option>)}
              </select>
            </RegisterField>
            <RegisterField label="호실">
              <select className={inputCls()} value={form.room} onChange={event => set("room", event.target.value)}>
                {ROOM_OPTIONS.map(room => <option key={room} value={room}>{room}</option>)}
              </select>
            </RegisterField>
            <RegisterField label="상태">
              <select className={inputCls()} value={form.status} onChange={event => set("status", event.target.value)}>
                {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </RegisterField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <RegisterField label="보호자" required>
              <input className={inputCls(errors.guardian)} value={form.guardian} onChange={event => set("guardian", event.target.value)} />
              {errors.guardian && <p className="text-[11px] text-red-500 mt-0.5">{errors.guardian}</p>}
            </RegisterField>
            <RegisterField label="연락처" required>
              <input className={inputCls(errors.phone)} value={form.phone} onChange={event => set("phone", event.target.value)} />
              {errors.phone && <p className="text-[11px] text-red-500 mt-0.5">{errors.phone}</p>}
            </RegisterField>
          </div>
          <RegisterField label="주소">
            <input className={inputCls()} value={form.address} onChange={event => set("address", event.target.value)} />
          </RegisterField>
          <div className="grid grid-cols-2 gap-3">
            <RegisterField label="입소일" required>
              <input className={inputCls(errors.admissionDate)} value={form.admissionDate} onChange={event => set("admissionDate", event.target.value)} />
              {errors.admissionDate && <p className="text-[11px] text-red-500 mt-0.5">{errors.admissionDate}</p>}
            </RegisterField>
            <RegisterField label="특이사항">
              <input className={inputCls()} value={form.notes} onChange={event => set("notes", event.target.value)} />
            </RegisterField>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-foreground bg-white border border-border rounded-lg hover:bg-muted transition-colors">
            취소
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const statusStyle = (status: string) =>
  status === "정상" ? "bg-emerald-100 text-emerald-700"
    : status === "주의" ? "bg-amber-100 text-amber-700"
      : status === "외출" ? "bg-yellow-100 text-yellow-700"
      : status === "병가" ? "bg-rose-100 text-rose-700"
        : "bg-slate-100 text-slate-600";

export default function ElderlyManagement({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const [list, setList] = useState<ElderlyRow[]>([]);
  const [search, setSearch] = useState("");
  const [dongFilter, setDongFilter] = useState("전체");
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<ElderlyRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const loadSeniors = async () => {
      try {
        const snapshot = await getDocs(collection(db, "seniors"));
        if (!snapshot.empty) {
          const rows = snapshot.docs
            .map((document, index) => mapSeniorDoc(index + 1, document.id, document.data() as SeniorDoc))
            .filter(row => row.name)
            .sort((a, b) => a.id - b.id);
          setList(rows);
          onCountChange?.(rows.length);
        } else {
          onCountChange?.(0);
        }
      } catch (error) {
        console.error("어르신 데이터 불러오기 실패:", error);
        setLoadError("Firebase 어르신 데이터를 불러오지 못했습니다.");
        onCountChange?.(0);
      }
    };

    loadSeniors();
  }, [onCountChange]);

  const filtered = useMemo(() => {
    const keyword = search.trim();
    return list
      .filter(row => {
        const matchSearch = !keyword || row.name.includes(keyword) || row.guardian.includes(keyword) || row.room.includes(keyword);
        const matchDong = dongFilter === "전체" || row.dong === dongFilter;
        return matchSearch && matchDong;
      })
      .sort((a, b) => {
        const aValue = sortKey === "age" ? Number(a.age ?? 0) : String(a[sortKey] ?? "");
        const bValue = sortKey === "age" ? Number(b.age ?? 0) : String(b[sortKey] ?? "");
        const result = sortKey === "age"
          ? Number(aValue) - Number(bValue)
          : String(aValue).localeCompare(String(bValue), "ko", { numeric: true, sensitivity: "base" });
        return sortDirection === "asc" ? result : -result;
      });
  }, [dongFilter, list, search, sortDirection, sortKey]);

  const changeSort = (key: SortKey) => {
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

  const sortButton = (label: string, key: SortKey) => (
    <button type="button" onClick={() => changeSort(key)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <SortIcon column={key} />
    </button>
  );

  const summaryCards = useMemo(() => {
    const absentRows = list.filter(row => ABSENT_STATUSES.includes(row.status as typeof ABSENT_STATUSES[number]));
    const outingRows = list.filter(row => row.status === "외출");
    const attendanceCount = list.length - absentRows.length - outingRows.length;
    const absentNames = absentRows.map(row => row.name).filter(Boolean);
    const outingNames = outingRows.map(row => row.name).filter(Boolean);

    return [
      { label: "등록 어르신", value: `${list.length}명`, sub: "전체 등록 인원", Icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
      { label: "출석수", value: `${attendanceCount}명`, sub: "오늘 출석 인원", Icon: UserCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
      { label: "결석수", value: `${absentRows.length}명`, sub: absentNames.length > 0 ? absentNames.join(", ") : "병가·조퇴 없음", Icon: AlertTriangle, iconBg: "bg-red-50", iconColor: "text-red-500" },
      { label: "외출수", value: `${outingRows.length}명`, sub: outingNames.length > 0 ? outingNames.join(", ") : "외출자 없음", Icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    ];
  }, [list]);

  const openNew = () => {
    setEditRow(null);
    setShowForm(true);
  };

  const openEdit = (row: ElderlyRow) => {
    setEditRow(row);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditRow(null);
  };

  const submitForm = async (form: ElderlyForm) => {
    if (editRow) {
      const updated = toElderlyRow(form, editRow.id, editRow);
      setList(current => current.map(row => row.id === editRow.id ? updated : row));
      try {
        if (editRow.firestoreId) {
          await updateDoc(doc(db, "seniors", editRow.firestoreId), toSeniorPayload(form));
        }
      } catch (error) {
        console.error("어르신 데이터 수정 실패:", error);
        setLoadError("화면에는 수정됐지만 Firebase 저장에 실패했습니다.");
      }
    } else {
      const tempId = Date.now();
      const created = toElderlyRow(form, tempId);
      setList(current => {
        const next = [...current, created];
        onCountChange?.(next.length);
        return next;
      });
      try {
        const ref = await addDoc(collection(db, "seniors"), toSeniorPayload(form));
        setList(current => current.map(row => row.id === tempId ? { ...row, firestoreId: ref.id } : row));
      } catch (error) {
        console.error("어르신 데이터 저장 실패:", error);
        setLoadError("화면에는 추가됐지만 Firebase 저장에 실패했습니다.");
      }
    }
    closeForm();
  };

  const deleteRow = async (row: ElderlyRow) => {
    const previous = list;
    const next = list.filter(item => item.id !== row.id);
    setList(next);
    onCountChange?.(next.length);
    try {
      if (row.firestoreId) await deleteDoc(doc(db, "seniors", row.firestoreId));
    } catch (error) {
      console.error("어르신 데이터 삭제 실패:", error);
      setLoadError("화면에서는 삭제됐지만 Firebase 삭제에 실패했습니다.");
      setList(previous);
      onCountChange?.(previous.length);
    }
  };

  const editInitialForm = editRow ? toElderlyForm(editRow) : EMPTY_FORM;

  return (
    <div className="p-5 max-w-[1200px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">어르신 관리</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">등록 어르신 목록과 기본 정보를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              className="w-56 pl-9 pr-3 py-1.5 bg-white border border-border rounded-lg text-[13px] focus:outline-none focus:border-primary transition-colors"
              placeholder="이름 · 보호자 · 호실 검색"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <button onClick={() => setEditMode(mode => !mode)} className={`px-3 py-1.5 text-[13px] font-medium rounded-lg border transition-colors ${editMode ? "bg-slate-900 text-white border-slate-900" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}>
            편집
          </button>
          <button onClick={openNew} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            어르신 등록
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-700">
          {loadError}
        </div>
      )}

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

      <div className="mb-3 flex gap-1.5">
        {DONG_FILTERS.map(dong => (
          <button
            key={dong}
            onClick={() => setDongFilter(dong)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${dongFilter === dong ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}
          >
            {dong}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[13px] font-semibold text-foreground">등록 어르신 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-muted/60">
                <th className="px-5 py-2.5 text-left font-semibold text-muted-foreground">{sortButton("이름", "name")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("나이", "age")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("성별", "gender")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("동", "dong")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("호실", "room")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("상태", "status")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{sortButton("보호자", "guardian")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">연락처</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">주소</th>
                {editMode && <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground w-24">관리</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(row => (
                <tr key={row.firestoreId ?? row.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-2.5 font-medium text-foreground">{row.name}</td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{row.age}</td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{row.gender}</td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{row.dong}</td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{row.room}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle(row.status)}`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.guardian}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.phone}</td>
                  <td className="px-4 py-2.5 text-muted-foreground min-w-[220px]">{row.address || "-"}</td>
                  {editMode && (
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(row)} className="px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted hover:bg-slate-200 rounded transition-colors">
                          수정
                        </button>
                        <button onClick={() => deleteRow(row)} className="px-2 py-0.5 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors">
                          삭제
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={editMode ? 10 : 9} className="py-12 text-center text-[13px] text-muted-foreground">검색 결과가 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <RegisterModal
          onClose={closeForm}
          onSubmit={submitForm}
          initialForm={editInitialForm}
          title={editRow ? "어르신 수정" : "어르신 등록"}
          description={editRow ? "어르신 정보를 수정하세요" : "새 어르신 정보를 입력하세요"}
          submitLabel={editRow ? "수정 완료" : "등록 완료"}
        />
      )}
    </div>
  );
}
