// Demo mode — a self-contained, read-anything/write-nothing sandbox.
//
// When active, api.post() never touches the network: every request is served
// from the seeded fixtures below and mutations are applied in memory only.
// Nothing here reaches the real Apps Script backend, and nothing is persisted
// to the localStorage keys the real app uses (see the isDemo guards in
// authStore/dataService).
//
// Entry point is /demo. Mutations are intentionally live so a visitor can
// actually approve or deny a request and watch the queue update.

import type { ApprovedMember } from "./types.js";

const DAY = 86_400_000;

export const DEMO_MEMBER: ApprovedMember = {
  firstName: "Demo",
  lastName: "Director",
  studentId: "000000",
  team: "Westwood Overall",
  role: "admin",
  email: "demo@westwoodrobots.org",
};

const PEOPLE = [
  "A. Rivera",
  "J. Okafor",
  "M. Chen",
  "S. Patel",
  "T. Nguyen",
  "K. Alvarez",
  "R. Whitfield",
  "L. Barros",
];

// item, vendor, price, qty, category, team, status, daysAgo
type Seed = [string, string, number, number, string, string, string, number];

const SEED_ORDERS: Seed[] = [
  // ── Awaiting a human decision ────────────────────────────────────────────
  ["REV Limit Switch (2pk)", "REV Robotics", 24.99, 2, "hardware", "FRC", "Pending Review", 1],
  ["Polycarbonate Sheet 1/8in 24x48", "McMaster-Carr", 61.4, 1, "hardware", "FRC", "Pending Review", 1],
  ["PLA+ Filament 1kg", "Amazon", 22.99, 4, "hardware", "Kunai", "Pending Review", 2],
  ["Raspberry Pi 5 8GB", "Digi-Key", 80.0, 1, "software", "Slingshot", "Pending Review", 2],
  ["Outreach Banner 3x6ft", "Local Print Shop", 145.0, 1, "outreach", "Westwood Overall", "Pending Review", 3],
  ["Nitrile Gloves 100pk", "Amazon", 15.5, 3, "miscellaneous", "Atlatl", "Pending Review", 4],

  // ── Approved, not yet purchased ─────────────────────────────────────────
  ["NEO Brushless Motor V1.1", "REV Robotics", 56.0, 4, "hardware", "FRC", "Approved", 5],
  ["Through Bore Encoder", "REV Robotics", 59.0, 2, "hardware", "FRC", "Approved", 6],
  ["Anderson Powerpole 50pk", "AndyMark", 34.0, 1, "hardware", "Hunga Munga", "Approved", 7],
  ["Arduino Nano (5pk)", "Amazon", 49.5, 1, "software", "Kunai", "Approved", 8],

  // ── Ordered / in transit ────────────────────────────────────────────────
  ["MK4 Swerve Module", "WestCoast Products", 329.0, 4, "hardware", "FRC", "Ordered", 10],
  ["Limelight 3 Vision Camera", "Limelight Vision", 399.0, 1, "software", "FRC", "Ordered", 11],
  ["CANivore CAN-FD Adapter", "CTR Electronics", 159.0, 1, "hardware", "FRC", "Ordered", 12],
  ["Hex Shaft 1/2in 36in", "AndyMark", 18.6, 6, "hardware", "Slingshot", "Ordered", 13],
  ["Team Vinyl Decals", "Local Print Shop", 58.0, 1, "outreach", "Westwood Overall", "Ordered", 14],

  // ── Received ────────────────────────────────────────────────────────────
  ["4in HiGrip Wheel", "AndyMark", 14.5, 8, "hardware", "FRC", "Received", 20],
  ["Aluminum Extrusion 2x1 (4ft)", "McMaster-Carr", 43.2, 5, "hardware", "FRC", "Received", 22],
  ["Bearings 1/2in ID (20pk)", "AndyMark", 3.1, 20, "hardware", "FRC", "Received", 24],
  ["#25 Roller Chain 10ft", "AndyMark", 24.0, 2, "hardware", "Slingshot", "Received", 25],
  ["24T #25 Sprocket", "WestCoast Products", 16.4, 4, "hardware", "Slingshot", "Received", 26],
  ["Pneumatic Cylinder 1.5in Bore", "AndyMark", 47.3, 2, "hardware", "Atlatl", "Received", 28],
  ["Solenoid Valve", "AndyMark", 76.5, 1, "hardware", "Atlatl", "Received", 29],
  ["Battery Beak", "AndyMark", 89.0, 1, "hardware", "FRC", "Received", 31],
  ["Fluke 101 Multimeter", "Amazon", 59.99, 1, "hardware", "Kunai", "Received", 33],
  ["Solder Wire 63/37 1lb", "Digi-Key", 28.75, 2, "hardware", "Kunai", "Received", 35],
  ["Heat Shrink Assortment", "Amazon", 17.8, 2, "hardware", "Kunai", "Received", 36],
  ["12AWG Wire Red/Black 25ft", "Digi-Key", 32.0, 2, "hardware", "FRC", "Received", 38],
  ["Ethernet Cable 6ft (10pk)", "Amazon", 42.5, 1, "software", "FRC", "Received", 40],
  ["microSD 64GB (3pk)", "Amazon", 35.97, 1, "software", "Slingshot", "Received", 42],
  ["CAD Workstation SSD 2TB", "Amazon", 129.99, 1, "software", "Westwood Overall", "Received", 44],
  ["Safety Glasses (25pk)", "Home Depot", 70.0, 1, "miscellaneous", "Westwood Overall", "Received", 46],
  ["Tap and Die Set", "Home Depot", 67.0, 1, "hardware", "FRC", "Received", 48],
  ["Loctite 242 Threadlocker", "Home Depot", 9.85, 3, "miscellaneous", "FRC", "Received", 50],
  ["Zip Ties (500pk)", "Home Depot", 12.99, 2, "miscellaneous", "Hunga Munga", "Received", 52],
  ["Outreach T-Shirts (60)", "Local Print Shop", 510.0, 1, "outreach", "Westwood Overall", "Received", 55],
  ["Build Night Pizza", "Local Vendor", 94.0, 1, "food", "Westwood Overall", "Received", 57],
  ["Competition Travel Snacks", "Local Vendor", 120.0, 1, "food", "FRC", "Received", 60],
  ["Demo Day Refreshments", "Local Vendor", 68.4, 1, "food", "Kunai", "Received", 63],
  ["Website Hosting Renewal", "Namecheap", 96.0, 1, "software", "Westwood Overall", "Received", 66],
  ["Breadboard Jumper Kit", "Amazon", 13.25, 3, "software", "Hunga Munga", "Received", 68],

  // ── Rejected / withdrawn ────────────────────────────────────────────────
  ["Carbon Fiber Plate 12x12", "Amazon", 178.0, 2, "hardware", "Atlatl", "Denied", 18],
  ["Spare Falcon 500 Motor", "WestCoast Products", 199.99, 2, "hardware", "FRC", "Denied", 27],
  ["Duplicate Filament Order", "Amazon", 22.99, 4, "hardware", "Kunai", "Cancelled", 30],
];

const SEED_FUNDS = [
  ["money", "District STEM Grant", 4500, "Westwood Overall", 120, "Awarded"],
  ["money", "Alumni Fund Drive", 1850, "Westwood Overall", 95, "Awarded"],
  ["money", "Local Engineering Firm", 2500, "FRC", 80, "Awarded"],
  ["parts", "Machine Shop Donation", 1200, "FRC", 74, "Awarded"],
  ["money", "Car Wash Fundraiser", 640, "Kunai", 61, "Awarded"],
  ["services", "CNC Time Sponsorship", 900, "Slingshot", 52, "Awarded"],
  ["money", "Parent Booster Club", 1500, "Westwood Overall", 44, "Awarded"],
  ["money", "Regional Robotics Grant", 3000, "FRC", 33, "Pending"],
  ["parts", "Electronics Supplier Donation", 780, "Atlatl", 25, "Awarded"],
  ["money", "Community Bake Sale", 415, "Hunga Munga", 12, "Awarded"],
];

const SEED_MEMBERS: ApprovedMember[] = [
  DEMO_MEMBER,
  { firstName: "Ana", lastName: "Rivera", studentId: "100241", team: "FRC", role: "admin", email: "a.rivera@example.edu" },
  { firstName: "Jide", lastName: "Okafor", studentId: "100388", team: "FRC", role: "member", email: "j.okafor@example.edu" },
  { firstName: "Mei", lastName: "Chen", studentId: "100415", team: "Kunai", role: "member", email: "m.chen@example.edu" },
  { firstName: "Sana", lastName: "Patel", studentId: "100502", team: "Slingshot", role: "member", email: "s.patel@example.edu" },
  { firstName: "Thanh", lastName: "Nguyen", studentId: "100617", team: "Atlatl", role: "member", email: "t.nguyen@example.edu" },
  { firstName: "Kai", lastName: "Alvarez", studentId: "100733", team: "Hunga Munga", role: "member", email: "k.alvarez@example.edu" },
  { firstName: "Rae", lastName: "Whitfield", studentId: "100845", team: "FRC", role: "member", email: "r.whitfield@example.edu" },
  { firstName: "Luca", lastName: "Barros", studentId: "100961", team: "Kunai", role: "", email: "l.barros@example.edu" },
];

// Deterministic per-index ID in the same alphabet the backend uses. Math.imul
// keeps the arithmetic in 32 bits — plain `*` overflows 2^53 and every ID
// collapses to the same string. Sampling the high bits avoids the short-period
// low bits of the LCG.
function shortId(n: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  let x = (Math.imul(n + 1, 2654435761) >>> 0) || 1;
  for (let i = 0; i < 6; i++) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    out += chars.charAt((x >>> 8) % chars.length);
  }
  return out;
}

function buildOrders(): Record<string, unknown>[] {
  const now = Date.now();
  return SEED_ORDERS.map((s, i) => {
    const [item, company, price, quantity, category, team, status, daysAgo] = s;
    return {
      Item: item,
      Company: company,
      Link: "",
      Price: price,
      Quantity: quantity,
      Notes: "",
      Category: category,
      Team: team,
      Timestamp: new Date(now - daysAgo * DAY).toISOString(),
      Total: price * quantity,
      Status: status,
      Tracking: status === "Ordered" || status === "Received" ? `1Z${shortId(i)}9W` : "",
      UUID: shortId(i + 7),
      "Ordered By": PEOPLE[i % PEOPLE.length],
      rowIndex: i + 3,
    };
  });
}

function buildFunds(): Record<string, unknown>[] {
  const now = Date.now();
  return SEED_FUNDS.map((f, i) => {
    const [Type, Source, Amount, Team, daysAgo, GrantStatus] = f as [
      string, string, number, string, number, string,
    ];
    return {
      id: `demo-fund-${i}`,
      Type,
      Source,
      Amount,
      Team,
      GrantStatus,
      Date: new Date(now - daysAgo * DAY).toISOString(),
      Notes: "",
      rowIndex: i + 2,
    };
  });
}

const SEED_BUDGET: Record<string, Record<string, number>> = {
  FRC: { "Club Funds": 9200, "Personal Funds": 1400 },
  Kunai: { "Club Funds": 2600, "Personal Funds": 350 },
  Slingshot: { "Club Funds": 2100, "Personal Funds": 280 },
  Atlatl: { "Club Funds": 1800, "Personal Funds": 220 },
  "Hunga Munga": { "Club Funds": 1500, "Personal Funds": 190 },
  "Westwood Overall": { "Club Funds": 5400, "Personal Funds": 900 },
  Total: { "Club Funds": 22600, "Personal Funds": 3340 },
};

class DemoStore {
  active = $state(false);

  private orders: Record<string, unknown>[] = [];
  private funds: Record<string, unknown>[] = [];
  private members: ApprovedMember[] = [];
  private budget: Record<string, Record<string, number>> = {};
  private nextRow = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.active = sessionStorage.getItem("westwood_demo") === "1";
      if (this.active) this.reseed();
    }
  }

  reseed(): void {
    this.orders = buildOrders();
    this.funds = buildFunds();
    this.members = SEED_MEMBERS.map((m) => ({ ...m }));
    this.budget = JSON.parse(JSON.stringify(SEED_BUDGET));
    this.nextRow = this.orders.length + 3;
  }

  enable(): void {
    this.reseed();
    this.active = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("westwood_demo", "1");
    }
  }

  disable(): void {
    this.active = false;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("westwood_demo");
    }
  }

  // Mirrors the Apps Script doPost router, minus the network and the auth.
  async handle(payload: Record<string, unknown>): Promise<any> {
    // A touch of latency so optimistic writes are actually visible.
    await new Promise((r) => setTimeout(r, 220));

    const action = String(payload["action"] || "");

    switch (action) {
      case "getAllData":
        return {
          orders: this.orders,
          funds: this.funds,
          budget: this.budget,
          members: this.members,
        };

      case "getOrders":
        return this.orders;

      case "getSelf":
        return { member: DEMO_MEMBER };

      case "getMembers":
        return { members: this.members };

      case "getBudget":
        return this.budget;

      case "getFunds":
        return this.funds;

      case "addOrder": {
        const price = Number(payload["price"]) || 0;
        const quantity = Number(payload["quantity"]) || 1;
        const uuid = shortId(this.nextRow);
        this.orders = [
          ...this.orders,
          {
            Item: payload["item"] || "",
            Company: payload["company"] || "",
            Link: payload["link"] || "",
            Price: price,
            Quantity: quantity,
            Notes: payload["notes"] || "",
            Category: payload["category"] || "miscellaneous",
            Team: payload["team"] || "",
            Timestamp: new Date().toISOString(),
            Total: price * quantity,
            Status: payload["status"] || "Pending Review",
            Tracking: "",
            UUID: uuid,
            "Ordered By": payload["orderedBy"] || DEMO_MEMBER.firstName,
            rowIndex: this.nextRow++,
          },
        ];
        return { success: true, uuid };
      }

      case "updateOrderStatus": {
        const rowIndex = Number(payload["rowIndex"]);
        const target = this.orders.find((o) => Number(o["rowIndex"]) === rowIndex);
        if (!target) return { error: "Invalid row" };
        const existing = String(target["UUID"] || "").trim();
        const claimed = String(payload["orderUUID"] || "").trim();
        // Same row-mismatch guard the real backend enforces.
        if (existing && claimed && existing !== claimed) return { error: "Row mismatch" };
        if (payload["newGroupUUID"]) target["UUID"] = payload["newGroupUUID"];
        if (payload["status"]) target["Status"] = payload["status"];
        if (payload["tracking"]) target["Tracking"] = payload["tracking"];
        this.orders = [...this.orders];
        return { success: true };
      }

      case "deleteOrder": {
        const uuid = String(payload["uuid"] || "");
        if (!uuid) return { error: "UUID required" };
        const before = this.orders.length;
        this.orders = this.orders.filter((o) => String(o["UUID"]) !== uuid);
        return before === this.orders.length ? { error: "ID not found" } : { success: true };
      }

      case "addFundraising":
      case "addFunds": {
        this.funds = [
          ...this.funds,
          {
            id: `demo-fund-${this.funds.length}`,
            Type: payload["type"] || "money",
            Source: payload["source"] || "",
            Amount: Number(payload["amount"]) || 0,
            Team: payload["recipient"] || payload["team"] || "",
            Date: String(payload["date"] || new Date().toISOString()),
            Notes: payload["notes"] || "",
            GrantStatus: "Awarded",
            rowIndex: this.funds.length + 2,
          },
        ];
        return { success: true };
      }

      case "updateFunding": {
        const rowIndex = Number(payload["rowIndex"]);
        const target = this.funds.find((f) => Number(f["rowIndex"]) === rowIndex);
        if (!target) return { error: "Invalid row" };
        for (const [k, v] of Object.entries(payload)) {
          if (k === "action" || k === "rowIndex") continue;
          const key = k.charAt(0).toUpperCase() + k.slice(1);
          if (key in target) target[key] = v as never;
        }
        this.funds = [...this.funds];
        return { success: true };
      }

      case "addMember": {
        this.members = [
          ...this.members,
          {
            firstName: String(payload["firstName"] || ""),
            lastName: String(payload["lastName"] || ""),
            studentId: String(payload["studentId"] || ""),
            team: String(payload["team"] || "FRC"),
            role: String(payload["role"] || ""),
            email: String(payload["email"] || ""),
          },
        ];
        return { success: true };
      }

      case "removeMember": {
        const sid = String(payload["studentId"] || "");
        this.members = this.members.filter((m) => String(m.studentId) !== sid);
        return { success: true };
      }

      case "registerSelf":
        return { success: true, member: DEMO_MEMBER, status: "approved" };

      default:
        return { error: "Invalid action: " + action };
    }
  }
}

export const demoStore = new DemoStore();
