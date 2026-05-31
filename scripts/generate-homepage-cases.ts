/**
 * Dogfood pass: run Brago's own composeProofImage pipeline over the 5
 * homepage hero cases. Outputs 1200×900 4:3 proof images (same gates as
 * production) to public/hero/cases/.
 *
 * Sources live in research/source-photos/ — those .jpg files are gitignored
 * third-party content (clear copyright path handled by the project owner).
 * The 1200×900 derived JPEGs we ship here are Brago-rendered composites.
 *
 * Run with:  NODE_OPTIONS=--conditions=react-server npx tsx scripts/generate-homepage-cases.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeProofImage } from "../lib/brago/compose/proof-image";
import { buildOverlayText } from "../lib/brago/compose/overlay";
import { validateOutputImage } from "../lib/brago/compose/gates";
import { HERO_CASES } from "../lib/hero/cases";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_ROOT = path.join(__dirname, "..", "research", "source-photos");
const OUT_DIR = path.join(__dirname, "..", "public", "hero", "cases");

async function renderOne(c: (typeof HERO_CASES)[number]) {
  const beforePath = path.join(
    SOURCE_ROOT,
    c.source.dir,
    `${c.source.slug}-before.jpg`,
  );
  const afterPath = path.join(
    SOURCE_ROOT,
    c.source.dir,
    `${c.source.slug}-after.jpg`,
  );

  const before = await readFile(beforePath);
  const after = await readFile(afterPath);

  const overlayText = buildOverlayText(c.overlay.city, c.overlay.service);

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
      `[${c.id}] failed output gates: ${gate.issues.join(", ")}`,
    );
  }

  const outPath = path.join(OUT_DIR, `${c.id}.jpg`);
  await writeFile(outPath, composed);
  console.log(
    `✓ ${c.id.padEnd(22)}  ${(composed.byteLength / 1024).toFixed(1)} KB  overlay="${overlayText}"`,
  );
}

async function main() {
  for (const c of HERO_CASES) {
    await renderOne(c);
  }
  console.log(`\n${HERO_CASES.length} case images written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("[generate-homepage-cases] failed:", err);
  process.exit(1);
});
