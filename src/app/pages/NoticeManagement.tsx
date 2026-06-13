import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  addNotification,
  deleteNotification,
  updateNotification,
  type NotificationForm,
  type NotificationRow,
} from "../../firebase/notificationsList";

const NOTICE_TYPES = ["전체", "공지", "긴급", "이벤트"];
const FORM_TYPES = ["공지", "긴급", "이벤트"];

const NOTICE_EMPTY: NotificationForm = {
  title: "",
  date: "",
  type: "공지",
  urgent: false,
  content: "",
  read: false,
};

const todayString = () =>
  new Date()
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, ".")
    .replace(/\.$/, "");

const sortNotices = (notices: NotificationRow[]) =>
  [...notices].sort((a, b) => b.date.localeCompare(a.date));

const toNoticeForm = (notice: NotificationRow): NotificationForm => ({
  title: notice.title,
  date: notice.date,
  type: notice.type,
  urgent: notice.urgent,
  content: notice.content,
  read: notice.read,
});

const normalizeNoticeForm = (form: NotificationForm, fallbackDate = todayString()): NotificationForm => ({
  ...form,
  date: form.date || fallbackDate,
  urgent: form.type === "긴급" ? true : form.urgent,
});

const countByType = (notices: NotificationRow[], type: string) =>
  type === "전체" ? notices.length : notices.filter(notice => notice.type === type).length;

export default function NoticeManagement({
  notices,
  onNoticesChange,
  readIds,
  markRead,
}: {
  notices: NotificationRow[];
  onNoticesChange: (notices: NotificationRow[]) => void;
  readIds: Set<string>;
  markRead: (id: string) => void;
}) {
  const [filter, setFilter] = useState("전체");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NotificationForm>({ ...NOTICE_EMPTY });
  const [errors, setErrors] = useState<Partial<Record<keyof NotificationForm, string>>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filtered = filter === "전체" ? notices : notices.filter(notice => notice.type === filter);

  const updateForm = <K extends keyof NotificationForm>(key: K, value: NotificationForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => current[key] ? { ...current, [key]: "" } : current);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setErrors({});
  };

  const openNew = () => {
    setForm({ ...NOTICE_EMPTY, date: todayString() });
    setErrors({});
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (notice: NotificationRow) => {
    setForm(toNoticeForm(notice));
    setErrors({});
    setEditId(notice.id);
    setShowForm(true);
    setDetailId(null);
  };

  const handleDelete = async (notice: NotificationRow) => {
    const previous = notices;
    onNoticesChange(previous.filter(item => item.id !== notice.id));
    if (detailId === notice.id) setDetailId(null);

    try {
      await deleteNotification(notice);
    } catch (error) {
      console.error("공지/알림 삭제 실패:", error);
      onNoticesChange(previous);
    }
  };

  const submitForm = async () => {
    if (isSaving) return;
    const nextErrors: Partial<Record<keyof NotificationForm, string>> = {};
    if (!form.title.trim()) nextErrors.title = "제목을 입력하세요";
    if (!form.content.trim()) nextErrors.content = "내용을 입력하세요";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      if (editId) {
        const target = notices.find(notice => notice.id === editId);
        if (!target) return;

        const updated: NotificationRow = {
          ...target,
          ...normalizeNoticeForm(form, target.date || todayString()),
        };

        onNoticesChange(sortNotices(notices.map(notice => notice.id === editId ? updated : notice)));
        await updateNotification(updated);
      } else {
        const created = await addNotification({
          ...normalizeNoticeForm(form),
          read: false,
        });
        onNoticesChange(sortNotices([created, ...notices]));
      }

      closeForm();
    } catch (error) {
      console.error("공지/알림 저장 실패:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls = (error?: string) =>
    `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none transition-colors ${error ? "border-red-400 focus:border-red-500" : "border-border focus:border-primary"}`;

  const typeBadge = (type: string, urgent: boolean) => {
    const cls = urgent || type === "긴급"
      ? "bg-red-100 text-red-700"
      : type === "이벤트"
        ? "bg-blue-100 text-blue-700"
        : "bg-slate-100 text-slate-600";

    return (
      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none ${cls}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="p-5 max-w-[1100px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">공지 · 알림 관리</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">공지사항과 알림을 등록하고 관리합니다</p>
        </div>
        <button
          onClick={openNew}
          className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          공지 등록
        </button>
      </div>

      <div className="flex gap-1.5 mb-4">
        {NOTICE_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3.5 py-1.5 text-[12.5px] font-medium rounded-lg transition-colors ${filter === type ? "bg-primary text-white shadow-sm" : "bg-white border border-border text-muted-foreground hover:bg-muted"}`}
          >
            {type}
            <span className="ml-1.5 text-[10px] opacity-70">
              {countByType(notices, type)}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-[13px]">등록된 공지가 없습니다</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(notice => {
              const isRead = readIds.has(notice.id) || Boolean(notice.read);
              const isOpen = detailId === notice.id;

              return (
                <div key={notice.id} className="px-5 py-3.5 hover:bg-muted/30 transition-colors flex items-start gap-3 group">
                  <div className="mt-0.5 shrink-0">{typeBadge(notice.type, notice.urgent)}</div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      setDetailId(isOpen ? null : notice.id);
                      markRead(notice.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <p className={`text-[13px] font-medium leading-snug ${isRead ? "text-muted-foreground" : notice.urgent ? "text-red-700" : "text-foreground"}`}>
                        {notice.title}
                      </p>
                      {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{notice.date}</p>
                    {isOpen && (
                      <p className="mt-2 text-[12.5px] text-muted-foreground leading-relaxed border-t border-border pt-2">
                        {notice.content}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(notice)} className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground bg-muted hover:bg-slate-200 rounded-md transition-colors">
                      수정
                    </button>
                    <button onClick={() => handleDelete(notice)} className="px-2.5 py-1 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[500px]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-foreground">{editId ? "공지 수정" : "공지 등록"}</h2>
              <button onClick={closeForm} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls(errors.title)}
                  placeholder="공지 제목을 입력하세요"
                  value={form.title}
                  onChange={event => updateForm("title", event.target.value)}
                />
                {errors.title && <p className="text-[11px] text-red-500 mt-0.5">{errors.title}</p>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[12px] font-medium text-foreground mb-1">분류</label>
                  <select
                    className={inputCls()}
                    value={form.type}
                    onChange={event => {
                      const nextType = event.target.value;
                      updateForm("type", nextType);
                      if (nextType === "긴급") updateForm("urgent", true);
                    }}
                  >
                    {FORM_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-red-500"
                      checked={form.urgent}
                      onChange={event => updateForm("urgent", event.target.checked)}
                    />
                    <span className="text-[13px] text-muted-foreground">긴급 표시</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`${inputCls(errors.content)} resize-none`}
                  rows={4}
                  placeholder="공지 내용을 입력하세요"
                  value={form.content}
                  onChange={event => updateForm("content", event.target.value)}
                />
                {errors.content && <p className="text-[11px] text-red-500 mt-0.5">{errors.content}</p>}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={closeForm} className="px-4 py-2 text-[13px] font-medium text-foreground bg-white border border-border rounded-lg hover:bg-muted transition-colors">
                취소
              </button>
              <button
                onClick={submitForm}
                disabled={isSaving}
                className="px-4 py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-60"
              >
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
