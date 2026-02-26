import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { LockKeyhole, UserRound } from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage, login } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, setSession } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const from = (location.state as { from?: string } | null)?.from || "/";

  useEffect(() => {
    if (token) {
      navigate(from, { replace: true });
    }
  }, [token, from, navigate]);

  const loginMutation = useMutation({
    mutationFn: () => login(username.trim(), password),
    onSuccess: (payload) => {
      setSession(payload);
      toast.success("Login berhasil");
      navigate(from, { replace: true });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Login gagal"));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Username dan password wajib diisi");
      return;
    }
    loginMutation.mutate();
  };

  return (
    <main className="min-h-screen bg-surface px-4 sm:px-6">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center py-8 sm:py-10">
        <Card className="w-full translate-y-3 p-6 sm:translate-y-4 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              HIOSO Olt Management
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">User Login</h2>
            <p className="mt-1 text-sm text-slate-500">
              Masukkan kredensial untuk akses dashboard.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm">
              <span className="font-semibold text-slate-600">Username</span>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="pl-10"
                  autoComplete="username"
                  placeholder="admin"
                />
              </div>
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-semibold text-slate-600">Password</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10"
                  autoComplete="current-password"
                  placeholder="********"
                />
              </div>
            </label>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Login"}
            </Button>

            <p className="text-center text-xs text-slate-500">
              SC:{" "}
              <a
                className="font-semibold text-primary hover:underline"
                href="https://github.com/kroto69"
                target="_blank"
                rel="noreferrer"
              >
                github.com/kroto69
              </a>
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
