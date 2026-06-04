const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  projects: {
    create: (data: Record<string, unknown>) =>
      apiFetch("/projects/", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => apiFetch(`/projects/${id}`),
    process: (id: string) =>
      apiFetch(`/projects/${id}/process`, { method: "POST" }),
    clips: (id: string) => apiFetch(`/projects/${id}/clips`),
  },

  feedback: {
    submit: (data: { project_id: string; user_input: string; clip_id?: string }) =>
      apiFetch("/feedback/", { method: "POST", body: JSON.stringify(data) }),
  },

  billing: {
    subscription: () => apiFetch("/billing/subscription"),
    usage: () => apiFetch("/billing/usage"),
  },
};
