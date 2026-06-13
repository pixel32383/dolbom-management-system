import {
  BarChart3,
  Bell,
  Bus,
  CalendarDays,
  Car,
  ClipboardList,
  Heart,
  LayoutDashboard,
  MapPin,
  Pill,
  Settings,
  UserCheck,
  UserCog,
  Users,
  UtensilsCrossed,
} from "lucide-react";

export function buildNavGroups(counts: {
  elderly: number;
  transport: number;
  absentToday: number;
  notices: number;
  pendingMedicinePeople: number;
}) {
  return [
    {
      items: [{ label: "대시보드", icon: LayoutDashboard, badge: null }],
    },
    {
      heading: "이용자 관리",
      items: [
        { label: "어르신 관리", icon: Users, badge: String(counts.elderly) },
        { label: "보호자 관리", icon: UserCheck, badge: null },
      ],
    },
    {
      heading: "직원 관리",
      items: [
        { label: "직원(보호사) 관리", icon: UserCog, badge: null },
        { label: "송영보호사 관리", icon: Bus, badge: null },
      ],
    },
    {
      heading: "차량 · 송영",
      items: [
        { label: "차량 관리", icon: Car, badge: null },
        { label: "송영 관리", icon: MapPin, badge: String(counts.transport) },
      ],
    },
    {
      heading: "일일 운영",
      items: [
        { label: "출석 관리", icon: ClipboardList, badge: null },
        { label: "식단 관리", icon: UtensilsCrossed, badge: null },
        { label: "일정 · 프로그램", icon: CalendarDays, badge: null },
        {
          label: "복약 관리",
          icon: Pill,
          badge: counts.pendingMedicinePeople > 0 ? String(counts.pendingMedicinePeople) : null,
        },
      ],
    },
    {
      heading: "커뮤니케이션",
      items: [{ label: "공지 · 알림 관리", icon: Bell, badge: String(counts.notices) }],
    },
    {
      heading: "분석",
      items: [{ label: "통계 관리", icon: BarChart3, badge: null }],
    },
    {
      items: [{ label: "설정", icon: Settings, badge: null }],
    },
  ];
}

export function Sidebar({
  active,
  setActive,
  navGroups,
  adminName,
}: {
  active: string;
  setActive: (value: string) => void;
  navGroups: ReturnType<typeof buildNavGroups>;
  adminName: string;
}) {
  return (
    <aside className="w-[216px] shrink-0 flex flex-col bg-[#0D1B2E] overflow-y-auto [&::-webkit-scrollbar]:hidden">
      <div className="px-4 pt-5 pb-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shrink-0 shadow-sm">
          <Heart className="w-4 h-4 text-white fill-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold leading-tight">돌봄</p>
          <p className="text-[#4A6B8A] text-[11px] leading-tight">관리자 시스템</p>
        </div>
      </div>

      <div className="mx-4 border-t border-white/10 mb-2" />

      <nav className="flex-1 px-2.5 py-1">
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex} className={groupIndex > 0 ? "mt-3" : ""}>
            {group.heading && (
              <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#3D5A78]">
                {group.heading}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActive(item.label)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px] transition-all mb-0.5 group ${
                    isActive
                      ? "bg-blue-600 text-white font-medium shadow-sm"
                      : "text-[#7A9BB5] hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white/10 text-[#5B80A0]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <button
        onClick={() => setActive("설정")}
        className="mx-2.5 mb-4 mt-2 p-3 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center gap-2.5 hover:bg-white/[0.09] transition-colors w-[calc(100%-20px)]"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white text-[11px] font-bold">{adminName.slice(0, 1) || "관"}</span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-slate-200 text-xs font-medium truncate">{adminName || "관리자"}</p>
          <p className="text-[#4A6B8A] text-[10px] truncate">시설 관리자</p>
        </div>
        <Settings className="w-3.5 h-3.5 text-[#3D5A78] shrink-0" />
      </button>
    </aside>
  );
}
