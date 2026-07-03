import type { VerifyReport } from "./types.js";

/**
 * Static shields.io endpoint payload (https://shields.io/badges/endpoint-badge)
 * written to `.ledger/badge.json` by `edt verify`. Any repo gets the viral
 * badge via raw.githubusercontent with zero infrastructure:
 *
 *   https://img.shields.io/endpoint?url=<raw.githubusercontent url to badge.json>
 *
 * The hosted per-repo badge service (img.claims-ledger.dev, Cloudflare Worker
 * reading each repo's committed ledger) supersedes this file later — same
 * message format, so READMEs migrate by swapping the URL.
 */

export interface ShieldsEndpointBadge {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
  /** claims-ledger provenance, ignored by shields */
  cacheSeconds?: number;
}

export function buildBadge(claimCount: number, report: VerifyReport): ShieldsEndpointBadge {
  const verifiable = report.fresh + report.stale;
  let message: string;
  let color: string;
  if (report.stale > 0) {
    message = `${claimCount} anchored · ${report.fresh}/${verifiable} fresh · ${report.stale} stale`;
    color = "red";
  } else if (verifiable > 0) {
    message = `${claimCount} anchored · ${report.fresh}/${verifiable} fresh`;
    color = "brightgreen";
  } else if (report.unverifiable > 0) {
    // e.g. a transcript-only ledger verified offline — honest, never green-washed
    message = `${claimCount} anchored · ${report.unverifiable} unverifiable offline`;
    color = "orange";
  } else {
    message = "no claims yet";
    color = "lightgrey";
  }
  return { schemaVersion: 1, label: "claims", message, color, cacheSeconds: 3600 };
}
