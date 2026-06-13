import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Plus, Phone, X } from "lucide-react";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

const RELATIONS = ["아들", "딸", "배우자", "손자", "손녀", "며느리", "사위", "기타"];

const RELATION_COLORS: Record<string, string> = {
  아들: "bg-blue-50 text-blue-700",
  딸: "bg-pink-50 text-pink-700",
  배우자: "bg-rose-50 text-rose-700",
  손자: "bg-violet-50 text-violet-700",
  손녀: "bg-purple-50 text-purple-700",
  며느리: "bg-amber-50 text-amber-700",
  사위: "bg-emerald-50 text-emerald-700",
  기타: "bg-slate-100 text-slate-600",
};

type GuardianForm = {
  elderlyName: string;
  name: string;
  relation: string;
  address: string;
  phone: string;
};

type GuardianRow = GuardianForm & {
  id: string;
  firestoreId?: string;
};
type SortKey = "elderlyName" | "name" | "relation";
type SortDirection = "asc" | "desc";

type GuardianDoc = {
  elderlyName?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianAddress?: string;
  guardianPhone?: string;
};

type SeniorDoc = {
  name?: string;
};

const GUARDIAN_EMPTY: GuardianForm = {
  elderlyName: "",
  name: "",
  relation: "아들",
  address: "",
  phone: "",
};

const toGuardianForm = (guardian: GuardianRow): GuardianForm => ({
  elderlyName: guardian.elderlyName,
  name: guardian.name,
  relation: guardian.relation,
  address: guardian.address,
  phone: guardian.phone,
});

const mapGuardianDoc = (firestoreId: string, data: GuardianDoc): GuardianRow => ({
  id: firestoreId,
  firestoreId,
  elderlyName: data.elderlyName ?? "",
  name: data.guardianName ?? "",
  relation: data.guardianRelation ?? "기타",
  address: data.guardianAddress ?? "",
  phone: data.guardianPhone ?? "",
});

const toGuardianPayload = (guardian: GuardianForm) => ({
  elderlyName: guardian.elderlyName,
  guardianName: guardian.name,
  guardianRelation: guardian.relation,
  guardianAddress: guardian.address,
  guardianPhone: guardian.phone,
});

const sortBySeniorName = (guardians: GuardianRow[]) =>
  [...guardians].sort((a, b) => a.elderlyName.localeCompare(b.elderlyName, "ko"));

const hasGuardianKeyword = (guardian: GuardianRow, keyword: string) =>
  guardian.elderlyName.includes(keyword) ||
  guardian.name.includes(keyword) ||
  guardian.phone.includes(keyword);

export default function GuardianManagement() {
  const [list, setList] = useState<GuardianRow[]>([]);
  const [seniorNames, setSeniorNames] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<GuardianForm>({ ...GUARDIAN_EMPTY });
  const [errors, setErrors] = useState<Partial<Record<keyof GuardianForm, string>>>({});
  const [search, setSearch] = useState("");
  const [elderlySearch, setElderlySearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("elderlyName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [guardianSnapshot, seniorSnapshot] = await Promise.all([
          getDocs(collection(db, "guardians")),
          getDocs(collection(db, "seniors")),
        ]);

        const guardians = guardianSnapshot.docs.map(document =>
          mapGuardianDoc(document.id, document.data() as GuardianDoc),
        );
        const seniors = seniorSnapshot.docs
          .map(document => (document.data() as SeniorDoc).name?.trim() ?? "")
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "ko"));

        setList(sortBySeniorName(guardians));
        setSeniorNames(seniors);
      } catch (error) {
        console.error("보호자 데이터 불러오기 실패:", error);
        setLoadError("Firebase 보호자 데이터를 불러오지 못했습니다.");
      }
    };

    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim();
    const rows = keyword ? list.filter(guardian => hasGuardianKeyword(guardian, keyword)) : list;

    return [...rows].sort((a, b) => {
      const result = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "ko", {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? result : -result;
    });
  }, [list, search, sortDirection, sortKey]);

  const filteredElderlyNames = useMemo(() => {
    const keyword = elderlySearch.trim();
    if (!keyword) return seniorNames;
    return seniorNames.filter(name => name.includes(keyword));
  }, [seniorNames, elderlySearch]);

  const shouldShowSelectedElderly =
    Boolean(form.elderlyName) && !filteredElderlyNames.includes(form.elderlyName);

  const inputCls = (error?: string) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${error ? "border-red-400 focus:border-red-500" : "border-border focus:border-primary"}`;

  const updateForm = (key: keyof GuardianForm, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => current[key] ? { ...current, [key]: "" } : current);
  };

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

  const openNew = () => {
    setForm({ ...GUARDIAN_EMPTY });
    setElderlySearch("");
    setEditId(null);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (guardian: GuardianRow) => {
    setForm(toGuardianForm(guardian));
    setElderlySearch(guardian.elderlyName);
    setEditId(guardian.id);
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setErrors({});
  };

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!form.elderlyName) nextErrors.elderlyName = "어르신을 선택하세요";
    if (!form.name.trim()) nextErrors.name = "보호자 이름을 입력하세요";
    if (!form.phone.trim()) nextErrors.phone = "연락처를 입력하세요";
    return nextErrors;
  };

  const deleteRow = async (guardian: GuardianRow) => {
    const previous = list;
    setList(current => current.filter(item => item.id !== guardian.id));

    try {
      if (guardian.firestoreId) {
        await deleteDoc(doc(db, "guardians", guardian.firestoreId));
      }
    } catch (error) {
      console.error("보호자 데이터 삭제 실패:", error);
      setLoadError("화면에서는 삭제됐지만 Firebase 삭제에 실패했습니다.");
      setList(previous);
    }
  };

  const submitForm = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (editId) {
      const target = list.find(guardian => guardian.id === editId);
      if (!target) return;

      const updated: GuardianRow = { ...target, ...form };
      setList(current => sortBySeniorName(current.map(guardian => guardian.id === editId ? updated : guardian)));

      try {
        if (target.firestoreId) {
          await updateDoc(doc(db, "guardians", target.firestoreId), toGuardianPayload(form));
        }
      } catch (error) {
        console.error("보호자 데이터 수정 실패:", error);
        setLoadError("화면에서는 수정됐지만 Firebase 저장에 실패했습니다.");
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const created: GuardianRow = { id: tempId, ...form };
      setList(current => sortBySeniorName([...current, created]));

      try {
        const ref = await addDoc(collection(db, "guardians"), toGuardianPayload(form));
        setList(current => sortBySeniorName(current.map(guardian => guardian.id === tempId ? { ...guardian, id: ref.id, firestoreId: ref.id } : guardian)));
      } catch (error) {
        console.error("보호자 데이터 저장 실패:", error);
        setLoadError("화면에는 추가됐지만 Firebase 저장에 실패했습니다.");
      }
    }

    closeForm();
  };

  return (
    <div className="p-5 max-w-[1100px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">보호자 관리</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">어르신별 보호자 정보를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              className="w-52 pl-9 pr-3 py-1.5 bg-white border border-border rounded-lg text-[13px] focus:outline-none focus:border-primary transition-colors"
              placeholder="어르신 · 보호자 검색"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <button onClick={openNew} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            보호자 등록
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-700">
          {loadError}
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[13px] font-semibold text-foreground">보호자 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-muted/60">
                <th className="px-5 py-2.5 text-left font-semibold text-muted-foreground">{sortButton("어르신", "elderlyName")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{sortButton("보호자 이름", "name")}</th>
                <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground">{sortButton("관계", "relation")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">보호자 집주소</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">보호자 연락처</th>
                <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground w-20">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(guardian => (
                <tr key={guardian.firestoreId ?? guardian.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-2.5 font-medium text-foreground">{guardian.elderlyName}</td>
                  <td className="px-4 py-2.5 text-foreground">{guardian.name}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${RELATION_COLORS[guardian.relation] ?? "bg-slate-100 text-slate-600"}`}>
                      {guardian.relation}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-[11.5px]">{guardian.address || "-"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">
                    <a href={`tel:${guardian.phone}`} className="hover:text-primary transition-colors flex items-center gap-1" onClick={event => event.stopPropagation()}>
                      <Phone className="w-3 h-3" />
                      {guardian.phone}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(guardian)} className="px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted hover:bg-slate-200 rounded transition-colors">
                        수정
                      </button>
                      <button onClick={() => deleteRow(guardian)} className="px-2 py-0.5 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors">
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[13px] text-muted-foreground">검색 결과가 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[480px]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-foreground">{editId ? "보호자 수정" : "보호자 등록"}</h2>
              <button onClick={closeForm} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  어르신 <span className="text-red-500">*</span>
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    className="w-full pl-9 pr-3 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary transition-colors"
                    placeholder="어르신 이름 검색"
                    value={elderlySearch}
                    onChange={event => setElderlySearch(event.target.value)}
                  />
                </div>
                <select
                  className={inputCls(errors.elderlyName)}
                  value={form.elderlyName}
                  onChange={event => {
                    updateForm("elderlyName", event.target.value);
                    setElderlySearch(event.target.value);
                  }}
                >
                  <option value="">어르신 선택</option>
                  {shouldShowSelectedElderly && <option value={form.elderlyName}>{form.elderlyName}</option>}
                  {filteredElderlyNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  {filteredElderlyNames.length === 0 && !shouldShowSelectedElderly && (
                    <option value="" disabled>검색 결과 없음</option>
                  )}
                </select>
                {errors.elderlyName && <p className="text-[11px] text-red-500 mt-0.5">{errors.elderlyName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    보호자 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputCls(errors.name)}
                    placeholder="보호자 이름"
                    value={form.name}
                    onChange={event => updateForm("name", event.target.value)}
                  />
                  {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">관계</label>
                  <div className="flex flex-wrap gap-1.5">
                    {RELATIONS.map(relation => (
                      <button
                        key={relation}
                        type="button"
                        onClick={() => updateForm("relation", relation)}
                        className={`px-2.5 py-1 text-[11.5px] rounded-lg border transition-colors ${form.relation === relation ? "border-primary bg-blue-50 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}
                      >
                        {relation}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  보호자 연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls(errors.phone)}
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={event => updateForm("phone", event.target.value)}
                />
                {errors.phone && <p className="text-[11px] text-red-500 mt-0.5">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">보호자 집주소</label>
                <input
                  className={inputCls()}
                  placeholder="인천시 연수구 ..."
                  value={form.address}
                  onChange={event => updateForm("address", event.target.value)}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={closeForm} className="px-4 py-2 text-[13px] font-medium text-foreground bg-white border border-border rounded-lg hover:bg-muted transition-colors">
                취소
              </button>
              <button onClick={submitForm} className="px-4 py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                {editId ? "수정 완료" : "등록 완료"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
