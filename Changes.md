# Changes.md

## What FridgePolice does

FridgePolice is a roommate food‑tracking prototype that lets users:
- View shared food items with their remaining quantity.
- Request a portion of a food item.
- Approve a requested portion which then reduces the remaining quantity.
- Handle expired, spoiled, and manually corrected inventory.

The app is built as:
- React frontend (in `client/`)
- Node.js + Express backend (in `server/`)
- State is stored in memory (no real database).

---

## How each scenario is handled

### Scenario 1: Only one person gets the last 25%

- When a user requests 25%, the backend checks that `portionPercent <= food.remaining`.
- When approving, the server re‑checks the current `remaining` and rejects if the requested portion no longer fits.
- Because approvals are processed in sequence and checked against the live `remaining`, the app prevents double allocation of the same last 25%.

### Scenario 2: Expire unclaimed approvals and spoiled food

- Each approval has:
  - `status`: `"pending" | "approved" | "consumed" | "expired" | "rejected"`
  - `expiresAt`: set to 1 hour after creation.
- A background `/expire-approvals` call periodically marks old pending approvals as `"expired"`.
- When food spoils (`/spoiled/:foodId`), the backend:
  - Sets `remaining = 0` on that food.
  - Sets `status = "rejected"` on all pending approvals for that food.
- This prevents people from using old approvals on food that is already thrown away.

### Scenario 3: Distinguish identical items

- Each food item has a unique `id` and `ownerId`, even if the `name` is the same (e.g., two "ketchup" bottles).
- The UI and API always refer to a food by its `id`, so the system can distinguish between two identical‑named items from different owners.

### Scenario 4: Correct inventory when app ≠ reality

- The `/correct-inventory` endpoint allows updating `newRemaining` for any food.
- This lets a user “reconcile” the app with the real fridge if someone ate food without logging it.
- For example, if the fridge is empty but the app says 25% left, the user can set `newRemaining = 0` to correct the state.

---

## Engineering decisions and assumptions

- No authentication: all users are treated as “Roommate A/B/C” for demo purposes.
- In‑memory state: no real database; state is lost on server restart (this is acceptable for a prototype).
- Time‑based expiry: 1 hour expiry for approvals is a simple way to avoid infinite stale approvals.
- No concurrent write handling: this prototype assumes a single server process and sequential requests; in a real system you would add locks or atomic updates.
- UI is deliberately minimal: the goal is to demonstrate the logic, not build a polished product.