import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'public', 'data', 'schedule.json');
const SOURCE_URL = 'https://www.lrn-wc.usace.army.mil/tva_schedule.shtml';
const FETCH_TIMEOUT_MS = Number.parseInt(process.env.SCRAPE_SCHEDULE_TIMEOUT_MS ?? '20000', 10);
const FETCH_RETRIES = Number.parseInt(process.env.SCRAPE_SCHEDULE_RETRIES ?? '3', 10);
const RETRY_BASE_DELAY_MS = Number.parseInt(process.env.SCRAPE_SCHEDULE_RETRY_DELAY_MS ?? '1200', 10);

export function generatorsToLabel(generators) {
  if (generators === 2) {
    return 'Swift Current';
  }

  if (generators === 1) {
    return 'Optimal Cruise';
  }

  return 'Low & Slow';
}

export function mapCenterHillValueToGenerators(rawValue) {
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return 0;
  }

  if (rawValue < 90) {
    return 1;
  }

  return 2;
}

function formatHourLabel(hourIndex) {
  const normalized = ((hourIndex % 24) + 24) % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;

  return `${hour12}:00 ${suffix}`;
}

export function buildScheduleBlocks(hourly) {
  const blocks = [];

  for (const hour of hourly) {
    const startHour = hour.hour - 1;
    const endHour = hour.hour % 24;
    const previous = blocks.at(-1);

    if (previous && previous.generators === hour.generators) {
      previous.end = formatHourLabel(endHour);
      continue;
    }

    blocks.push({
      start: formatHourLabel(startHour),
      end: formatHourLabel(endHour),
      generators: hour.generators,
      label: generatorsToLabel(hour.generators),
    });
  }

  return blocks;
}

export function parsePrescheduleHtml(html) {
  const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/i);

  if (!preMatch) {
    throw new Error('Unable to locate preschedule <pre> block');
  }

  const preText = preMatch[1].replace(/\r/g, '');
  const reportGeneratedMatch = html.match(/REPORT GENERATED:\s*([^<\n]+)/i);
  const reportGeneratedAt = reportGeneratedMatch?.[1]?.trim() ?? null;
  const sections = preText.split(/_{10,}/).map((section) => section.trim()).filter(Boolean);
  const firstSection = sections[0];

  if (!firstSection) {
    throw new Error('No preschedule section found in page content');
  }

  const lines = firstSection.split('\n').map((line) => line.trimEnd()).filter(Boolean);
  const titleMatch = lines[0]?.match(/GENERATION\s+PRESCHEDULE\s+(\d{2}[A-Z]{3}\d{4})/i);
  const headerLineIndex = lines.findIndex((line) => /^HR\s+/i.test(line));

  if (headerLineIndex === -1) {
    throw new Error('Unable to locate the schedule header line');
  }

  const headerColumns = lines[headerLineIndex].trim().split(/\s+/);
  const cenIndex = headerColumns.findIndex((column) => column === 'CEN');

  if (cenIndex === -1) {
    throw new Error('Unable to locate the CEN column in the schedule header');
  }

  const hourly = [];

  for (const line of lines.slice(headerLineIndex + 1)) {
    if (/^TOTAL\b/i.test(line)) {
      break;
    }

    const cells = line.trim().split(/\s+/);

    if (!/^\d{1,2}$/.test(cells[0] ?? '')) {
      continue;
    }

    const hour = Number(cells[0]);
    const rawValueToken = cells[cenIndex];
    const rawValue = rawValueToken === '----' ? 0 : Number(rawValueToken);

    hourly.push({
      hour,
      rawValue,
      generators: mapCenterHillValueToGenerators(rawValue),
    });
  }

  if (hourly.length !== 24) {
    throw new Error(`Expected 24 hourly rows for Center Hill, received ${hourly.length}`);
  }

  return {
    source: 'usace',
    updatedAt: new Date().toISOString(),
    reportDate: titleMatch?.[1] ?? null,
    reportGeneratedAt,
    blocks: buildScheduleBlocks(hourly),
    hourly,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(error) {
  const code = error?.cause?.code;
  return code === 'UND_ERR_CONNECT_TIMEOUT'
    || code === 'UND_ERR_HEADERS_TIMEOUT'
    || code === 'UND_ERR_SOCKET'
    || code === 'ETIMEDOUT'
    || code === 'ECONNRESET'
    || code === 'EAI_AGAIN';
}

function buildAttemptErrorMessage(attempt, attempts, error) {
  const code = error?.cause?.code;
  const parts = [`Schedule fetch attempt ${attempt}/${attempts} failed`];

  if (code) {
    parts.push(`(${code})`);
  }

  if (error?.message) {
    parts.push(`- ${error.message}`);
  }

  return parts.join(' ');
}

export async function scrapeSchedule() {
  const attempts = Number.isFinite(FETCH_RETRIES) && FETCH_RETRIES > 0 ? FETCH_RETRIES : 1;
  const timeoutMs = Number.isFinite(FETCH_TIMEOUT_MS) && FETCH_TIMEOUT_MS > 0 ? FETCH_TIMEOUT_MS : 20000;
  const retryBaseDelayMs = Number.isFinite(RETRY_BASE_DELAY_MS) && RETRY_BASE_DELAY_MS > 0 ? RETRY_BASE_DELAY_MS : 1200;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(SOURCE_URL, {
        headers: {
          'User-Agent': 'Caney-Flow-Tracker/1.0 (+https://github.com/upshawam/Caney-Flow-Tracker)',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`Schedule fetch failed with status ${response.status}`);
      }

      const html = await response.text();
      return parsePrescheduleHtml(html);
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !isRetryableNetworkError(error)) {
        break;
      }

      const delayMs = retryBaseDelayMs * attempt;
      console.warn(buildAttemptErrorMessage(attempt, attempts, error));
      await sleep(delayMs);
    }
  }

  const retrySummary = `Failed to fetch schedule after ${attempts} attempt${attempts === 1 ? '' : 's'}`;
  const detail = lastError?.cause?.code ?? lastError?.message ?? 'unknown network error';
  throw new Error(`${retrySummary}: ${detail}`, { cause: lastError });
}

async function main() {
  const dataset = await scrapeSchedule();
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}