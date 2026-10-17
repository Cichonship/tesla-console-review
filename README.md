# Console Study

Public designer handoff for the approved **Rear Right Bin v1.3.0** console insert.

**Website:** https://cichonship.github.io/tesla-console-review/

## Use The Site

- Orbit, zoom and pan the actual CAD-derived geometry. Isolate the tray or bin, inspect standard views, explode the assembly, and show a visual section.
- Choose any of 43 dimensions. The inspector distinguishes checked CAD geometry, configuration values, derivations, user requirements, and unverified references.
- Select **Discuss this detail** to attach a review to an item, revision and exact saved camera view. Comments appear inside the page.
- Download the assembled/separate STEP solids, approved native F3D, four-page dimension sheet and complete ZIP.

## Fixed Design Brief

The existing tray and bin stay unchanged. Design a lid for the bin only.

- The lid opens **downward into the bin**.
- Headroom is **4 mm above the existing flange**, whose top is Z=+2.5 mm.
- Closed/sliding height limit is **Z=+6.5 mm** relative to the carrier seating plane.
- Hardware, tolerances and operating clearance share the allowance.
- The designer selects mechanism, material, process, tolerances and service details.

Geometry is validated. Physical vehicle fit, lid operation, full 77 mm slide, lift-out, printed strength and liner interaction are not. The 2024 Model Y context scene is schematic, not to scale, and does not detect collisions.

## Comments: One-Time Owner Setup

[Install the Utterances GitHub App](https://github.com/apps/utterances) on **only this repository**.

No paid service or custom backend is used. Viewing is public. Posting uses GitHub sign-in, and comments/replies stay in the on-page widget. Comments are stored as public GitHub issue threads. Do not publish confidential details.

Each thread is keyed by revision, item ID and a saved-view fingerprint. Its body contains the originating view URL. A per-item selector lists existing view threads; the link restores the matching camera and inspector state. Replies use the thread's saved context. The owner can hide/delete abusive comments and lock threads in GitHub.

The comment widget and issue history are loaded only after a visitor requests them. No analytics are installed. GitHub's unauthenticated issue-list rate limit applies; failures are shown rather than represented as an empty review history. The selector shows up to the 100 most recent review threads.

**Approval status:** app installation and signed-in browser posting must be confirmed by the owner. The automated checks verify the live embed and item/view mapping, not a completed authenticated comment submission.

## Develop

Node 22+ and Python 3 for the package-integrity test.

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install webkit
npm run test:browser
```

The browser checks use **WebKit only**. No Chrome automation is used. To run against a deployed build:

```sh
TEST_BASE_URL=https://cichonship.github.io/tesla-console-review/ npm run test:browser
```

## Data And CAD Pipeline

- `Public/Data/specification.json`: shared source for dimensions, evidence and datums.
- `Public/Data/validation.json`: accepted Fusion inspection.
- `Public/Data/export-verification.json`: export provenance and exact volume/bounds checks.
- `Public/Data/asset-manifest.json`: SHA-256 and byte sizes for public assets.
- `Public/Models/assembly-v1.3.0.glb`: 1,888 triangles across two identified parts.
- `Public/Downloads/`: exact CAD, PDF, brief and ZIP.
- `Scripts/Build Specification.py`: regenerate the dimension registry from the frozen validation report.
- `Scripts/Build Package.mjs`: regenerate PDF, brief, archive and asset hashes.

The Fusion exporter rebuilt the BReps using the unchanged approved generator, inspected them inside Fusion, and required exact approved material volumes before exporting. The F3D download is copied byte-for-byte from the approved archive. GLB uses meters and axes `(x,z,-y)`; the viewer applies one meters-to-mm conversion. Mesh surface tolerance is 0.02 mm. Exact STEP/F3D geometry governs fabrication.

Sections are intentionally labeled **uncapped visual sections**; highlighted contours show cut edges. They do not produce a new CAD solid. The lid scene is a constraint volume and downward-direction arrow, not a finished mechanism or validated sweep.

## Publish And Maintain

GitHub Pages serves the public static build. The workflow runs integrity tests and TypeScript compilation before deploying. No custom domain is needed. Netlify configuration is included for portability, but Netlify is not connected.

The production Content Security Policy limits scripts to this site and Utterances. WebAssembly is allowed for the viewer dependency, but JavaScript eval is not. No GitHub token, Netlify token or application secret is in the client. The local Vite server omits the production CSP for its development refresh script.

A new accepted geometry revision should receive new versioned assets and review keys. Do not silently replace v1.3.0 under existing links.

See [QA](Documents/QA.md) for checks and remaining acceptance limits.
