import { useEffect, useState } from "react";
import { getActiveTipsDatabase, resetTipsRotationStart } from "../data/tips/tipsDatabases";
import "./tipsTicker.css";

function pickRandom(arr: string[]): string {
  if (!arr || arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

function stripTrailingId(s: string): string {
  return (s || "").replace(/\s*\[[^\]]+\]\s*$/, "").trim();
}

export function TipsTicker() {
  const [tip, setTip] = useState("");
  const [dbName, setDbName] = useState("");

  const setNewTip = () => {
    const active = getActiveTipsDatabase();
    setDbName(active.name);

    const picked = pickRandom(active.tips);
    setTip(stripTrailingId(picked || "Reminder: Consistency and cleanliness beat everything."));
  };

  useEffect(() => {
    // Resets the rotation start so the 7-day sequence aligns cleanly from “now”.
    // Remove this line later if you want the rotation anchor to persist forever.
    resetTipsRotationStart();

    setNewTip();
    const id = window.setInterval(setNewTip, 12000); // change tip every 12 seconds
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tw-ticker">
      <div className="tw-ticker__container">
        <div className="tw-ticker__pill" title="Current category">
          <span className="tw-ticker__dot" aria-hidden="true" />
          <span className="tw-ticker__pillText">{dbName}</span>
        </div>

        <div className="tw-ticker__viewport">
          <div className="tw-ticker__text tw-ticker__center">{tip}</div>
        </div>
      </div>
    </div>
  );
}
