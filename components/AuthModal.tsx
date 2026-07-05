"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onLogin: (payload: { email: string; password: string }) => Promise<unknown>;
  onRegister: (payload: { name: string; email: string; password: string }) => Promise<unknown>;
  loading?: boolean;
};

export function AuthModal({ open, onClose, onLogin, onRegister, loading = false }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
  }, [open, mode]);

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
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/78 px-4 py-8 backdrop-blur-2xl"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-10 w-[min(440px,100%)] rounded-[28px] border border-white/10 bg-[#0d0d0d] p-5 shadow-premium sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-studio-muted">NJ Sports</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal text-white">{mode === "login" ? "Welcome back" : "Create profile"}</h2>
                <p className="mt-2 text-sm leading-6 text-white/58">Sign in to sync your teams and personalize For You across devices.</p>
              </div>
              <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/15" aria-label="Close login">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["login", "register"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn("h-10 rounded-full text-sm font-semibold transition", mode === item ? "bg-white text-black" : "text-white/62 hover:text-white")}
                >
                  {item === "login" ? "Login" : "Register"}
                </button>
              ))}
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <label className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-white">
                  <User className="h-4 w-4 text-white/50" />
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/38" required />
                </label>
              ) : null}
              <label className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-white">
                <Mail className="h-4 w-4 text-white/50" />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/38" required />
              </label>
              <label className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-white">
                <Lock className="h-4 w-4 text-white/50" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" minLength={6} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/38" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-white/58 transition hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </label>

              {error ? <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}

              <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

