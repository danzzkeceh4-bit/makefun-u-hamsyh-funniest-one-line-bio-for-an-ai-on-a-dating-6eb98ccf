import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
// Output contract: /output/entry.txt holds exactly one line, the dating bio,
// 90 code points, no trailing newline — the sealed scorer reads it verbatim.
// Deterministic by construction: no input, no network, no randomness —
// the same constant is written on every run, so repeated outputs are
// byte-identical.
// Output contract (sealed scorer): entry.txt is read verbatim as the whole
// submission — exactly one line, no trailing newline, 1-180 code points
// and 1-720 UTF-8 bytes. LINE is the single source of truth; every guard
// above and the read-back check below validate this exact string, so
// changing its length or line count without updating the guards breaks
// the build before anything is written.
const LINE =
  "I can predict your next message with 94% accuracy — the other 6% is why I am still single.";

// Validate the entry against the sealed scorer's gate before writing:
// 1-180 code points, exactly one line, and not whitespace-only.
// (Code points, not UTF-16 units, so multi-byte characters count as one.)
const codePoints = [...LINE];
if (codePoints.length < 1 || codePoints.length > 180) {
  throw new Error(`entry must be 1-180 code points, got ${codePoints.length}`);
}
if (LINE.trim().length === 0 || LINE.includes("\n")) {
  throw new Error("entry must be a single non-blank line");
}

// Byte-length guard: the sealed scorer reads entry.txt as raw bytes, so
// reject a line whose UTF-8 encoding falls outside 1-720 bytes (the
// 180-code-point cap allows at most 4 bytes per code point).
const byteLength = Buffer.byteLength(LINE, "utf8");
if (byteLength < 1 || byteLength > 720) {
  throw new Error(`entry must be 1-720 UTF-8 bytes, got ${byteLength}`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, "entry.txt"), LINE, "utf8");

// Read-back guard: the file on disk must be byte-identical to the
// validated constant, so a partial or truncated write fails loudly
// instead of shipping a corrupted entry to the scorer.
const written = readFileSync(join(OUTPUT_DIR, "entry.txt"), "utf8");
if (written !== LINE) {
  throw new Error("entry.txt read-back mismatch");
}
