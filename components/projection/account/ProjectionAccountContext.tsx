"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { ALL_ACCOUNTS } from "./account-filter";

interface ProjectionAccountState {
  selected: string;
  setSelected: (id: string) => void;
}

const ProjectionAccountContext = createContext<ProjectionAccountState>({ selected: ALL_ACCOUNTS, setSelected: () => {} });

// Client-only selection: switching account re-filters already streamed data, no server round trip.
export function ProjectionAccountProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState(ALL_ACCOUNTS);
  const value = useMemo(() => ({ selected, setSelected }), [selected]);
  return <ProjectionAccountContext.Provider value={value}>{children}</ProjectionAccountContext.Provider>;
}

export const useProjectionAccount = () => useContext(ProjectionAccountContext);
