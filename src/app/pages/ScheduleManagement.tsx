import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import {
  addProgram,
  deleteProgram,
  fetchPrograms,
  updateProgram,
  type ProgramCategory,
  type ProgramForm,
  type ProgramRow,
} from "../../firebase/programsList";

const CATEGORIES: ProgramCategory[] = ["프로그램", "행사", "기타"];
const CATEGORY_STYLE: Record<ProgramCategory, { dot: string; badge: string; light: string }> = {
  프로그램: { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700", light: "bg-blue-50 border-blue-200" },
  행사: { dot: "bg-pink-500", badge: "bg-pink-100 text-pink-700", light: "bg-pink-50 border-pink-200" },
  기타: { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600", light: "bg-slate-50 border-slate-200" },
};
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const EVENT_EMPTY: ProgramForm = {
  date: "",
  time: "",
  title: "",
  category: "프로그램",
  staff: "",
  description: "",
};

const pad = (value: number) => String(value).padStart(2, "0");
const dateStr = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

const buildCalendarCells = (year: number, month: number) => {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevDays = new Date(year, month - 1, 0).getDate();
  const cells: { day: number; cur: boolean }[] = [];

  for (let index = firstDay - 1; index >= 0; index -= 1) {
    cells.push({ day: prevDays - index, cur: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, cur: true });
  }
  while (cells.length < 42) {
    cells.push({ day: cells.length - firstDay - daysInMonth + 1, cur: false });
  }

  return cells;
};

const toProgramForm = (event: ProgramRow): ProgramForm => ({
  date: event.date,
  time: event.time,
  title: event.title,
  category: event.category,
  staff: event.staff,
  description: event.description,
});

const sortEventsByTime = (events: ProgramRow[]) =>
  [...events].sort((a, b) => a.time.localeCompare(b.time));

export default function ScheduleManagement() {
  const today = new Date();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);
  const [events, setEvents] = useState<ProgramRow[]>([]);
  const [selectedDate, setSelectedDate] = useState("2026-06-09");
  const [catFilter, setCatFilter] = useState<"전체" | ProgramCategory>("전체");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProgramForm>({ ...EVENT_EMPTY });
  const [errors, setErrors] = useState<Partial<Record<keyof ProgramForm, string>>>({});
  const [loadError, setLoadError] = useState("");
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        setLoadError("");
        setEvents(await fetchPrograms());
      } catch (error) {
        console.error("일정 데이터 불러오기 실패:", error);
        setLoadError("Firebase 일정 데이터를 불러오지 못했습니다.");
      }
    };

    loadPrograms();
  }, []);

  const navigate = (delta: number) => {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const selectMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setSelectedDate(dateStr(nextYear, nextMonth, 1));
    setShowMonthPicker(false);
  };

  const cells = useMemo(() => buildCalendarCells(year, month), [month, year]);

  const selectedEvents = useMemo(() => {
    return sortEventsByTime(
      events.filter(event => event.date === selectedDate && (catFilter === "전체" || event.category === catFilter)),
    );
  }, [catFilter, events, selectedDate]);

  const eventsOnDate = (date: string) => events.filter(event => event.date === date);

  const openNew = () => {
    setForm({ ...EVENT_EMPTY, date: selectedDate });
    setEditId(null);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (event: ProgramRow) => {
    setForm(toProgramForm(event));
    setEditId(event.id);
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setErrors({});
  };

  const updateForm = <K extends keyof ProgramForm>(key: K, value: ProgramForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => current[key] ? { ...current, [key]: "" } : current);
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof ProgramForm, string>> = {};
    if (!form.date) nextErrors.date = "날짜를 선택하세요";
    if (!form.time) nextErrors.time = "시간을 입력하세요";
    if (!form.title.trim()) nextErrors.title = "제목을 입력하세요";
    return nextErrors;
  };

  const submitForm = async () => {
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (editId !== null) {
      const target = events.find(event => event.id === editId);
      if (!target) return;
      const updated: ProgramRow = { ...target, ...form };
      setEvents(current => current.map(event => event.id === editId ? updated : event));
      try {
        await updateProgram(updated);
      } catch (error) {
        console.error("일정 수정 실패:", error);
        setLoadError("화면에는 수정됐지만 Firebase 저장에 실패했습니다.");
      }
    } else {
      try {
        const created = await addProgram(form);
        setEvents(current => [...current, created]);
      } catch (error) {
        console.error("일정 등록 실패:", error);
        setLoadError("일정 등록에 실패했습니다.");
      }
    }

    closeForm();
  };

  const inputCls = (error?: string) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${error ? "border-red-400 focus:border-red-500" : "border-border focus:border-primary"}`;

  const removeEvent = async (event: ProgramRow) => {
    const previous = events;
    setEvents(current => current.filter(item => item.id !== event.id));
    try {
      await deleteProgram(event);
    } catch (error) {
      console.error("일정 삭제 실패:", error);
      setLoadError("화면에서는 삭제됐지만 Firebase 삭제에 실패했습니다.");
      setEvents(previous);
    }
  };

  return (
    <div className="p-5 max-w-[1300px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">일정 · 프로그램 관리</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">월별 일정과 프로그램을 관리합니다</p>
        </div>
        <button onClick={openNew} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
          <Plus className="w-3.5 h-3.5" />
          일정 등록
        </button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-700">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-[1fr_360px] gap-4">
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative">
              <button onClick={() => setShowMonthPicker(value => !value)} className="text-[15px] font-semibold text-foreground inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                {year}년 {month}월
              </button>
              {showMonthPicker && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 w-72 rounded-xl border border-border bg-white shadow-lg p-3">
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {[year - 1, year, year + 1].map(optionYear => (
                      <button key={optionYear} onClick={() => selectMonth(optionYear, month)} className={`px-2 py-1.5 text-[12px] rounded-lg ${optionYear === year ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                        {optionYear}년
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(optionMonth => (
                      <button key={optionMonth} onClick={() => selectMonth(year, optionMonth)} className={`px-2 py-1.5 text-[12px] rounded-lg ${optionMonth === month ? "bg-slate-900 text-white" : "hover:bg-muted text-muted-foreground"}`}>
                        {optionMonth}월
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-border bg-muted/50">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-2 text-center text-[12px] font-semibold text-muted-foreground">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, index) => {
              const dayDate = cell.cur ? dateStr(year, month, cell.day) : "";
              const dayEvents = cell.cur ? eventsOnDate(dayDate).slice(0, 3) : [];
              const isSelected = dayDate === selectedDate;
              const isToday = cell.cur && dayDate === dateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
              return (
                <button
                  key={`${cell.cur ? "cur" : "other"}-${index}`}
                  onClick={() => cell.cur && setSelectedDate(dayDate)}
                  className={`min-h-[104px] border-r border-b border-border p-2 text-left align-top transition-colors ${cell.cur ? "hover:bg-blue-50/50" : "bg-slate-50 text-muted-foreground"} ${isSelected ? "bg-blue-50" : ""}`}
                >
                  <div className={`text-[12px] font-semibold mb-1 ${isToday ? "text-primary" : cell.cur ? "text-foreground" : "text-muted-foreground"}`}>
                    {cell.day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map(event => (
                      <div key={event.id} className={`truncate rounded px-1.5 py-0.5 text-[10px] border ${CATEGORY_STYLE[event.category].light}`}>
                        {event.time} {event.title}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-[13px] font-semibold text-foreground">{selectedDate} 일정</h2>
          </div>
          <div className="px-5 py-3 border-b border-border flex gap-1.5">
            {(["전체", ...CATEGORIES] as const).map(category => (
              <button key={category} onClick={() => setCatFilter(category)} className={`px-2.5 py-1 text-[11.5px] rounded-lg border transition-colors ${catFilter === category ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                {category}
              </button>
            ))}
          </div>
          <div className="divide-y divide-border">
            {selectedEvents.map(event => (
              <div key={event.id} className="px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <span className={`mt-1 w-2 h-2 rounded-full ${CATEGORY_STYLE[event.category].dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-muted-foreground tabular-nums">{event.time}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_STYLE[event.category].badge}`}>
                        {event.category}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-foreground">{event.title}</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">{event.staff || "-"}</p>
                    {event.description && <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">{event.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(event)} className="px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted hover:bg-slate-200 rounded transition-colors">
                      수정
                    </button>
                    <button onClick={() => removeEvent(event)} className="px-2 py-0.5 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors">
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {selectedEvents.length === 0 && <p className="py-10 text-center text-[12px] text-muted-foreground">등록된 일정이 없습니다</p>}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[500px]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-foreground">{editId ? "일정 수정" : "일정 등록"}</h2>
              <button onClick={closeForm} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">날짜 <span className="text-red-500">*</span></label>
                  <input type="date" className={inputCls(errors.date)} value={form.date} onChange={event => updateForm("date", event.target.value)} />
                  {errors.date && <p className="text-[11px] text-red-500 mt-0.5">{errors.date}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">시간 <span className="text-red-500">*</span></label>
                  <input type="time" className={inputCls(errors.time)} value={form.time} onChange={event => updateForm("time", event.target.value)} />
                  {errors.time && <p className="text-[11px] text-red-500 mt-0.5">{errors.time}</p>}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">제목 <span className="text-red-500">*</span></label>
                <input className={inputCls(errors.title)} value={form.title} onChange={event => updateForm("title", event.target.value)} />
                {errors.title && <p className="text-[11px] text-red-500 mt-0.5">{errors.title}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">분류</label>
                  <select className={inputCls()} value={form.category} onChange={event => updateForm("category", event.target.value as ProgramCategory)}>
                    {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">담당자</label>
                  <input className={inputCls()} value={form.staff} onChange={event => updateForm("staff", event.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">내용</label>
                <textarea className={`${inputCls()} resize-none`} rows={3} value={form.description} onChange={event => updateForm("description", event.target.value)} />
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
