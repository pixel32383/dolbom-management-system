import { useState } from "react";
import { Bell } from "lucide-react";
import type { NotificationRow } from "../../firebase/notificationsList";

export function Header({
  onNavigate,
  readIds,
  markRead,
  markAllRead,
  notices,
  adminName,
}: {
  onNavigate: (page: string) => void;
  readIds: Set<string>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  notices: NotificationRow[];
  adminName: string;
}) {
  const [showNotice, setShowNotice] = useState(false);
  const today = new Date();
  const dateStr = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const unreadCount = notices.filter((notice) => !readIds.has(notice.id)).length;

  return (
    <header className="h-14 shrink-0 bg-white border-b border-border px-6 flex items-center gap-4 relative">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-muted-foreground">{dateStr}</p>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowNotice((value) => !value)}
          className={`relative p-2 rounded-lg transition-colors ${showNotice ? "bg-muted" : "hover:bg-muted"}`}
        >
          <Bell className="w-4.5 h-4.5 text-slate-500" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {showNotice && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowNotice(false)} />
            <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[340px] bg-white rounded-xl shadow-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-foreground">공지 · 알림</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">전체 읽음</button>
                  )}
                  <span className="text-[11px] text-muted-foreground">{notices.length}건</span>
                </div>
              </div>
              <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                {notices.map((notice) => {
                  const isRead = readIds.has(notice.id);
                  return (
                    <div
                      key={notice.id}
                      onClick={() => markRead(notice.id)}
                      className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer flex items-start gap-3"
                    >
                      <span className={`mt-0.5 shrink-0 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none ${
                        notice.urgent ? "bg-red-100 text-red-700"
                        : notice.type === "이벤트" ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                      }`}>
                        {notice.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12.5px] font-medium leading-snug ${
                          isRead ? "text-muted-foreground" : notice.urgent ? "text-red-700" : "text-foreground"
                        }`}>
                          {notice.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{notice.date.slice(5).replace(".", "/")}</p>
                      </div>
                      {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2.5 border-t border-border bg-muted/30">
                <button
                  onClick={() => {
                    setShowNotice(false);
                    onNavigate("공지 · 알림 관리");
                  }}
                  className="w-full text-[12px] text-primary font-medium hover:text-blue-700 transition-colors"
                >
                  전체 공지 보기
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => onNavigate("설정")}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center hover:opacity-80 transition-opacity"
      >
        <span className="text-white text-xs font-bold">{adminName.slice(0, 1) || "관"}</span>
      </button>
    </header>
  );
}
