import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn, UserRound } from "lucide-react";

const ADMIN_ACCOUNT = {
  id: "admin",
  password: "1234",
};

const INPUT_CLASS = "w-full rounded-lg border border-border py-2 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-primary";

type LoginPageProps = {
  facilityName?: string;
  onLogin: (keepLoggedIn: boolean) => void;
};

export default function LoginPage({ facilityName, onLogin }: LoginPageProps) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState("");

  const updateAccount = (value: string) => {
    setAccount(value);
    if (error) setError("");
  };

  const updatePassword = (value: string) => {
    setPassword(value);
    if (error) setError("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (account.trim() !== ADMIN_ACCOUNT.id || password.trim() !== ADMIN_ACCOUNT.password) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다");
      return;
    }

    setError("");
    onLogin(keepLoggedIn);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 text-foreground">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight">
            {facilityName || "주간보호센터"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            관리자 계정으로 로그인하세요
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            아이디 : admin&nbsp;&nbsp; 비밀번호 : 1234
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-white p-5 shadow-sm"
        >
          <label className="mb-1 block text-[12.5px] font-medium text-muted-foreground">
            아이디
          </label>
          <div className="relative mb-3">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={INPUT_CLASS}
              value={account}
              onChange={(event) => updateAccount(event.target.value)}
              placeholder="아이디"
            />
          </div>

          <label className="mb-1 block text-[12.5px] font-medium text-muted-foreground">
            비밀번호
          </label>
          <div className="relative mb-3">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              className={INPUT_CLASS}
              value={password}
              onChange={(event) => updatePassword(event.target.value)}
              placeholder="비밀번호"
            />
          </div>

          <label className="mb-3 flex cursor-pointer items-center gap-2 text-[12.5px] text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-primary"
              checked={keepLoggedIn}
              onChange={(event) => setKeepLoggedIn(event.target.checked)}
            />
            로그인 유지
          </label>

          {error && (
            <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <LogIn className="h-4 w-4" />
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
