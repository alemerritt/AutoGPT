/**
 * FRED (Federal Reserve Economic Data) client, via the /api/fred proxy.
 *  - DGS10:    10-Year Treasury Constant Maturity Rate (dynamic risk-free rate)
 *  - CPIAUCSL: CPI, All Urban Consumers — used for trailing YoY inflation
 * Requires VITE_FRED_API_KEY; callers fall back to the snapshot without it.
 */
import { MacroData } from "../../types";
import { fetchJson } from "./http";

interface FredObservation {
  date: string;
  value: string; // "." for missing
}
interface FredResponse {
  observations?: FredObservation[];
}

const KEY = import.meta.env.VITE_FRED_API_KEY as string | undefined;

async function fredSeries(
  seriesId: string,
  limit: number,
): Promise<FredObservation[]> {
  if (!KEY) throw new Error("FRED: no API key configured");
  const url =
    `/api/fred/fred/series/observations?series_id=${seriesId}` +
    `&api_key=${KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = await fetchJson<FredResponse>(url);
  const obs = (data.observations ?? []).filter((o) => o.value !== ".");
  if (obs.length === 0) throw new Error(`FRED: no data for ${seriesId}`);
  return obs;
}

export async function fetchMacro(): Promise<MacroData> {
  const [dgs10, cpi] = await Promise.all([
    fredSeries("DGS10", 5),
    fredSeries("CPIAUCSL", 14), // ≥13 monthly points for YoY
  ]);

  const tenYearYield = Number(dgs10[0].value) / 100;

  // YoY inflation from the latest CPI level vs. the same month last year.
  const latest = cpi[0];
  const yearAgo = cpi.find((o) => {
    const d = new Date(o.date);
    const l = new Date(latest.date);
    return (
      d.getUTCFullYear() === l.getUTCFullYear() - 1 &&
      d.getUTCMonth() === l.getUTCMonth()
    );
  });
  if (!yearAgo) throw new Error("FRED: cannot compute CPI YoY");
  const cpiYoY = Number(latest.value) / Number(yearAgo.value) - 1;

  if (!Number.isFinite(tenYearYield) || !Number.isFinite(cpiYoY)) {
    throw new Error("FRED: non-numeric observations");
  }
  return { tenYearYield, cpiYoY, asOf: latest.date, source: "live" };
}
