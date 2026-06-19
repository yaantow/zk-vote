import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "sus-results.jsonl");

async function ensureFile() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "");
  }
}

async function readAll(): Promise<{ responses: number[]; score: number; timestamp: string }[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { responses, score, timestamp } = body;

    if (!Array.isArray(responses) || responses.length !== 10 || typeof score !== "number") {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }

    await ensureFile();
    const line = JSON.stringify({ responses, score, timestamp }) + "\n";
    await fs.appendFile(DATA_FILE, line);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save submission" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const submissions = await readAll();
    const average =
      submissions.length > 0
        ? submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length
        : null;

    return NextResponse.json({ submissions, average, count: submissions.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read submissions" },
      { status: 500 }
    );
  }
}
