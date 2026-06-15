export type Rol = "sistema" | "admin" | "encargado" | "colaborador";

export interface HelpStep {
  number: number;
  description: string;
  image?: string;
  note?: string;
}

export interface HelpSection {
  id: string;
  title: string;
  steps: HelpStep[];
}

export interface HelpContent {
  title: string;
  sections: HelpSection[];
}

export type HelpRegistry = Record<string, Partial<Record<Rol, HelpContent>>>;
