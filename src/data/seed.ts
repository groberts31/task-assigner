import { Storage } from "./storage";
import type { Assignment, Task, User } from "./types";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function seedIfEmpty() {
  const users = Storage.getUsers();
  const tasks = Storage.getTasks();
  const assignments = Storage.getAssignments();

  // -----------------------
  // Seed users (demo)
  // -----------------------
  if (users.length === 0) {
    const now = new Date().toISOString();

    const admin: User = {
      id: id("u"),
      name: "Admin",
      email: "admin@demo.com",
      password: "Admin123!",
      role: "admin",
      status: "active",
      createdAt: now,
    };

    const emp1: User = {
      id: id("u"),
      name: "Jordan Employee",
      email: "jordan@demo.com",
      password: "Password123!",
      role: "employee",
      status: "active",
      createdAt: now,
    };

    const emp2: User = {
      id: id("u"),
      name: "Taylor Employee",
      email: "taylor@demo.com",
      password: "Password123!",
      role: "employee",
      status: "active",
      createdAt: now,
    };

    Storage.saveUsers([admin, emp1, emp2]);
  }

  // -----------------------
  // Seed tasks (Tidal Wave system task library)
  // -----------------------
  if (tasks.length === 0) {
    const now = new Date().toISOString();

    const systemTasks: Task[] = [
      // 🚗 Customer & Front-End Duties
      {
        id: id("t"),
        title: "Greet Customers",
        description:
          "Welcome customers, explain services, and create a positive first impression.",
        category: "Customer & Front-End",
        defaultDurationMins: 2,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Explain Wash Packages",
        description:
          "Describe basic, premium, and add-on services (wax, tire shine, interior detail, etc.).",
        category: "Customer & Front-End",
        defaultDurationMins: 4,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Process Payments",
        description:
          "Handle cash, credit/debit cards, and mobile payments; issue receipts and confirm totals.",
        category: "Customer & Front-End",
        defaultDurationMins: 4,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Manage Memberships",
        description:
          "Sign up new members, verify active plans, and troubleshoot basic billing issues (MVP: report complex issues to admin).",
        category: "Customer & Front-End",
        defaultDurationMins: 6,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Direct Vehicles",
        description:
          "Guide vehicles into the wash lane safely and ensure correct alignment before entering the tunnel.",
        category: "Customer & Front-End",
        defaultDurationMins: 3,
        createdBy: "system",
        createdAt: now,
      },

      // 🧽 Vehicle Cleaning & Detailing Tasks
      {
        id: id("t"),
        title: "Pre-Wash Preparation",
        description:
          "Spray bugs, mud, wheels, and heavy dirt before the vehicle enters the tunnel.",
        category: "Cleaning & Detailing",
        defaultDurationMins: 6,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Hand Washing (If Applicable)",
        description:
          "Wash exterior areas manually for express or full-service washes as required.",
        category: "Cleaning & Detailing",
        defaultDurationMins: 12,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Wheel & Tire Cleaning",
        description:
          "Scrub rims, clean tire sidewalls, and apply tire shine/protectant as needed.",
        category: "Cleaning & Detailing",
        defaultDurationMins: 10,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Interior Vacuuming",
        description:
          "Vacuum carpets, mats, seats, and trunk areas. Remove visible debris before finishing.",
        category: "Cleaning & Detailing",
        defaultDurationMins: 12,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Interior Wipe-Down",
        description:
          "Clean dashboard, center console, door panels, and cup holders; remove dust and smudges.",
        category: "Cleaning & Detailing",
        defaultDurationMins: 12,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Window Cleaning",
        description:
          "Clean interior and exterior glass for streak-free visibility; check corners and mirrors.",
        category: "Cleaning & Detailing",
        defaultDurationMins: 8,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Drying Vehicles",
        description:
          "Use microfiber towels and/or air blowers to remove water spots; focus on seams and mirrors.",
        category: "Cleaning & Detailing",
        defaultDurationMins: 10,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Final Quality Inspection",
        description:
          "Inspect for missed dirt, streaks, or leftover debris; correct issues before release to customer.",
        category: "Cleaning & Detailing",
        defaultDurationMins: 6,
        createdBy: "system",
        createdAt: now,
      },

      // ⚙️ Equipment & Facility Maintenance
      {
        id: id("t"),
        title: "Inspect Wash Equipment",
        description:
          "Check brushes, sprayers, blowers, conveyors, and safety sensors for proper operation.",
        category: "Maintenance",
        defaultDurationMins: 12,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Refill Chemicals & Supplies",
        description:
          "Replenish soaps, waxes, tire shine, towels, and cleaning solutions; verify dilution levels if applicable.",
        category: "Maintenance",
        defaultDurationMins: 12,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Clean Work Areas",
        description:
          "Sweep bays, empty trash, clean vacuum stations, and wash down floors; keep areas customer-ready.",
        category: "Maintenance",
        defaultDurationMins: 20,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Report Equipment Issues",
        description:
          "Document malfunctions and notify management/maintenance staff; include what happened and when.",
        category: "Maintenance",
        defaultDurationMins: 8,
        createdBy: "system",
        createdAt: now,
      },

      // 📋 Operations & Business Support
      {
        id: id("t"),
        title: "Manage Waiting Area",
        description:
          "Keep lobby clean, restock brochures, and monitor customer flow; keep customers informed.",
        category: "Operations",
        defaultDurationMins: 12,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Handle Customer Concerns",
        description:
          "Resolve complaints, redo washes, or issue refunds when appropriate; escalate if needed.",
        category: "Operations",
        defaultDurationMins: 10,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Open/Close Procedures",
        description:
          "Unlock/lock facility, turn equipment on/off, count cash drawers, and secure property.",
        category: "Operations",
        defaultDurationMins: 25,
        createdBy: "system",
        createdAt: now,
      },

      // ✅ Typical Daily Workflow Example (optional “bundle” tasks)
      {
        id: id("t"),
        title: "Daily Workflow: Opening Setup",
        description:
          "Opening workflow: inspect equipment, stock supplies, and set up registers.",
        category: "Workflow",
        defaultDurationMins: 30,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Daily Workflow: During Operations",
        description:
          "Operations workflow: greet customers, wash vehicles, vacuum interiors, and perform inspections.",
        category: "Workflow",
        defaultDurationMins: 60,
        createdBy: "system",
        createdAt: now,
      },
      {
        id: id("t"),
        title: "Daily Workflow: Closing Shutdown",
        description:
          "Closing workflow: clean facility, refill supplies, shut down machines, and secure money.",
        category: "Workflow",
        defaultDurationMins: 35,
        createdBy: "system",
        createdAt: now,
      },
    ];

    Storage.saveTasks(systemTasks);
  }

  // -----------------------
  // Seed assignments (demo)
  // -----------------------
  if (assignments.length === 0) {
    const employees = Storage.getUsers().filter((x: User) => x.role === "employee");
    const t = Storage.getTasks();

    if (employees.length && t.length) {
      const now = new Date().toISOString();
      const today = new Date().toISOString().slice(0, 10);

      const a: Assignment[] = [
        {
          id: id("a"),
          employeeId: employees[0].id,
          taskId: t[0].id,
          dueDate: today,
          notes: "Complete before noon.",
          status: "assigned",
          createdAt: now,
        },
        {
          id: id("a"),
          employeeId: employees[0].id,
          taskId: t[5].id,
          dueDate: today,
          notes: "Focus on wheels/bugs first.",
          status: "assigned",
          createdAt: now,
        },
      ];

      Storage.saveAssignments(a);
    }
  }
}
