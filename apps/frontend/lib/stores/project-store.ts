import { create } from "zustand";

export type AgentStatus = "pending" | "running" | "complete" | "failed";

export interface AgentProgress {
  name: string;
  status: AgentStatus;
  progressPercent: number;
  message: string;
  confidenceScore: number | null;
}

interface ProjectState {
  currentProjectId: string | null;
  agents: AgentProgress[];
  isProcessing: boolean;

  setProjectId: (id: string) => void;
  updateAgent: (name: string, update: Partial<AgentProgress>) => void;
  setProcessing: (v: boolean) => void;
  reset: () => void;
}

const defaultAgents: AgentProgress[] = [
  { name: "ingest", status: "pending", progressPercent: 0, message: "", confidenceScore: null },
  { name: "transcript", status: "pending", progressPercent: 0, message: "", confidenceScore: null },
  { name: "story", status: "pending", progressPercent: 0, message: "", confidenceScore: null },
  { name: "cut", status: "pending", progressPercent: 0, message: "", confidenceScore: null },
  { name: "caption", status: "pending", progressPercent: 0, message: "", confidenceScore: null },
  { name: "effects", status: "pending", progressPercent: 0, message: "", confidenceScore: null },
  { name: "broll", status: "pending", progressPercent: 0, message: "", confidenceScore: null },
  { name: "quality", status: "pending", progressPercent: 0, message: "", confidenceScore: null },
  { name: "render", status: "pending", progressPercent: 0, message: "", confidenceScore: null },
  { name: "feedback", status: "pending", progressPercent: 0, message: "", confidenceScore: null },
];

export const useProjectStore = create<ProjectState>((set) => ({
  currentProjectId: null,
  agents: [...defaultAgents],
  isProcessing: false,

  setProjectId: (id) => set({ currentProjectId: id }),

  updateAgent: (name, update) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.name === name ? { ...a, ...update } : a
      ),
    })),

  setProcessing: (v) => set({ isProcessing: v }),

  reset: () =>
    set({
      currentProjectId: null,
      agents: [...defaultAgents],
      isProcessing: false,
    }),
}));
