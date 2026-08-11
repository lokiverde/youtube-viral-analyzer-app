/**
 * Image generation on Tim (local DGX Spark GPU running FLUX) — free, no API cost.
 *
 * Tim sits behind a tailnet, so a Vercel function cannot call it directly.
 * Instead we INSERT a row into the Supabase `media_jobs` table; the tim-queue
 * worker running on Tim polls that table, generates the image, uploads it to
 * Bunny CDN and writes back `result_url`. Traffic is outbound-only — nothing
 * ever has to reach into the tailnet.
 */

export type TimImageModel = "flux" | "juggernaut";

export interface TimImageRequest {
  readonly prompt: string;
  readonly model?: TimImageModel;
  readonly width?: number;
  readonly height?: number;
  readonly negative?: string;
}

export interface TimImageOptions {
  /** Give up after this long and report a timeout. */
  readonly timeoutMs?: number;
  /** Written to `requested_by` so jobs can be traced back to this app. */
  readonly requestedBy?: string;
}

type JobStatus = "pending" | "running" | "done" | "error";

interface MediaJobRow {
  readonly id: string;
  readonly status: JobStatus;
  readonly result_url: string | null;
  readonly error: string | null;
}

const POLL_INTERVAL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 100_000;

/** Thrown for every failure mode so callers can map it to one HTTP response. */
export class TimImageError extends Error {
  readonly reason: "not_configured" | "enqueue_failed" | "generation_failed" | "timeout";

  constructor(reason: TimImageError["reason"], message: string) {
    super(message);
    this.name = "TimImageError";
    this.reason = reason;
  }
}

interface SupabaseConfig {
  readonly restUrl: string;
  readonly serviceKey: string;
}

function readSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new TimImageError(
      "not_configured",
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to queue jobs for Tim"
    );
  }

  return { restUrl: `${url.replace(/\/+$/, "")}/rest/v1/media_jobs`, serviceKey };
}

function authHeaders(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

async function enqueue(
  config: SupabaseConfig,
  request: TimImageRequest,
  requestedBy: string
): Promise<string> {
  const response = await fetch(config.restUrl, {
    method: "POST",
    headers: { ...authHeaders(config.serviceKey), Prefer: "return=representation" },
    body: JSON.stringify({
      type: "image",
      status: "pending",
      requested_by: requestedBy,
      params: {
        prompt: request.prompt,
        model: request.model ?? "flux",
        width: request.width ?? 1280,
        height: request.height ?? 720,
        negative: request.negative ?? "",
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new TimImageError(
      "enqueue_failed",
      `Could not queue the job for Tim (${response.status}): ${detail.slice(0, 200)}`
    );
  }

  const rows: MediaJobRow[] = await response.json();
  const jobId = rows[0]?.id;
  if (!jobId) {
    throw new TimImageError("enqueue_failed", "Queue accepted the job but returned no id");
  }

  return jobId;
}

async function readJob(config: SupabaseConfig, jobId: string): Promise<MediaJobRow | null> {
  const url = `${config.restUrl}?id=eq.${encodeURIComponent(jobId)}&select=id,status,result_url,error`;
  const response = await fetch(url, { headers: authHeaders(config.serviceKey) });

  if (!response.ok) return null; // transient read failure — keep polling

  const rows: MediaJobRow[] = await response.json();
  return rows[0] ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Queues an image job for Tim and waits for the finished CDN URL.
 * Typical wall time is 10-20s: up to ~3s of worker poll lag plus ~11s of FLUX.
 */
export async function generateImageOnTim(
  request: TimImageRequest,
  options: TimImageOptions = {}
): Promise<string> {
  const config = readSupabaseConfig();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const jobId = await enqueue(config, request, options.requestedBy ?? "youtube-viral-analyzer");

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const job = await readJob(config, jobId);
    if (!job) continue;

    if (job.status === "done" && job.result_url) return job.result_url;

    if (job.status === "error") {
      throw new TimImageError(
        "generation_failed",
        job.error?.slice(0, 300) || "Tim reported an unknown generation error"
      );
    }
  }

  throw new TimImageError(
    "timeout",
    `Tim did not return an image within ${Math.round(timeoutMs / 1000)}s (job ${jobId})`
  );
}
