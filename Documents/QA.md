# QA Record

## Passed Locally

- Exact Fusion exporter completed in Autodesk Fusion after static preflight.
- Both generated bodies inspected using the approved generator's inspection routine.
- Exported material volumes and bounds match accepted v1.3.0.
- 15 automated integrity tests passed: provenance, connected solids, mesh units/orientation/winding/volume, bounds, normals, dimension anchors, lid datum, rear relief, STEP files, PDF, archive, SHA-256 and public-file hygiene.
- 14 WebKit checks passed across desktop and iPhone 13 emulation: rendering, responsive width, accessible controls, modes, views, explode, section, dimensions, filtering, illustrative travel, saved-view reload, live Utterances embed, static fallback, downloads and invalid query handling.
- Axe WCAG 2 A/AA scan: no reported violations on the main desktop/mobile page. This is an automated scan, not a complete accessibility certification.
- TypeScript compilation and Vite production build passed.
- npm audit reported zero vulnerabilities.
- Source CAD remains frozen at SHA-256 `ad4fe266e3c240667cce263d63aad974f5d9cb6f6659b6c4f52c72362b6b7f5c`.

## Export Measurements

| Part | Triangles | Material volume |
| --- | ---: | ---: |
| Carrier | 1,236 | 190615.223126 mm³ |
| Bin | 652 | 108378.630815 mm³ |

Mesh: 72 KB on disk. Requested surface tolerance: 0.02 mm. Package: approximately 1.25 MB, including a four-page PDF and native reference images.

## Not Yet Accepted

- Signed-in comment posting and reply persistence through the widget. Requires the owner's one-time Utterances installation and GitHub sign-in. The embed and snapshot mapping were tested; authenticated submission was not.
- Physical vehicle fit, exact console alignment, lid mechanism/sweep, liner retention, slide/lift-out, material/process/strength.
- Real phone hardware and browser engines other than WebKit. Mobile coverage is emulated.
- LSP diagnostics: configured default servers were unavailable. Install/configure the appropriate server (for example Biome) in the local pi-lsp.json setup if LSP diagnostics are desired. TypeScript compiler checks passed independently.

## Evidence Limitations

The historical 157 mm opening, 143.5 mm ledge gap and 130 mm deep width conflict with the accepted geometry. The context scene is deliberately schematic. The bin extends about 5.105 mm beyond an assumed centered 130 mm deep envelope on the passenger side. No clearance or collision guarantee is made.

Comments and files are public. The comment provider's availability, GitHub account permissions, abuse controls, and free-tier limits are external dependencies. Source access, moderation and backups remain under the repository owner's control.
