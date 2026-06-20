// The handful of seeded people shown in the demo login picker.
// Each has a real Supabase login (password below) set up by the seed/auth step.

export const DEMO_PASSWORD = "watchpoint123";

export interface DemoPerson {
  name: string;
  email: string;
  role: string;
  group: "Residents" | "Security" | "Managers" | "Pending";
  color: string;
}

export const DEMO_PEOPLE: DemoPerson[] = [
  { name: "Chidi Nwosu", email: "chidi@example.com", role: "Resident", group: "Residents", color: "#8C9EB3" },
  { name: "Amaka Obi", email: "amaka@example.com", role: "Resident", group: "Residents", color: "#C78C80" },
  { name: "Bola Ade", email: "bola@example.com", role: "Resident", group: "Residents", color: "#809E8C" },
  { name: "Musa Bello", email: "musa@example.com", role: "Security", group: "Security", color: "#B88C66" },
  { name: "Ibrahim Sani", email: "ibrahim@example.com", role: "Security", group: "Security", color: "#9E806B" },
  { name: "Tunde Adeyemi", email: "tunde@example.com", role: "Manager", group: "Managers", color: "#2E5E45" },
  { name: "Mrs. Okoro", email: "okoro@example.com", role: "Manager", group: "Managers", color: "#4D7361" },
  { name: "Ngozi Eze", email: "ngozi@example.com", role: "Pending", group: "Pending", color: "#D1BC8C" },
];

export const DEMO_GROUPS: DemoPerson["group"][] = ["Residents", "Security", "Managers", "Pending"];
