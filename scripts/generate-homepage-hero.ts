/**
 * One-off: dogfood the Brago compose pipeline on a real before/after pair
 * to render the homepage hero artifact.
 *
 * Source: a gas-stovetop deep-clean job from
 * https://greenvillehousecleaning.com/before-and-after-cleaning-photos/
 * Two genuine separate before / after photos — exactly the shape a Brago
 * user would upload from a real job.
 *
 * Inputs:  scripts/_hero-source/stovetop-{before,after}.jpg
 * Output:  public/hero/proof.jpg                    (1200×900, spec §1.3)
 *
 * Run with:  NODE_OPTIONS=--conditions=react-server npx tsx scripts/generate-homepage-hero.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeProofImage } from "../lib/brago/compose/proof-image";
import { buildOverlayText } from "../lib/brago/compose/overlay";
import { validateOutputImage } from "../lib/brago/compose/gates";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, "_hero-source");
const OUT_PATH = path.join(__dirname, "..", "public", "hero", "proof.jpg");

// spec §1.4 — 3 to 5 words, all caps. Park Slope neighborhood + deep clean.
// (The original "Kitchen Deep Clean" failed the thumbnail readability gate
//  — its 5 words exceeded the readable width at 150px. Dogfood win.)
const overlayText = buildOverlayText("Park Slope", "Deep Clean");

async function main() {
  const before = await readFile(path.join(SOURCE_DIR, "stovetop-before.jpg"));
  const after = await readFile(path.join(SOURCE_DIR, "stovetop-after.jpg"));

  const composed = await composeProofImage({
    mode: "before_after",
    after,
    before,
    overlayText,
    // No customer brand → no watermark (spec §1.5: NEVER add Brago watermark)
    watermark: { logo: null, businessName: null },
  });

  const gate = await validateOutputImage(composed, { overlayText });
  if (!gate.ok) {
    throw new Error(
      `hero render failed output gates: ${gate.issues.join(", ")}`,
    );
  }

  await writeFile(OUT_PATH, composed);
  console.log(
    `✓ wrote ${OUT_PATH} (${(composed.byteLength / 1024).toFixed(1)} KB)`,
  );
  console.log(`  overlay: "${overlayText}"`);
}

main().catch((err) => {
  console.error("[generate-homepage-hero] failed:", err);
  process.exit(1);
});
