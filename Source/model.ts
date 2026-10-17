import data from "../Public/Data/specification.json";

export type Mode = "assembly" | "tray" | "bin" | "lid" | "context";
export type View =
  "iso" | "top" | "front" | "rear" | "left" | "right" | "bottom";
export type Vec3 = [number, number, number];
export type Dimension = {
  id: string;
  name: string;
  value: number;
  unit: string;
  group: string;
  description: string;
  a: number[];
  b: number[];
  offset: number[];
  view: string;
  status: string;
  part: string;
};
export const spec = data;
export const dimensions: Dimension[] = data.dimensions;
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const format = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);
export const measurement = (d: Dimension) =>
  `${format(d.value)}${d.unit === "°" ? "°" : " mm"}`;
export const statusNames: Record<string, string> = {
  cad: "CAD verified",
  specified: "CAD specification",
  derived: "Derived",
  user: "User confirmed",
  reference: "Unverified reference",
};
export const modes: { id: Mode; label: string; number: string }[] = [
  { id: "assembly", label: "Assembly", number: "01" },
  { id: "tray", label: "Tray", number: "02" },
  { id: "bin", label: "Bin", number: "03" },
  { id: "lid", label: "Lid envelope", number: "04" },
  { id: "context", label: "In the console", number: "05" },
];
export const views: { id: View; label: string }[] = [
  { id: "iso", label: "3D view" },
  { id: "top", label: "Top" },
  { id: "front", label: "Vehicle front" },
  { id: "rear", label: "Rear" },
  { id: "right", label: "Passenger side" },
  { id: "left", label: "Driver side" },
  { id: "bottom", label: "Underside" },
];
export const defaultIds: Record<Mode, string[]> = {
  assembly: ["rail-width", "carrier-length", "bin-depth"],
  tray: ["rail-width", "body-bottom", "tray-depth"],
  bin: ["bin-width", "bin-length", "bin-depth"],
  lid: ["lid-headroom", "flange-width", "opening-width"],
  context: ["slide-travel", "shallow-gap", "receiver-gap"],
};
export function readState() {
  const params = new URLSearchParams(location.search);
  const mode = modes.some((m) => m.id === params.get("mode"))
    ? (params.get("mode") as Mode)
    : "assembly";
  const view = views.some((v) => v.id === params.get("view"))
    ? (params.get("view") as View)
    : "iso";
  const selected = dimensions.some((d) => d.id === params.get("item"))
    ? params.get("item")!
    : "";
  const rawSlide = Number(params.get("slide") || 0);
  return {
    mode,
    view,
    selected,
    explode: mode === "assembly" && params.get("explode") === "1",
    section: mode !== "context" && params.get("section") === "1",
    travel: Number.isFinite(rawSlide) ? Math.min(77, Math.max(0, rawSlide)) : 0,
  };
}
export type ViewState = ReturnType<typeof readState>;
export function viewUrl(
  s: ViewState,
  camera?: { position: number[]; target: number[]; zoom: number },
) {
  const u = new URL(location.href);
  u.search = "";
  u.hash = "";
  u.searchParams.set("rev", spec.revision);
  u.searchParams.set("mode", s.mode);
  u.searchParams.set("view", s.view);
  if (s.selected) u.searchParams.set("item", s.selected);
  if (s.explode) u.searchParams.set("explode", "1");
  if (s.section) u.searchParams.set("section", "1");
  if (s.travel) u.searchParams.set("slide", String(s.travel));
  if (camera) u.searchParams.set("camera", JSON.stringify(camera));
  return u;
}
export function savedCamera() {
  try {
    const c = JSON.parse(
      new URLSearchParams(location.search).get("camera") || "null",
    );
    if (
      c &&
      [c.position, c.target].every(
        (v) =>
          Array.isArray(v) &&
          v.length === 3 &&
          v.every(
            (x) =>
              typeof x === "number" &&
              Number.isFinite(x) &&
              Math.abs(x) <= 3000,
          ),
      ) &&
      typeof c.zoom === "number" &&
      c.zoom >= 0.1 &&
      c.zoom <= 20
    )
      return c as { position: number[]; target: number[]; zoom: number };
  } catch {
    /* Invalid shared input falls back to a safe preset. */
  }
  return null;
}
export const cadToWorld = (p: number[]): Vec3 => [p[0], p[2], -p[1]];
