// client/src/App.js
import React, { useState, useEffect } from "react";

const SERVER = "http://localhost:4000";

function App() {
  const [foods, setFoods] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchState = async () => {
      try {
        const [foodsRes, approvalsRes] = await Promise.all([
          fetch(`${SERVER}/foods`).then((r) => r.json()),
          fetch(`${SERVER}/expire-approvals`, { method: "POST" }).then((r) =>
            r.json()
          ),
        ]);
        setFoods(foodsRes);
        // approvals are not stored in FE, just used for demo
        console.log("expired approvals:", approvalsRes);
      } catch (err) {
        setError("Failed to fetch data");
      }
    };
    fetchState();
    const iv = setInterval(fetchState, 2000); // update every 2s
    return () => clearInterval(iv);
  }, []);

  const requestPortion = async (foodId, by, portion) => {
    setError("");
    const res = await fetch(`${SERVER}/request-portion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodId, requestedBy: by, portionPercent: portion }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
  };

  const approvePortion = async (approvalId) => {
    setError("");
    const res = await fetch(`${SERVER}/approve-portion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalId }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
  };

  const consumePortion = async (approvalId) => {
    setError("");
    const res = await fetch(`${SERVER}/consume-portion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalId }),
    });
    await res.json();
    // For demo, just trigger a refresh
  };

  const markSpoiled = async (foodId) => {
    setError("");
    const res = await fetch(`${SERVER}/spoiled/${foodId}`, {
      method: "PUT",
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
  };

  const correctInventory = async (foodId, newRemaining) => {
    setError("");
    const res = await fetch(`${SERVER}/correct-inventory`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodId, newRemaining: Number(newRemaining) }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>FridgePolice</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <h2>Food inventory</h2>
      <ul>
        {foods.map((f) => (
          <li key={f.id}>
            <b>{f.name}</b> (owner: {f.ownerId}) –{" "}
            {f.remaining} / {f.total}%
            <br />
            <button
              onClick={() => requestPortion(f.id, "B", 25)}
              disabled={f.remaining < 25}
            >
              Request 25% (B)
            </button>
            <button
              onClick={() => requestPortion(f.id, "C", 25)}
              disabled={f.remaining < 25}
            >
              Request 25% (C)
            </button>
            {f.remaining <= 0 && (
              <button onClick={() => markSpoiled(f.id)}>
                Mark as spoiled (B ate outside app)
              </button>
            )}
            <input
              placeholder="new %"
              style={{ width: 80 }}
              onChange={(e) =>
                (e.target._value = e.target.value)
              }
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  correctInventory(f.id, e.target._value);
                }
              }}
            />
          </li>
        ))}
      </ul>

      <h2>Approvals (demo: click to approve)</h2>
      <ul>
        {[].map((a) => ( // in prod you'd fetch approvals from another endpoint
          <li key={a.id}>
            {a.requestedBy} wants {a.portionPercent}% of {a.foodId} –{" "}
            <button
              onClick={() => approvePortion(a.id)}
              disabled={a.status !== "pending"}
            >
              Approve
            </button>
            <button
              onClick={() => consumePortion(a.id)}
              disabled={a.status !== "approved"}
            >
              Mark consumed
            </button>
            (Status: {a.status})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;