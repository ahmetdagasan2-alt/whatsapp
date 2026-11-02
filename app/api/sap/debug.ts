// Step-by-step debug logging for the SAP integration, visible in Vercel → Logs
// (search "[SAP:DEBUG]"). On by default; set SAP_DEBUG='false' to silence.

export function sapDebug(step: string, data?: unknown): void {
  if (process.env.SAP_DEBUG === 'false') return;
  if (data === undefined) console.log(`[SAP:DEBUG] ${step}`);
  else console.log(`[SAP:DEBUG] ${step}`, JSON.stringify(data, null, 2));
}

// Shows only the edges of a secret so logs confirm it is set without leaking it.
export function mask(value?: string): string {
  if (!value) return '(empty)';
  if (value.length <= 6) return '***';
  return `${value.slice(0, 2)}***${value.slice(-2)} (len ${value.length})`;
}
