"use client";

import { useEffect } from "react";

const allowedExternalHosts = new Set(["youtube.com", "www.youtube.com", "youtu.be"]);

function isAllowedNavigation(input: unknown) {
  if (typeof window === "undefined") return true;

  if (input instanceof URL) return isAllowedUrl(input);
  if (typeof input !== "string") return true;

  try {
    return isAllowedUrl(new URL(input, window.location.href));
  } catch {
    return true;
  }
}

function isAllowedUrl(url: URL) {
  if (url.origin === window.location.origin) return true;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return allowedExternalHosts.has(url.hostname.toLowerCase());
}

function logBlockedNavigation(url: unknown, source: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[navigation-guard] blocked external navigation", { source, url: String(url) });
}

function guardUrl(url: unknown, source: string) {
  if (isAllowedNavigation(url)) return true;
  logBlockedNavigation(url, source);
  return false;
}

export function ExternalNavigationGuard() {
  useEffect(() => {
    const originalOpen = window.open;
    const originalAssign = window.location.assign.bind(window.location);
    const originalReplace = window.location.replace.bind(window.location);

    window.open = function guardedOpen(url?: string | URL, target?: string, features?: string) {
      if (typeof url !== "undefined" && !guardUrl(url, "window.open")) return null;
      return originalOpen.call(window, url, target, features);
    };

    try {
      window.location.assign = function guardedAssign(url: string | URL) {
        if (!guardUrl(url, "window.location.assign")) return;
        return originalAssign(url);
      };
      window.location.replace = function guardedReplace(url: string | URL) {
        if (!guardUrl(url, "window.location.replace")) return;
        return originalReplace(url);
      };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[navigation-guard] unable to patch window.location methods", error);
      }
    }

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (guardUrl(target.href, target.target === "_blank" ? "anchor[target=_blank]" : "anchor")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const handleSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form?.action) return;
      if (guardUrl(form.action, "form")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    window.addEventListener("click", handleClick, true);
    window.addEventListener("submit", handleSubmit, true);

    return () => {
      window.open = originalOpen;
      try {
        window.location.assign = originalAssign;
        window.location.replace = originalReplace;
      } catch {
        // Some browsers expose Location methods as non-writable.
      }
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}