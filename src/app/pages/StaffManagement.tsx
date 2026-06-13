import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, UserCheck, UserMinus, Users, X } from "lucide-react";
import {
  STAFF_EMPTY,
  addStaff,
  deleteStaff,
  fetchStaffList,
  updateStaff,
  type StaffForm,
  type StaffRow,
} from "../../firebase/staffList";

const POSITIONS = ["전체", "보호사", "사회복지사", "간호사", "기타"];
const STAFF_STATUSES = ["재직", "휴직", "퇴직"];
const DEPARTMENTS = ["1팀", "2팀", "3팀", "복지팀", "의료팀"];
type SortKey = "name" | "gender" | "birth" | "position" | "department" | "status" | "hireDate";
type SortDir = "asc" | "desc";

const statusStyle = (status: string) =>
  status === "재직" ? "bg-emerald-100 text-emerald-700"
    : status === "휴직" ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-500";

const posStyle = (position: string) =>
  position === "보호사" ? "bg-blue-50 text-blue-700"
    : position === "사회복지사" ? "bg-violet-50 text-violet-700"
      : position === "간호사" ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600";

const toStaffForm = (staff: StaffRow): StaffForm => ({
  name: staff.name,
  gender: staff.gender,
  birth: staff.birth,
  phone: staff.phone,
  position: staff.position,
  department: staff.department,
  status: staff.status,
  hireDate: staff.hireDate,
  certNumber: staff.certNumber,
  notes: staff.notes,
});

const matchesStaffSearch = (staff: StaffRow, keyword: string) =>
  staff.name.includes(keyword) ||
  staff.department.includes(keyword) ||
  staff.position.includes(keyword);

export default function StaffManagement() {
  const [list, setList] = useState<StaffRow[]>([]);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("전체");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<StaffForm>({ ...STAFF_EMPTY });
  const [errors, setErrors] = useState<Partial<Record<keyof StaffForm, string>>>({});
  const [editMode, setEditMode] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    const loadStaff = async () => {
      try {
        setList(await fetchStaffList());
      } catch (error) {
        console.error("직원 데이터 불러오기 실패:", error);
        setLoadError("Firebase 직원 데이터를 불러오지 못해 기본 데이터를 표시 중입니다.");
      }
    };

    loadStaff();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim();
    return [...list]
      .filter(staff => {
        const matchSearch = !keyword || matchesStaffSearch(staff, keyword);
        const matchPos = posFilter === "전체" || staff.position === posFilter;
        return matchSearch && matchPos;
      })
      .sort((a, b) => {
        const result = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "ko", { numeric: true, sensitivity: "base" });
        return sortDir === "asc" ? result : -result;
      });
  }, [list, posFilter, search, sortDir, sortKey]);

  const summaryCards = useMemo(() => {
    const activeCount = list.filter(staff => staff.status === "재직").length;
    const leaveCount = list.filter(staff => staff.status === "휴직").length;

    return [
      { label: "전체 직원", value: `${list.length}명`, sub: "등록된 직원", Icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
      { label: "재직 중", value: `${activeCount}명`, sub: "근무 가능 인원", Icon: UserCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
      { label: "휴직중", value: `${leaveCount}명`, sub: "휴직 등록 인원", Icon: UserMinus, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    ];
  }, [list]);

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
    setForm({ ...STAFF_EMPTY });
    setEditId(null);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (staff: StaffRow) => {
    setForm(toStaffForm(staff));
    setEditId(staff.id);
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setErrors({});
  };

  const updateForm = <K extends keyof StaffForm>(key: K, value: StaffForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => current[key] ? { ...current, [key]: "" } : current);
  };

  const deleteRow = async (staff: StaffRow) => {
    const previous = list;
    setList(current => current.filter(item => item.id !== staff.id));
    try {
      await deleteStaff(staff);
    } catch (error) {
      console.error("직원 데이터 삭제 실패:", error);
      setLoadError("화면에서는 삭제됐지만 Firebase 삭제에 실패했습니다.");
      setList(previous);
    }
  };

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!form.name.trim()) nextErrors.name = "이름을 입력하세요";
    if (!form.birth.trim()) nextErrors.birth = "생년월일을 입력하세요";
    if (!form.phone.trim()) nextErrors.phone = "연락처를 입력하세요";
    if (!form.hireDate.trim()) nextErrors.hireDate = "입사일을 입력하세요";
    return nextErrors;
  };

  const submitForm = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (editId !== null) {
      const target = list.find(staff => staff.id === editId);
      if (!target) return;
      const updated: StaffRow = { ...target, ...form };
      setList(current => current.map(staff => staff.id === editId ? updated : staff));
      try {
        await updateStaff(updated);
      } catch (error) {
        console.error("직원 데이터 수정 실패:", error);
        setLoadError("화면에는 수정됐지만 Firebase 저장에 실패했습니다.");
      }
    } else {
      try {
        const created = await addStaff(form);
        setList(current => [...current, created]);
      } catch (error) {
        console.error("직원 데이터 저장 실패:", error);
        setLoadError("직원 등록에 실패했습니다.");
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
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">직원(보호사) 관리</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">직원 정보와 재직 상태를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              className="w-56 pl-9 pr-3 py-1.5 bg-white border border-border rounded-lg text-[13px] focus:outline-none focus:border-primary transition-colors"
              placeholder="이름 · 직책 · 팀 검색"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <button onClick={() => setEditMode(mode => !mode)} className={`px-3 py-1.5 text-[13px] font-medium rounded-lg border transition-colors ${editMode ? "bg-slate-900 text-white border-slate-900" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}>
            편집
          </button>
          <button onClick={openNew} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            직원 등록
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

      <div className="mb-3 flex gap-1.5">
        {POSITIONS.map(position => (
          <button
            key={position}
            onClick={() => setPosFilter(position)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${posFilter === position ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}
          >
            {position}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[13px] font-semibold text-foreground">직원 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-muted/60">
                <th className="px-5 py-2.5 text-left font-semibold text-muted-foreground">{sortButton("이름", "name")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("성별", "gender")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("생년월일", "birth")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("직책", "position")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("소속팀", "department")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("재직상태", "status")}</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("입사일", "hireDate")}</th>
                {editMode && <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground w-24">관리</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(staff => (
                <tr key={staff.firestoreId ?? staff.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-2.5 font-medium text-foreground">{staff.name}</td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{staff.gender}</td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{staff.birth}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${posStyle(staff.position)}`}>{staff.position}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{staff.department}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle(staff.status)}`}>{staff.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{staff.hireDate}</td>
                  {editMode && (
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(staff)} className="px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted hover:bg-slate-200 rounded transition-colors">
                          수정
                        </button>
                        <button onClick={() => deleteRow(staff)} className="px-2 py-0.5 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors">
                          삭제
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
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
              <h2 className="text-[15px] font-semibold text-foreground">{editId ? "직원 수정" : "직원 등록"}</h2>
              <button onClick={closeForm} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">이름 <span className="text-red-500">*</span></label>
                  <input className={inputCls(errors.name)} value={form.name} onChange={event => updateForm("name", event.target.value)} />
                  {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">성별</label>
                  <select className={inputCls()} value={form.gender} onChange={event => updateForm("gender", event.target.value)}>
                    <option value="여">여</option>
                    <option value="남">남</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">생년월일 <span className="text-red-500">*</span></label>
                  <input className={inputCls(errors.birth)} placeholder="1985.03.12" value={form.birth} onChange={event => updateForm("birth", event.target.value)} />
                  {errors.birth && <p className="text-[11px] text-red-500 mt-0.5">{errors.birth}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">연락처 <span className="text-red-500">*</span></label>
                  <input className={inputCls(errors.phone)} placeholder="010-0000-0000" value={form.phone} onChange={event => updateForm("phone", event.target.value)} />
                  {errors.phone && <p className="text-[11px] text-red-500 mt-0.5">{errors.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">직책</label>
                  <select className={inputCls()} value={form.position} onChange={event => updateForm("position", event.target.value)}>
                    {POSITIONS.filter(position => position !== "전체").map(position => <option key={position} value={position}>{position}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">소속팀</label>
                  <select className={inputCls()} value={form.department} onChange={event => updateForm("department", event.target.value)}>
                    {DEPARTMENTS.map(department => <option key={department} value={department}>{department}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">재직상태</label>
                  <select className={inputCls()} value={form.status} onChange={event => updateForm("status", event.target.value)}>
                    {STAFF_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">입사일 <span className="text-red-500">*</span></label>
                  <input className={inputCls(errors.hireDate)} placeholder="2021.03.01" value={form.hireDate} onChange={event => updateForm("hireDate", event.target.value)} />
                  {errors.hireDate && <p className="text-[11px] text-red-500 mt-0.5">{errors.hireDate}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">자격번호</label>
                  <input className={inputCls()} value={form.certNumber} onChange={event => updateForm("certNumber", event.target.value)} />
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
