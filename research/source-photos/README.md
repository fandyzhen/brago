# Research — Source photos (real before/after)

> **Purpose**: real-world reference photos for Brago's P0 industries.
> Used for: homepage hero (`scripts/generate-homepage-hero.ts`), eval-set
> seeding, design dogfooding, marketing screenshots.
>
> **Copyright**: handled manually by project owner — these were grabbed
> from public company portfolio pages and are NOT cleared for redistribution
> until you decide what stays. Treat this folder as research-only.
> If the project ships any of these images publicly, replace with cleared
> equivalents first.

All files are paired with matching `*-before.jpg` / `*-after.jpg` names.
The pairing is semantic: same scene, before vs. after the service.

---

## pressure-washing/ (8 pairs)

P0 industry · spec §0. Iconic Brago use case.

| Subject | Before | After | Source |
|---|---|---|---|
| Driveway 01 | `driveway-01-before.jpg` | `driveway-01-after.jpg` | Klein Pressure Washing |
| Driveway 02 | `driveway-02-before.jpg` | `driveway-02-after.jpg` | Klein Pressure Washing |
| Driveway 03 | `driveway-03-before.jpg` | `driveway-03-after.jpg` | Klein Pressure Washing |
| Sidewalk | `sidewalk-before.jpg` | `sidewalk-after.jpg` | Klein Pressure Washing |
| Patio | `patio-before.jpg` | `patio-after.jpg` | Klein Pressure Washing |
| Brick walkway | `brick-walkway-before.jpg` | `brick-walkway-after.jpg` | Klein Pressure Washing |
| House siding (dormer) | `house-siding-before.jpg` | `house-siding-after.jpg` | Klein Pressure Washing |
| Roof shingles | `roof-shingles-before.jpg` | `roof-shingles-after.jpg` | Klein Pressure Washing |

Source gallery: https://kleinpressurewashing.com/gallery/

## auto-detailing/ (6 pairs)

P0 industry · spec §0.

| Vehicle | Before | After | Source |
|---|---|---|---|
| Toyota Tacoma exterior | `tacoma-exterior-before.jpg` | `tacoma-exterior-after.jpg` | Lake Stevens Auto Detailing |
| Chevy Silverado exterior | `silverado-exterior-before.jpg` | `silverado-exterior-after.jpg` | Lake Stevens Auto Detailing |
| Dodge Journey exterior | `dodge-journey-exterior-before.jpg` | `dodge-journey-exterior-after.jpg` | Lake Stevens Auto Detailing |
| Dodge Journey interior (cabin) | `dodge-journey-interior-before.jpg` | `dodge-journey-interior-after.jpg` | Lake Stevens Auto Detailing |
| Dodge Journey seats | `dodge-journey-seats-before.jpg` | `dodge-journey-seats-after.jpg` | Lake Stevens Auto Detailing |
| Dodge Journey trunk | `dodge-journey-trunk-before.jpg` | `dodge-journey-trunk-after.jpg` | Lake Stevens Auto Detailing |

Source gallery: https://lakestevensautodetailing.com/lake-stevens-auto-detailing/before-after/

## cleaning/ (7 pairs)

P0 industry · spec §0. Kitchen + bath are the high-conversion subjects.

| Subject | Before | After | Source |
|---|---|---|---|
| Gas stovetop | `stovetop-before.jpg` | `stovetop-after.jpg` | Greenville House Cleaning |
| Refrigerator interior | `fridge-interior-before.jpg` | `fridge-interior-after.jpg` | Greenville House Cleaning |
| Microwave interior | `microwave-before.jpg` | `microwave-after.jpg` | Greenville House Cleaning |
| Range hood / above-stove cabinets | `range-hood-before.jpg` | `range-hood-after.jpg` | Greenville House Cleaning |
| Bathtub | `bathtub-before.jpg` | `bathtub-after.jpg` | Greenville House Cleaning |
| Toilet bowl | `toilet-bowl-before.jpg` | `toilet-bowl-after.jpg` | Greenville House Cleaning |
| Shower floor | `shower-floor-before.jpg` | `shower-floor-after.jpg` | Greenville House Cleaning |

> Note: `stovetop-*` is the same pair used in the live homepage hero
> (`scripts/_hero-source/stovetop-{before,after}.jpg`); kept here too so
> the research folder stays the single index of every B/A pair we have.

Source gallery: https://greenvillehousecleaning.com/before-and-after-cleaning-photos/

---

## Not yet collected — future-candidate industries

Spec §0 lists `painting / roofing / HVAC` as P0-extension candidates,
*not* current P0. No source photos downloaded yet for these. When the
project expands, candidate sources:

- **Painting**: https://certapro.com/wny/project-planning-guide/project-before-and-afters/interior-painting-before-after-photos/
- **Roof cleaning** (soft wash): https://www.maxxecowash.com/gallery
- **HVAC**: Yelp business portfolio + Reddit r/HVAC

## Explicitly EXCLUDED industries

Spec §0 排除 — do not waste effort sourcing for these:
plumbing, lawn care, carpet cleaning, handyman, tree service, junk
removal, pest control. Real GBP adoption is too low to bother.

---

## How to use

**For Brago compose pipeline** (homepage hero, eval, demos):
```bash
NODE_OPTIONS=--conditions=react-server npx tsx scripts/generate-homepage-hero.ts
```

Swap the source paths in the script to any pair in this folder to
produce a different hero (e.g. swap stovetop → driveway-01 to switch
the homepage industry).

**For the eval-set** (`tests/brago/quality/eval-set.json`):
- Add a new case with `image.overlayText` matching the city+service
  shown in the source pair.
- Keep the source pair small enough (< 1 MB each) — these are already
  reasonable.

---

**Updated**: 2026-05-31
**Total**: 21 pairs / 42 files / ~4.9 MB
