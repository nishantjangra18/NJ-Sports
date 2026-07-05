"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

type AuthGateProps = {
  onLogin: (payload: { email: string; password: string }) => Promise<unknown>;
  onRegister: (payload: { name: string; email: string; password: string }) => Promise<unknown>;
  loading?: boolean;
  onBack?: () => void;
};

export function AuthGate({ onLogin, onRegister, loading = false, onBack }: AuthGateProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      if (mode === "login") await onLogin({ email, password });
      else await onRegister({ name, email, password });
      setPassword("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Authentication failed");
    }
  }

  return (
    <main className="auth-gate-root relative grid min-h-screen place-items-center overflow-hidden px-5 py-10 text-white">
      <div className="auth-gate-bg absolute inset-0" />
      <div className="auth-gate-accent absolute inset-x-0 top-0 h-1" />
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="absolute left-5 top-7 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] p-0 text-sm font-semibold text-white/78 shadow-[0_12px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:bg-white/[0.14] hover:text-white sm:top-5 sm:w-auto sm:gap-2 sm:px-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </button>
      ) : null}

      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="auth-gate-card relative grid w-[min(980px,100%)] overflow-hidden rounded-[32px] border shadow-[0_32px_110px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="relative min-h-[420px] border-b p-7 sm:p-9 lg:border-b-0 lg:border-r">
          <BrandLogo showName priority imageClassName="h-12 w-12" />
          <div className="mt-16 max-w-md">
            <div className="auth-gate-badge inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
              <Sparkles className="auth-gate-badge-icon h-4 w-4" />
              Sign in to continue
            </div>
            <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-normal text-white sm:text-6xl">
              Your football world, synced.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/64">
              Login to unlock Continue Watching, personalized For You picks, saved teams, profile preferences, and synced match progress.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={cn("h-11 rounded-full text-sm font-semibold transition", mode === item ? "auth-gate-tab-active" : "text-white/62 hover:text-white")}
              >
                {item === "login" ? "Login" : "Register"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <label className="flex h-13 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white">
                <User className="h-4 w-4 text-white/50" />
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/38" required />
              </label>
            ) : null}
            <label className="flex h-13 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white">
              <Mail className="h-4 w-4 text-white/50" />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/38" required />
            </label>
            <label className="flex h-13 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white">
              <Lock className="h-4 w-4 text-white/50" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" minLength={6} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/38" required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-white/58 transition hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </label>

            {error ? <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}

            <button type="submit" disabled={loading} className="auth-gate-submit flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-bold transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
            </button>
          </form>
        </div>
      </motion.section>
    </main>
  );
}


