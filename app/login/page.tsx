"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.ready && auth.user) {
      if (auth.user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    }
  }, [auth.ready, auth.user, router]);

  return (
    <AuthGate
      onLogin={async (payload) => {
        const user = await auth.login(payload);
        if (user?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }}
      onRegister={async (payload) => {
        const user = await auth.register(payload);
        if (user?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }}
      loading={auth.isLoading}
      onBack={() => router.push("/")}
    />
  );
}
