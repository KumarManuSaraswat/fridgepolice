// server/index.js
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In‑memory "database"
let foods = [
  {
    id: "1",
    name: "pizza",
    total: 100,     // %
    remaining: 25,  // %
    ownerId: "A",
    createdAt: Date.now(),
  },
  {
    id: "2",
    name: "ketchup",
    total: 100,     // 1 bottle
    remaining: 100,
    ownerId: "B",
    createdAt: Date.now(),
  },
  {
    id: "3",
    name: "ketchup",
    total: 100,     // second bottle
    remaining: 100,
    ownerId: "C",
    createdAt: Date.now(),
  },
];

let approvals = [];
// approval = { id, foodId, requestedBy, portionPercent, status, createdAt, expiresAt }

// --- API endpoints ---

// GET /foods
app.get("/foods", (req, res) => {
  res.json(foods);
});

// POST /request-portion
app.post("/request-portion", (req, res) => {
  const { foodId, requestedBy, portionPercent } = req.body;

  const food = foods.find((f) => f.id === foodId);
  if (!food) return res.status(404).json({ error: "Food not found" });

  if (portionPercent > food.remaining) {
    return res.status(400).json({ error: "Request exceeds remaining quantity" });
  }

  const approval = {
    id: Date.now().toString(),
    foodId,
    requestedBy,
    portionPercent,
    status: "pending",
    createdAt: Date.now(),
    // expires after 1 hour (3600000 ms) for scenario 2
    expiresAt: Date.now() + 3600000,
  };

  approvals.push(approval);

  res.json({ approval });
});

// POST /approve-portion
app.post("/approve-portion", (req, res) => {
  const { approvalId } = req.body;

  const approval = approvals.find((a) => a.id === approvalId);
  if (!approval) return res.status(404).json({ error: "Approval not found" });
  if (approval.status !== "pending")
    return res.status(400).json({ error: "Approval not pending" });

  const food = foods.find((f) => f.id === approval.foodId);
  if (!food)
    return res.status(400).json({ error: "Food not found in inventory" });

  // Prevent double allocation of last 25% (scenario 1)
  if (approval.portionPercent > food.remaining) {
    approval.status = "rejected";
    return res.json({ approval, message: "No enough quantity left" });
  }

  food.remaining -= approval.portionPercent;
  approval.status = "approved";

  res.json({ approval, food });
});

// POST /consume-portion (if user actually eats it)
app.post("/consume-portion", (req, res) => {
  const { approvalId } = req.body;

  const approval = approvals.find((a) => a.id === approvalId);
  if (!approval) return res.status(404).json({ error: "Approval not found" });
  if (approval.status !== "approved")
    return res.status(400).json({ error: "Not approved yet" });

  // Mark as consumed (you can also delete or expire it here)
  approval.status = "consumed";

  res.json({ approval });
});

// POST /expire-approvals (background cleanup for scenario 2)
app.post("/expire-approvals", (req, res) => {
  const now = Date.now();
  const expired = approvals
    .filter((a) => a.status === "pending" && a.expiresAt < now)
    .map((a) => {
      a.status = "expired";
      return a.id;
    });

  res.json({ expiredCount: expired.length, expired });
});

// PUT /correct-inventory (scenario 4: manual correction when app ≠ reality)
app.put("/correct-inventory", (req, res) => {
  const { foodId, newRemaining } = req.body;

  const food = foods.find((f) => f.id === foodId);
  if (!food) return res.status(404).json({ error: "Food not found" });

  food.remaining = newRemaining;

  res.json({ food });
});

// PUT /spoiled (scenario 2: food thrown away despite approvals)
app.put("/spoiled/:foodId", (req, res) => {
  const { foodId } = req.params;

  const food = foods.find((f) => f.id === foodId);
  if (!food) return res.status(404).json({ error: "Food not found" });

  // Mark food as gone
  food.remaining = 0;

  // Mark all pending approvals for this food as rejected
  approvals
    .filter((a) => a.foodId === foodId && a.status === "pending")
    .forEach((a) => {
      a.status = "rejected";
    });

  res.json({ food, message: "Food marked as spoiled; pending approvals rejected" });
});

app.listen(PORT, () => {
  console.log(`FridgePolice server listening on ${PORT}`);
});