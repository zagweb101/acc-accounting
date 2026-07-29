"use client";

function redirectToLogin() {
  localStorage.clear();
  window.dispatchEvent(new CustomEvent("auth:expired"));
  window.location.href = "/login";
}

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401) {
    redirectToLogin();
    throw new Error("Session expired");
  }
  return res;
}

export function setupGlobalFetch() {
  if (typeof window === "undefined") return;
  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await orig(input, init);
    if (res.status === 401) {
      redirectToLogin();
      throw new Error("Session expired");
    }
    return res;
  };
}
