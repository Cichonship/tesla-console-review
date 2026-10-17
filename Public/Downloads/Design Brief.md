# Console Study: Designer Handoff

Baseline: Rear Right Bin v1.3.0
Vehicle context: 2024 Tesla Model Y. Physical fit is NOT verified.

## Lid Requirements

- Lid covers the bin only and opens DOWNWARD into the bin.
- The existing flange top is Z=+2.5 mm.
- Allowance above the flange is 4 mm. Closed/sliding ceiling is Z=+6.5 mm.
- This allowance includes hardware, tolerances and operating clearance.
- Preserve the approved tray and bin. Proposed changes require review.
- Designer selects mechanism, materials, process, tolerances and service details.
- Consider removal, washing, optional liners, accumulated trash and internal sweep.

## Evidence Boundary

The Fusion geometry is verified. Vehicle fit, cover movement, lift-out, lid sweep and printed strength are unverified. Historical console references conflict with the approved geometry. The site's console scene is illustrative and not to scale.

## Coordinates And Units

All dimensions in mm. X positive driver-side, negative passenger-side. Y=0 at vehicle front and positive toward rear. Z=0 at the carrier seating plane, positive upward. glTF uses meters with (x,z,-y) axis mapping; the site converts display units to mm once.

## Package Contents

- assembly-v1.3.0.step: assembled exact solids
- tray-v1.3.0.step: carrier exact solid
- bin-v1.3.0.step: bin exact solid
- assembly-v1.3.0.f3d: approved native Fusion archive
- dimension-sheet-v1.3.0.pdf: dimensions, brief and evidence boundary
- Data/specification.json: shared dimension registry
- Data/validation.json: accepted Fusion inspection report
- Data/export-verification.json: export and mesh provenance
- Images/: inspected native Fusion views

The CAD is direct-design BRep, not a fully parametric feature-history model. Exact CAD governs fabrication; the browser mesh is a viewing aid. Comments and files are public.

Review: https://cichonship.github.io/tesla-console-review/

Source SHA-256: ad4fe266e3c240667cce263d63aad974f5d9cb6f6659b6c4f52c72362b6b7f5c
