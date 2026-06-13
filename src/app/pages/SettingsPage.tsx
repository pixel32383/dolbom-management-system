import { useEffect, useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { fetchSetting, saveSetting, DEFAULT_SETTING, type SettingRow } from "../../firebase/settingList";

const inputCls = "w-full max-w-xs px-3 py-1.5 text-[13px] border border-border rounded-lg focus:outline-none focus:border-primary transition-colors";

const ADMIN_FIELDS = [
  { label: "관리자명", key: "adminName" },
  { label: "연락처", key: "adminPhone" },
  { label: "이메일", key: "adminEmail" },
] as const;

const FACILITY_FIELDS = [
  { label: "시설명", key: "facilityName" },
  { label: "운영시간", key: "operatingHours" },
  { label: "정원", key: "capacity" },
] as const;

const NOTIFICATION_SETTINGS = [
  {
    title: "긴급공지 알림",
    description: "긴급 공지가 있을 때 화면 오른쪽에 알림을 표시합니다",
    key: "notifUrgent",
  },
  {
    title: "일정 알림",
    description: "오늘 일정과 프로그램 알림을 화면 오른쪽에 표시합니다",
    key: "notifSchedule",
  },
] as const;

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden mb-4">
    <div className="px-5 py-3.5 border-b border-border">
      <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
    </div>
    <div className="px-5 py-4 space-y-4">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center gap-4">
    <label className="w-28 shrink-0 text-[12.5px] font-medium text-muted-foreground">{label}</label>
    <div className="flex-1">{children}</div>
  </div>
);

const SettingsInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <Field label={label}>
    <input className={inputCls} value={value} onChange={event => onChange(event.target.value)} />
  </Field>
);

const Toggle = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => (
  <button
    type="button"
    aria-pressed={value}
    onClick={() => onChange(!value)}
    className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-emerald-500" : "bg-slate-200"}`}
  >
    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
  </button>
);

const NotificationRow = ({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <div className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${value ? "border-emerald-200 bg-emerald-50/70" : "border-border bg-slate-50"}`}>
    <div>
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="text-[11.5px] text-muted-foreground mt-0.5">{description}</p>
      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${value ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
        {value ? "활성화" : "비활성화"}
      </span>
    </div>
    <Toggle value={value} onChange={onChange} />
  </div>
);

export default function SettingsPage({ onLogout }: { onLogout?: () => void }) {
  const [setting, setSetting] = useState<SettingRow>(DEFAULT_SETTING);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetchSetting()
      .then(setSetting)
      .catch(error => {
        console.error("설정 정보 불러오기 실패:", error);
        setLoadError("Firebase 설정 정보를 불러오지 못했습니다.");
      });
  }, []);

  const updateSetting = <K extends keyof SettingRow>(key: K, value: SettingRow[K]) => {
    setSetting(current => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setLoadError("");
      await saveSetting(setting);
      window.dispatchEvent(new CustomEvent("settings-updated", { detail: setting }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("설정 정보 저장 실패:", error);
      setLoadError("Firebase에 설정 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 max-w-[720px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground tracking-tight">설정</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">시설 정보와 관리자 계정 설정을 관리합니다</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-1.5 text-[13px] font-medium rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-60 ${saved ? "bg-emerald-500 text-white" : "bg-primary text-white hover:bg-blue-700"}`}
        >
          {saving ? "저장 중..." : saved ? "저장됨" : "변경사항 저장"}
        </button>
      </div>

      {loadError && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-[12px] border border-red-100">
          {loadError}
        </div>
      )}

      <Section title="관리자 계정">
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xl font-bold">{setting.adminName.slice(0, 1) || "관"}</span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">{setting.adminName}</p>
            <p className="text-[12px] text-muted-foreground">시설 관리자</p>
          </div>
        </div>
        {ADMIN_FIELDS.map(field => (
          <SettingsInput
            key={field.key}
            label={field.label}
            value={setting[field.key]}
            onChange={value => updateSetting(field.key, value)}
          />
        ))}
      </Section>

      <Section title="시설 정보">
        {FACILITY_FIELDS.map(field => (
          <SettingsInput
            key={field.key}
            label={field.label}
            value={setting[field.key]}
            onChange={value => updateSetting(field.key, value)}
          />
        ))}
      </Section>

      <Section title="알림 설정">
        {NOTIFICATION_SETTINGS.map(item => (
          <NotificationRow
            key={item.key}
            title={item.title}
            description={item.description}
            value={setting[item.key]}
            onChange={value => updateSetting(item.key, value)}
          />
        ))}
      </Section>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-[13px] font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
