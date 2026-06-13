import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import GlobalAlerts from "./layout/GlobalAlerts";
import { Header } from "./layout/Header";
import { Sidebar, buildNavGroups } from "./layout/Sidebar";
import AttendanceManagement from "./pages/AttendanceManagement";
import Dashboard from "./pages/Dashboard";
import DietManagement from "./pages/DietManagement";
import ElderlyManagement from "./pages/ElderlyManagement";
import GuardianManagement from "./pages/GuardianManagement";
import LoginPage from "./pages/LoginPage";
import MedicationManagement from "./pages/MedicationManagement";
import NoticeManagement from "./pages/NoticeManagement";
import ScheduleManagement from "./pages/ScheduleManagement";
import SettingsPage from "./pages/SettingsPage";
import StaffManagement from "./pages/StaffManagement";
import StatsManagement from "./pages/StatsManagement";
import TransportCaregiverManagement from "./pages/TransportCaregiverManagement";
import TransportManagement from "./pages/TransportManagement";
import VehicleManagement from "./pages/VehicleManagement";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "../firebase/notificationsList";
import { fetchTransports } from "../firebase/transportsList";
import { fetchMedicineLogs } from "../firebase/medicinesList";
import { DEFAULT_SETTING, fetchSetting, type SettingRow } from "../firebase/settingList";

const MEDICINE_TODAY_STR = "2026-06-09";

export default function App() {
  const [activeNav, setActiveNav] = useState("대시보드");
  const [elderlyCount, setElderlyCount] = useState(0);
  const [activeTransportCount, setActiveTransportCount] = useState(0);
  const [pendingMedicinePeopleCount, setPendingMedicinePeopleCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [setting, setSetting] = useState<SettingRow>(DEFAULT_SETTING);
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("carecenter-auth") === "true");

  const readIds = new Set(notifications.filter((notice) => notice.read).map((notice) => notice.id));

  const markRead = (id: string) => {
    const target = notifications.find((notice) => notice.id === id);
    if (!target || target.read) return;

    const updated = { ...target, read: true };
    setNotifications((prev) => prev.map((notice) => notice.id === id ? updated : notice));
    markNotificationRead(updated).catch((error) => {
      console.error("공지/알림 읽음 저장 실패:", error);
      setNotifications((prev) => prev.map((notice) => notice.id === id ? target : notice));
    });
  };

  const markAllRead = () => {
    const previous = notifications;
    const updated = notifications.map((notice) => ({ ...notice, read: true }));
    setNotifications(updated);
    markAllNotificationsRead(updated).catch((error) => {
      console.error("공지/알림 전체 읽음 저장 실패:", error);
      setNotifications(previous);
    });
  };

  useEffect(() => {
    fetchNotifications()
      .then(setNotifications)
      .catch((error) => {
        console.error("공지/알림 목록 불러오기 실패:", error);
      });
  }, []);

  useEffect(() => {
    fetchSetting()
      .then(setSetting)
      .catch((error) => {
        console.error("설정 정보 불러오기 실패:", error);
      });

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SettingRow>).detail;
      if (detail) setSetting(detail);
    };

    window.addEventListener("settings-updated", handleSettingsUpdated);
    return () => window.removeEventListener("settings-updated", handleSettingsUpdated);
  }, []);

  useEffect(() => {
    getDocs(collection(db, "seniors"))
      .then((snapshot) => {
        setElderlyCount(snapshot.docs.filter((document) => {
          const data = document.data() as { name?: string };
          return Boolean(data.name?.trim());
        }).length);
      })
      .catch((error) => {
        console.error("어르신 개수 불러오기 실패:", error);
      });
  }, []);

  useEffect(() => {
    fetchTransports()
      .then((runs) => {
        setActiveTransportCount(runs.filter((run) => run.status === "운행중").length);
      })
      .catch((error) => {
        console.error("송영 운행중 개수 불러오기 실패:", error);
      });
  }, []);

  useEffect(() => {
    fetchMedicineLogs(MEDICINE_TODAY_STR)
      .then((logs) => {
        const pendingPeople = new Set(
          logs
            .filter((log) => log.date === MEDICINE_TODAY_STR && log.status === "미복용")
            .map((log) => log.elderlyId)
        ).size;
        setPendingMedicinePeopleCount(pendingPeople);
      })
      .catch((error) => {
        console.error("복약 미복용 인원 불러오기 실패:", error);
      });
  }, []);

  const navGroups = buildNavGroups({
    elderly: elderlyCount,
    transport: activeTransportCount,
    absentToday: 0,
    notices: notifications.filter((notice) => !notice.read).length,
    pendingMedicinePeople: pendingMedicinePeopleCount,
  });

  const handleLogin = (keepLoggedIn: boolean) => {
    if (keepLoggedIn) {
      localStorage.setItem("carecenter-auth", "true");
    } else {
      localStorage.removeItem("carecenter-auth");
    }
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("carecenter-auth");
    setIsLoggedIn(false);
    setActiveNav("대시보드");
  };

  const renderPage = () => {
    switch (activeNav) {
      case "대시보드":
        return <Dashboard onNavigate={setActiveNav} />;
      case "공지 · 알림 관리":
        return <NoticeManagement notices={notifications} onNoticesChange={setNotifications} readIds={readIds} markRead={markRead} />;
      case "어르신 관리":
        return <ElderlyManagement onCountChange={setElderlyCount} />;
      case "보호자 관리":
        return <GuardianManagement />;
      case "직원(보호사) 관리":
        return <StaffManagement />;
      case "송영보호사 관리":
        return <TransportCaregiverManagement />;
      case "차량 관리":
        return <VehicleManagement />;
      case "송영 관리":
        return <TransportManagement onActiveCountChange={setActiveTransportCount} />;
      case "출석 관리":
        return <AttendanceManagement />;
      case "식단 관리":
        return <DietManagement />;
      case "일정 · 프로그램":
        return <ScheduleManagement />;
      case "복약 관리":
        return <MedicationManagement onPendingPeopleChange={setPendingMedicinePeopleCount} />;
      case "통계 관리":
        return <StatsManagement />;
      case "설정":
        return <SettingsPage onLogout={handleLogout} />;
      default:
        return <Dashboard onNavigate={setActiveNav} />;
    }
  };

  if (!isLoggedIn) {
    return <LoginPage facilityName={setting.facilityName} onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar
        active={activeNav}
        setActive={setActiveNav}
        navGroups={navGroups}
        adminName={setting.adminName}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalAlerts onNavigate={setActiveNav} currentPage={activeNav} />
        <Header
          onNavigate={setActiveNav}
          readIds={readIds}
          markRead={markRead}
          markAllRead={markAllRead}
          notices={notifications}
          adminName={setting.adminName}
        />
        <main className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
