"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.ready && auth.user) router.replace("/");
  }, [auth.ready, auth.user, router]);

  return (
    <AuthGate
      onLogin={async (payload) => {
        await auth.login(payload);
        router.push("/");
      }}
      onRegister={async (payload) => {
        await auth.register(payload);
        router.push("/");
      }}
      loading={auth.isLoading}
      onBack={() => router.push("/")}
    />
  );
}

