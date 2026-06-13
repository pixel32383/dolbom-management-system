import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { DEFAULT_SETTING, fetchSetting, type SettingRow } from "../../firebase/settingList";
import { fetchNotifications, type NotificationRow } from "../../firebase/notificationsList";
import { fetchPrograms, type ProgramRow } from "../../firebase/programsList";

export default function GlobalAlerts({
  onNavigate,
  currentPage,
}: {
  onNavigate: (page: string) => void;
  currentPage: string;
}) {
  const [setting, setSetting] = useState<SettingRow>(DEFAULT_SETTING);
  const [notices, setNotices] = useState<NotificationRow[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);

  const refreshSetting = () => {
    fetchSetting()
      .then(setSetting)
      .catch((error) => {
        console.error("전역 알림 설정 불러오기 실패:", error);
      });
  };

  useEffect(() => {
    refreshSetting();
    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SettingRow>).detail;
      if (detail) setSetting(detail);
      else refreshSetting();
    };

    window.addEventListener("settings-updated", handleSettingsUpdated);
    return () => window.removeEventListener("settings-updated", handleSettingsUpdated);
  }, []);

  useEffect(() => {
    if (!setting.notifUrgent) {
      setNotices([]);
      return;
    }

    fetchNotifications()
      .then(setNotices)
      .catch((error) => {
        console.error("전역 긴급 공지 불러오기 실패:", error);
      });
  }, [setting.notifUrgent]);

  useEffect(() => {
    if (!setting.notifSchedule) {
      setPrograms([]);
      return;
    }

    fetchPrograms()
      .then(setPrograms)
      .catch((error) => {
        console.error("전역 일정 알림 불러오기 실패:", error);
      });
  }, [setting.notifSchedule]);

  const isAttendancePage = currentPage === "출석 관리" || currentPage.includes("異쒖꽍");
  const showUrgentAlerts = setting.notifUrgent && !isAttendancePage;
  const urgentNotices = notices.filter((notice) => notice.urgent).slice(0, 3);
  const scheduleItems = programs.slice(0, 4);

  if (!showUrgentAlerts && !setting.notifSchedule) return null;

  return (
    <div className="hidden 2xl:block fixed right-5 top-24 w-72 space-y-3 z-20">
      {showUrgentAlerts && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-red-100 bg-red-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="text-[13px] font-semibold text-red-700">긴급 공지 알림</h2>
            </div>
            <button onClick={() => onNavigate("공지 · 알림 관리")} className="text-[11px] font-medium text-red-500 hover:text-red-700">
              보기
            </button>
          </div>
          <div className="divide-y divide-border">
            {urgentNotices.length > 0 ? urgentNotices.map((notice) => (
              <button
                key={notice.id}
                onClick={() => onNavigate("공지 · 알림 관리")}
                className="w-full px-4 py-3 text-left hover:bg-red-50/40 transition-colors"
              >
                <p className="text-[12.5px] font-medium text-foreground leading-snug line-clamp-2">{notice.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{notice.date}</p>
              </button>
            )) : (
              <div className="px-4 py-4 text-[12px] text-muted-foreground">표시할 긴급 공지가 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {setting.notifSchedule && (
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-blue-100 bg-blue-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              <h2 className="text-[13px] font-semibold text-blue-700">일정 알림</h2>
            </div>
            <button onClick={() => onNavigate("일정 · 프로그램")} className="text-[11px] font-medium text-blue-500 hover:text-blue-700">
              보기
            </button>
          </div>
          <div className="divide-y divide-border">
            {scheduleItems.length > 0 ? scheduleItems.map((program) => (
              <button
                key={program.firestoreId ?? program.id}
                onClick={() => onNavigate("일정 · 프로그램")}
                className="w-full px-4 py-3 text-left hover:bg-blue-50/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-blue-600 tabular-nums">{program.time}</span>
                  <span className="text-[10px] text-muted-foreground">{program.date}</span>
                </div>
                <p className="text-[12.5px] font-medium text-foreground leading-snug line-clamp-2">{program.title}</p>
              </button>
            )) : (
              <div className="px-4 py-4 text-[12px] text-muted-foreground">표시할 일정이 없습니다.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
