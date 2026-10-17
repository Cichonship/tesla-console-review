import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
const root = path.resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(path.join(root, "Public", p));
const json = (p) => JSON.parse(read(p));
const spec = json("Data/specification.json"),
  validation = json("Data/validation.json"),
  exported = json("Data/export-verification.json"),
  manifest = json("Data/asset-manifest.json");
const baseline =
  "ad4fe266e3c240667cce263d63aad974f5d9cb6f6659b6c4f52c72362b6b7f5c";
const near = (a, b, t = 0.0001) =>
  assert.ok(Math.abs(a - b) <= t, `${a} != ${b} (tolerance ${t})`);
const glb = read("Models/assembly-v1.3.0.glb");
const doc = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
const binaryOffset = 20 + glb.readUInt32LE(12) + 8;
function accessor(index) {
  const a = doc.accessors[index],
    v = doc.bufferViews[a.bufferView];
  const start = binaryOffset + (v.byteOffset || 0) + (a.byteOffset || 0);
  const n = a.count * (a.type === "VEC3" ? 3 : 1);
  const result = [];
  for (let i = 0; i < n; i++)
    result.push(
      a.componentType === 5126
        ? glb.readFloatLE(start + i * 4)
        : glb.readUInt32LE(start + i * 4),
    );
  return result;
}
test("approved revision and source provenance agree", () => {
  assert.equal(spec.revision, "1.3.0");
  assert.equal(validation.status, "passed");
  assert.equal(exported.status, "passed");
  assert.equal(spec.sourceSha256, baseline);
  assert.equal(validation.script_sha256, baseline);
  assert.equal(exported.sourceSha256, baseline);
  assert.equal(doc.asset.extras.sourceSha256, baseline);
});
test("CAD inspection has two connected solids, 53 containment checks and zero interference", () => {
  assert.equal(validation.inspection.bodies.length, 2);
  assert.ok(validation.inspection.bodies.every((b) => b.connected_solid));
  assert.equal(
    validation.inspection.point_checks_passed +
      validation.inspection.rear_profile.point_checks_passed,
    53,
  );
  assert.equal(validation.inspection.interference_count, 0);
});
test("exported exact material volumes match the approved solids", () => {
  exported.parts.forEach((p, i) =>
    near(p.volume_mm3, validation.inspection.bodies[i].volume_mm3, 0.001),
  );
});
test("GLB is valid, uncompressed and self-contained", () => {
  assert.equal(glb.readUInt32LE(0), 0x46546c67);
  assert.equal(glb.readUInt32LE(4), 2);
  assert.equal(glb.readUInt32LE(8), glb.length);
  assert.equal(doc.asset.version, "2.0");
  assert.deepEqual(
    doc.nodes.map((n) => n.name),
    ["tray", "bin"],
  );
  assert.ok(doc.buffers.every((b) => !b.uri));
  assert.equal(doc.meshes.length, 2);
  assert.ok(glb.length < 5_000_000);
  assert.equal(
    createHash("sha256").update(glb).digest("hex"),
    exported.glbSha256,
  );
});
for (const [i, name] of ["tray", "bin"].entries())
  test(`${name}: browser mesh scale, orientation, normals, bounds and volume`, () => {
    const prim = doc.meshes[i].primitives[0],
      p = accessor(prim.attributes.POSITION),
      n = accessor(prim.attributes.NORMAL),
      ix = accessor(prim.indices);
    assert.equal(p.length, n.length);
    assert.equal(ix.length % 3, 0);
    assert.ok(ix.every((v) => v < p.length / 3));
    const cad = [];
    for (let j = 0; j < p.length; j += 3) {
      cad.push([p[j] * 1000, -p[j + 2] * 1000, p[j + 1] * 1000]);
      near(Math.hypot(...n.slice(j, j + 3)), 1, 0.001);
    }
    const bounds = [0, 1, 2].flatMap((axis) => [
      Math.min(...cad.map((p) => p[axis])),
      Math.max(...cad.map((p) => p[axis])),
    ]);
    bounds.forEach((v, j) => near(v, exported.parts[i].bounds_mm[j], 0.021));
    let volume = 0;
    for (let j = 0; j < ix.length; j += 3) {
      const [a, b, c] = ix.slice(j, j + 3).map((k) => cad[k]);
      volume +=
        (a[0] * (b[1] * c[2] - b[2] * c[1]) +
          a[1] * (b[2] * c[0] - b[0] * c[2]) +
          a[2] * (b[0] * c[1] - b[1] * c[0])) /
        6;
    }
    assert.ok(
      volume > 0,
      "triangle winding must produce a positive material volume",
    );
    near(
      volume,
      exported.parts[i].volume_mm3,
      exported.parts[i].volume_mm3 * 0.003,
    );
  });
test("43 stable dimension IDs, finite anchors and classified evidence", () => {
  assert.equal(spec.dimensions.length, 43);
  assert.equal(new Set(spec.dimensions.map((d) => d.id)).size, 43);
  for (const d of spec.dimensions) {
    assert.match(d.id, /^[a-z0-9-]+$/);
    assert.ok(Number.isFinite(d.value));
    assert.ok(
      ["cad", "specified", "derived", "user", "reference"].includes(d.status),
    );
    for (const key of ["a", "b", "offset"])
      assert.ok(d[key].length === 3 && d[key].every(Number.isFinite));
    assert.ok(d.description.length > 20);
  }
});
test("linear measurement anchors encode their published length", () => {
  for (const d of spec.dimensions) {
    if (d.unit === "°") continue;
    const length = Math.hypot(...d.a.map((n, i) => n - d.b[i]));
    near(length, d.value, 0.001);
  }
});
test("lid allowance is above the existing flange and direction is downward", () => {
  assert.equal(spec.lid.aboveFlange, 4);
  assert.equal(spec.lid.flangeZ, 2.5);
  assert.equal(spec.lid.ceilingZ, 6.5);
  assert.equal(spec.lid.flangeZ + spec.lid.aboveFlange, spec.lid.ceilingZ);
  assert.match(spec.lid.direction, /Downward/);
  assert.equal(
    spec.dimensions.find((d) => d.id === "lid-headroom").status,
    "user",
  );
});
test("rear relief calculation and normal wall thickness match CAD", () => {
  const r = validation.inspection.rear_profile;
  near(3 + 60.5 * Math.tan((18 * Math.PI) / 180), r.total_bottom_setback_mm);
  near(105 - r.total_bottom_setback_mm, r.bottom_length_mm);
  near(r.normal_wall_thickness_mm, 2.4);
});
test("all downloaded assets match SHA-256 manifest", () => {
  for (const [file, entry] of Object.entries(manifest.files)) {
    const bytes = read(file);
    assert.equal(bytes.length, entry.bytes, file);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
      file,
    );
  }
});
test("three editable STEP exports contain exact BRep solids", () => {
  for (const name of ["assembly", "tray", "bin"]) {
    const step = read(`Downloads/${name}-v1.3.0.step`).toString();
    assert.ok(step.startsWith("ISO-10303-21;"));
    assert.match(step, /MANIFOLD_SOLID_BREP/);
    assert.match(step, /END-ISO-10303-21/);
  }
});
test("dimension sheet is a readable four-page PDF", async () => {
  const pdf = await PDFDocument.load(
    read("Downloads/dimension-sheet-v1.3.0.pdf"),
  );
  assert.equal(pdf.getPageCount(), 4);
  assert.equal(pdf.getTitle(), "Console Study: Designer Handoff v1.3.0");
});
test("ZIP integrity, expected CAD files and no unrelated content", () => {
  const output = execFileSync(
    "python3",
    [
      "-c",
      `import zipfile,json; z=zipfile.ZipFile(${JSON.stringify(path.join(root, "Public/Downloads/designer-handoff-v1.3.0.zip"))}); assert z.testzip() is None; print(json.dumps(z.namelist()))`,
    ],
    { encoding: "utf8" },
  );
  const names = JSON.parse(output);
  for (const f of [
    "assembly-v1.3.0.step",
    "tray-v1.3.0.step",
    "bin-v1.3.0.step",
    "assembly-v1.3.0.f3d",
    "dimension-sheet-v1.3.0.pdf",
  ])
    assert.ok(names.includes("Downloads/" + f));
  assert.ok(names.every((n) => /^(Downloads|Images|Data)\//.test(n)));
  assert.ok(
    !names.some((n) => /\.env|credentials|\/Users\/|token|\.git/i.test(n)),
  );
});
test("public artifact tree has no local paths or credential files", () => {
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else {
        assert.ok(!/^\.env|credentials|\.DS_Store/.test(entry));
        if (/\.(json|md|svg)$/.test(entry))
          assert.doesNotMatch(
            readFileSync(full, "utf8"),
            /\/Users\/|ghp_[A-Za-z0-9]{30}|github_pat_/,
          );
      }
    }
  }
  walk(path.join(root, "Public"));
});
