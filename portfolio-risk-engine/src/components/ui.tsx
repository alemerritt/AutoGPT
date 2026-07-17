import { ReactNode } from "react";
import { SourceStatus } from "../types";

export function Card(props: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-4 ${props.className ?? ""}`}>
      {(props.title || props.right) && (
        <header className="mb-3 flex items-start justify-between gap-2">
          <div>
            {props.title && (
              <h2 className="text-sm font-semibold text-ink">{props.title}</h2>
            )}
            {props.subtitle && (
              <p className="mt-0.5 text-xs text-muted">{props.subtitle}</p>
            )}
          </div>
          {props.right}
        </header>
      )}
      {props.children}
    </section>
  );
}

export function StatTile(props: {
  label: string;
  value: string;
  sub?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted">
        {props.label}
      </div>
      <div
        className={`mt-1 text-ink ${props.emphasis ? "text-2xl font-semibold" : "text-xl font-medium"}`}
      >
        {props.value}
      </div>
      {props.sub && <div className="mt-0.5 text-xs text-ink-2">{props.sub}</div>}
    </div>
  );
}

/** Signed delta line for tiles: colored dot + label, never color alone. */
export function Delta(props: { value: string; direction: "up" | "down" | "flat"; note?: string }) {
  const color =
    props.direction === "up"
      ? "var(--delta-good-text)"
      : props.direction === "down"
        ? "var(--status-critical)"
        : "var(--text-muted)";
  const arrow =
    props.direction === "up" ? "▲" : props.direction === "down" ? "▼" : "•";
  return (
    <span className="tabular" style={{ color }}>
      {arrow} {props.value}
      {props.note && <span className="text-muted"> {props.note}</span>}
    </span>
  );
}

export function SourceBadge(props: { label: string; status: SourceStatus }) {
  const map: Record<SourceStatus, { text: string; color: string }> = {
    loading: { text: "loading", color: "var(--text-muted)" },
    live: { text: "LIVE", color: "var(--status-good)" },
    snapshot: { text: "SNAPSHOT", color: "var(--status-warning)" },
  };
  const s = map[props.status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
      style={{ borderColor: "var(--hairline)" }}
      title={
        props.status === "snapshot"
          ? "Live source unreachable or unkeyed — embedded snapshot data in use"
          : undefined
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.color }}
        aria-hidden
      />
      <span className="text-ink-2">{props.label}</span>
      <span className="font-semibold" style={{ color: s.color }}>
        {s.text}
      </span>
    </span>
  );
}

/** Shared tooltip chrome for the Recharts charts. */
export function TooltipShell(props: { title: string; rows: { name: string; value: string; swatch?: string }[] }) {
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-sm"
      style={{ background: "var(--surface-1)", borderColor: "var(--hairline)" }}
    >
      <div className="mb-1 font-semibold text-ink">{props.title}</div>
      {props.rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 py-0.5">
          {r.swatch && (
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: r.swatch }}
              aria-hidden
            />
          )}
          <span className="text-ink-2">{r.name}</span>
          <span className="ml-auto pl-4 tabular text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export const SERIES_COLOR: Record<string, string> = {
  NVDA: "var(--series-1)",
  ASML: "var(--series-2)",
  AMZN: "var(--series-3)",
  AMD: "var(--series-4)",
  SMH: "var(--series-5)",
  SPY: "var(--series-6)",
  OTHER: "var(--series-7)",
};
