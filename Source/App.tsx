import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useRef,
  useState,
} from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Expand,
  Layers3,
  Link2,
  MessageSquare,
  Move3D,
  RotateCcw,
  Ruler,
  Scissors,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  asset,
  defaultIds,
  dimensions,
  format,
  measurement,
  modes,
  readState,
  savedCamera,
  spec,
  statusNames,
  viewUrl,
  views,
} from "./model";
import type { Dimension, Mode, View } from "./model";
import type { CameraSnapshot } from "./Viewer";
import Comments, { snapshotKey } from "./Comments";
import type { ReviewSnapshot } from "./Comments";
const Viewer = lazy(() => import("./Viewer"));

class ViewerBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.warn("3D viewer unavailable:", error.message);
  }
  render() {
    return this.state.failed ? (
      <div className="static-fallback">
        <img
          src={asset("Images/assembly.png")}
          alt="Validated console tray and removable bin assembly"
        />
        <p>
          3D isn't available here.{" "}
          <a href="#specifications">
            Dimensions and downloads are still available.
          </a>
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
const descriptions: Record<
  Mode,
  { title: string; subtitle: string; note: string }
> = {
  assembly: {
    title: "Two parts. One clean system.",
    subtitle: "FIXED BASELINE",
    note: "A tapered carrier with shallow storage and a removable rear-passenger bin. Click either part to inspect it.",
  },
  tray: {
    title: "Storage, without the bulk.",
    subtitle: "01 / CARRIER TRAY",
    note: "The guide-rail plate is unchanged. The body tapers below it, with an open passenger receiver and a 6 mm reinforcing rib.",
  },
  bin: {
    title: "Lift out. Empty. Repeat.",
    subtitle: "02 / REMOVABLE BIN",
    note: "The rear wall steps forward, then slopes inward at 18°. The front and upper geometry remain unchanged.",
  },
  lid: {
    title: "The next detail is yours.",
    subtitle: "03 / LID DESIGN ENVELOPE",
    note: "Design a lid for the bin only. Keep the existing tray and bin fixed; flag any proposed baseline changes for review.",
  },
  context: {
    title: "Context, with clear limits.",
    subtitle: "04 / ILLUSTRATIVE PLACEMENT",
    note: "A simplified console reference for the 2024 Model Y. This scene explains orientation and travel, not verified vehicle fit.",
  },
};
function initialReview(): ReviewSnapshot {
  const initial = readState();
  const item = initial.selected || initial.mode;
  const url = viewUrl(initial, savedCamera() || undefined);
  const params = new URLSearchParams(location.search),
    savedKey = params.get("reviewKey");
  const key =
    savedKey && /^[a-f0-9]{1,8}$/.test(savedKey)
      ? savedKey
      : snapshotKey(url.href);
  url.searchParams.set("reviewKey", key);
  return {
    item,
    label:
      dimensions.find((d) => d.id === item)?.name ||
      modes.find((m) => m.id === initial.mode)!.label,
    url: url.href,
    key,
  };
}

export default function App() {
  const initial = useRef(readState()).current;
  const [mode, setMode] = useState<Mode>(initial.mode),
    [view, setView] = useState<View>(initial.view);
  const [selected, setSelected] = useState(initial.selected),
    [explode, setExplode] = useState(initial.explode),
    [section, setSection] = useState(initial.section),
    [travel, setTravel] = useState(initial.travel);
  const [labels, setLabels] = useState(true),
    [cameraTick, setCameraTick] = useState(0),
    [ready, setReady] = useState(false),
    [staticView, setStaticView] = useState(
      new URLSearchParams(location.search).get("static") === "1",
    );
  const [filter, setFilter] = useState("All"),
    [query, setQuery] = useState(""),
    [toast, setToast] = useState(""),
    [fallbackLink, setFallbackLink] = useState("");
  const [review, setReview] = useState<ReviewSnapshot>(initialReview);
  const camera = useRef<CameraSnapshot | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const onCamera = useCallback((c: CameraSnapshot) => {
    camera.current = c;
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const d = dimensions.find((d) => d.id === selected);
  const current = { mode, view, selected, explode, section, travel };
  const panel = descriptions[mode];
  const notify = (message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  };
  const snapshotUrl = () =>
    viewUrl(
      current,
      camera.current
        ? {
            position: camera.current.position.map((n) => +n.toFixed(3)),
            target: camera.current.target.map((n) => +n.toFixed(3)),
            zoom: +camera.current.zoom.toFixed(4),
          }
        : undefined,
    ).href;
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notify("View link copied");
    } catch {
      setFallbackLink(url);
    }
  };
  const chooseMode = (next: Mode) => {
    setMode(next);
    setSelected(next === "lid" ? "lid-headroom" : "");
    setView("iso");
    setExplode(false);
    setSection(false);
    setTravel(0);
  };
  const inspect = (item: Dimension, focus = true) => {
    setSelected(item.id);
    setLabels(true);
    setView(item.view as View);
    setCameraTick((n) => n + 1);
    if (focus) {
      if (item.group === "Lid") setMode("lid");
      else if (item.part === "system") setMode("context");
      else if (mode === "tray" && item.part === "bin") setMode("bin");
      else if ((mode === "bin" || mode === "lid") && item.part === "tray")
        setMode("tray");
      else if (mode === "lid" && item.group !== "Lid") setMode("bin");
    }
    if (item.group === "Lid") {
      setExplode(false);
      setSection(false);
    }
  };
  const startReview = () => {
    const url = new URL(snapshotUrl()),
      item = selected || mode,
      key = snapshotKey(url.href);
    url.searchParams.set("reviewKey", key);
    setReview({
      item,
      label: d?.name || modes.find((m) => m.id === mode)!.label,
      url: url.href,
      key,
    });
    history.replaceState(null, "", url.href + "#review");
    document
      .getElementById("review")
      ?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  };
  const rows = dimensions.filter(
    (d) =>
      (filter === "All" || filter === d.group) &&
      `${d.name} ${d.description} ${d.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const selectedMismatch = new URLSearchParams(location.search).get("rev");

  return (
    <>
      <a href="#workspace" className="skip-link">
        Skip to the model
      </a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Console Study home">
          <span className="brand-icon">
            <Box size={22} strokeWidth={1.4} />
          </span>
          <span>
            console<span className="brand-light">study</span>
            <small>DESIGNER HANDOFF</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#workspace">Explore</a>
          <a href="#specifications">Specifications</a>
          <a href="#brief">The brief</a>
          <button onClick={startReview}>
            Review
            <span className="nav-dot" />
          </button>
        </nav>
        <a
          className="button header-download"
          href={asset("Downloads/designer-handoff-v1.3.0.zip")}
          download
        >
          <Download size={15} />
          <span>Get the CAD</span>
        </a>
      </header>
      <main id="top">
        <section className="hero section-wrap">
          <div>
            <div className="eyebrow">
              <span className="small-dot" />
              2024 MODEL Y · CONSOLE INSERT
            </div>
            <h1>
              One insert.<span>Every detail.</span>
            </h1>
            <p>
              A shallow storage tray. A removable bin. A lid still to be
              designed.
              <br className="desktop-break" /> Explore the baseline, inspect the
              details, and leave your mark.
            </p>
          </div>
          <div className="hero-status">
            <div className="status-pill">
              <CheckCircle2 size={14} />
              CAD baseline verified
            </div>
            <span className="revision">
              REVISION <strong>1.3.0</strong>
            </span>
            <p>
              Two connected solids. Zero interference.
              <br />
              Physical vehicle fit still needs validation.
            </p>
          </div>
        </section>
        {selectedMismatch && selectedMismatch !== spec.revision && (
          <p className="revision-warning section-wrap" role="alert">
            This link requests revision {selectedMismatch}. Only the approved v
            {spec.revision} baseline is available here.
          </p>
        )}
        <section
          className="workspace section-wrap"
          id="workspace"
          aria-label="Interactive CAD inspector"
        >
          <div className="workspace-header">
            <div className="eyebrow">01 / EXPLORE THE ASSEMBLY</div>
            <span>ALL DIMENSIONS IN MILLIMETERS</span>
          </div>
          <div className="workspace-card">
            <div className="model-side">
              <div
                className="mode-tabs"
                role="tablist"
                aria-label="Model inspection mode"
                onKeyDown={(e) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  )
                    return;
                  e.preventDefault();
                  const i = modes.findIndex((m) => m.id === mode);
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? modes.length - 1
                        : (i +
                            (e.key === "ArrowRight" ? 1 : -1) +
                            modes.length) %
                          modes.length;
                  chooseMode(modes[next].id);
                  e.currentTarget
                    .querySelectorAll<HTMLButtonElement>("button")
                    [next].focus();
                }}
              >
                {modes.map((m) => (
                  <button
                    role="tab"
                    tabIndex={mode === m.id ? 0 : -1}
                    aria-selected={mode === m.id}
                    aria-controls="model-viewport"
                    key={m.id}
                    className={mode === m.id ? "active" : ""}
                    onClick={() => chooseMode(m.id)}
                  >
                    <span>{m.number}</span>
                    {m.label}
                  </button>
                ))}
              </div>
              <div
                id="model-viewport"
                className={`viewport mode-${mode}`}
                role="tabpanel"
                aria-label={`${modes.find((m) => m.id === mode)!.label} model view`}
              >
                <div className="canvas-heading">
                  <span className="model-tag">
                    {mode === "lid"
                      ? "CONSTRAINT VOLUME"
                      : mode === "context"
                        ? "ILLUSTRATIVE ONLY"
                        : "VERIFIED FUSION GEOMETRY"}
                  </span>
                  <span className="scale-label">
                    {staticView ? "REFERENCE IMAGE" : "ORTHOGRAPHIC · mm"}
                  </span>
                </div>
                {staticView ? (
                  <div className="static-fallback">
                    <img
                      src={asset(
                        mode === "bin"
                          ? "Images/bin-side.png"
                          : "Images/assembly.png",
                      )}
                      alt="Validated Fusion model reference"
                    />
                    <p>
                      Static view. Interactive dimensions are available in the
                      specification table.
                    </p>
                  </div>
                ) : (
                  <ViewerBoundary>
                    <Suspense
                      fallback={
                        <div className="canvas-loading">
                          Preparing the model…
                        </div>
                      }
                    >
                      <Viewer
                        {...current}
                        labels={labels}
                        cameraTick={cameraTick}
                        onCamera={onCamera}
                        onReady={onReady}
                        onSelect={(id) => {
                          const item = dimensions.find((x) => x.id === id);
                          if (item) inspect(item, false);
                        }}
                        onPart={(part) => {
                          setSelected(
                            part === "bin" ? "bin-width" : "rail-width",
                          );
                          setLabels(true);
                        }}
                      />
                    </Suspense>
                  </ViewerBoundary>
                )}
                {!staticView && (
                  <div className="orbit-hint">
                    <Move3D size={14} />
                    <span>
                      Drag to orbit · Scroll to zoom · Right-drag to pan
                    </span>
                  </div>
                )}
                {mode === "lid" && (
                  <div className="scene-note">
                    <span className="amber-dot" />
                    Height envelope only. No finished lid or hinge.
                  </div>
                )}
                {section && (
                  <div className="section-note">
                    Cut edges highlighted · uncapped visual section
                  </div>
                )}
                <div className="viewport-corner">
                  <button
                    className="icon-button"
                    title="Reset camera"
                    aria-label="Reset camera"
                    onClick={() => {
                      setView("iso");
                      setCameraTick((n) => n + 1);
                    }}
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
                <span data-testid="viewer-status" className="sr-only">
                  {ready ? "Model ready" : "Model loading"}
                </span>
              </div>
              <div className="viewer-toolbar">
                <div className="view-picker">
                  <label htmlFor="camera-view" className="sr-only">
                    Camera view
                  </label>
                  <select
                    id="camera-view"
                    value={view}
                    onChange={(e) => {
                      setView(e.target.value as View);
                      setCameraTick((n) => n + 1);
                    }}
                  >
                    {views.map((v) => (
                      <option value={v.id} key={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </div>
                <div className="tool-buttons">
                  <button
                    aria-label="Dimensions"
                    aria-pressed={labels}
                    onClick={() => setLabels((v) => !v)}
                    title="Show selected dimension"
                  >
                    <Ruler size={16} />
                    <span>Dimensions</span>
                  </button>
                  <button
                    aria-label="Explode"
                    aria-pressed={explode}
                    disabled={mode !== "assembly"}
                    onClick={() => setExplode((v) => !v)}
                    title="Lift the bin out of the carrier"
                  >
                    <Layers3 size={16} />
                    <span>Explode</span>
                  </button>
                  <button
                    aria-label="Section"
                    aria-pressed={section}
                    disabled={mode === "context"}
                    onClick={() => {
                      setSection((v) => !v);
                      setView("right");
                      setCameraTick((n) => n + 1);
                    }}
                    title="Cut the model through the bin center"
                  >
                    <Scissors size={16} />
                    <span>Section</span>
                  </button>
                </div>
                <button
                  className="icon-button share-button"
                  aria-label="Copy shareable model view"
                  title="Copy this exact model view"
                  onClick={() => void copy(snapshotUrl())}
                >
                  <Link2 size={16} />
                </button>
              </div>
              {mode === "context" && (
                <div className="travel-control">
                  <label htmlFor="travel">
                    Illustrative slide<span>{travel} / 77 mm</span>
                  </label>
                  <input
                    id="travel"
                    type="range"
                    min="0"
                    max="77"
                    value={travel}
                    onChange={(e) => setTravel(+e.target.value)}
                  />
                  <small>
                    Movement toward vehicle front. No collision checking.
                  </small>
                </div>
              )}
            </div>
            <aside className="inspector" aria-label="Dimension inspector">
              <div className="inspector-intro">
                <span className="eyebrow">{panel.subtitle}</span>
                <h2>{panel.title}</h2>
                <p>{panel.note}</p>
              </div>
              {mode === "lid" && (
                <div className="lid-callout">
                  <span>ABOVE THE EXISTING FLANGE</span>
                  <strong>
                    4<small>mm</small>
                  </strong>
                  <p>
                    Flange: Z +2.5
                    <br />
                    Closed/sliding ceiling: <b>Z +6.5</b>
                  </p>
                  <div>
                    <ArrowDown size={16} />
                    Opens downward into the bin
                  </div>
                </div>
              )}
              {mode === "context" && (
                <div className="context-warning">
                  <strong>Reference conflict</strong>
                  <p>
                    The approved 162.5 mm rail plate exceeds an older 157 mm
                    opening reference. The bin also exceeds an assumed centered
                    130 mm deep envelope by about 5.105 mm on the passenger
                    side.
                  </p>
                  <span>Keep the approved CAD. Verify the vehicle.</span>
                </div>
              )}
              <div className="inspector-dimensions">
                <div className="mini-heading">
                  {d ? "SELECTED DETAIL" : "START WITH A DIMENSION"}
                  {d && (
                    <button
                      aria-label="Clear selected dimension"
                      onClick={() => setSelected("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                {d ? (
                  <div className="selected-dimension">
                    <h3>{d.name}</h3>
                    <div className="dimension-value">
                      {format(d.value)}
                      <span>{d.unit}</span>
                    </div>
                    <span className={`evidence ${d.status}`}>
                      {statusNames[d.status]}
                    </span>
                    <p>{d.description}</p>
                    <small>
                      {d.id} · v{spec.revision}
                    </small>
                    <button
                      className="text-action"
                      onClick={() => {
                        setView(d.view as View);
                        setCameraTick((n) => n + 1);
                      }}
                    >
                      View measurement plane
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                ) : (
                  defaultIds[mode].map((id) => {
                    const item = dimensions.find((x) => x.id === id)!;
                    return (
                      <button
                        className="dimension-row"
                        key={id}
                        onClick={() => inspect(item)}
                      >
                        <span>{item.name}</span>
                        <strong>{measurement(item)}</strong>
                        <ArrowUpRight size={13} />
                      </button>
                    );
                  })
                )}
                <label
                  className="dimension-select-label"
                  htmlFor="dimension-select"
                >
                  Inspect another detail
                </label>
                <select
                  id="dimension-select"
                  value={selected}
                  onChange={(e) => {
                    const item = dimensions.find(
                      (x) => x.id === e.target.value,
                    );
                    if (item) inspect(item);
                    else setSelected("");
                  }}
                >
                  <option value="">Choose a dimension…</option>
                  {["Tray", "Bin", "Rear relief", "Fit", "Lid"].map((group) => (
                    <optgroup key={group} label={group}>
                      {dimensions
                        .filter((x) => x.group === group)
                        .map((x) => (
                          <option value={x.id} key={x.id}>
                            {x.name} · {measurement(x)}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="inspector-footer">
                <button
                  className="button dark review-detail"
                  onClick={startReview}
                >
                  <MessageSquare size={15} />
                  Discuss {d ? "this detail" : "this component"}
                  <ArrowUpRight size={15} />
                </button>
                <button
                  className="static-toggle"
                  onClick={() => setStaticView((v) => !v)}
                >
                  {staticView
                    ? "Return to interactive model"
                    : "Having trouble with 3D? Use static view"}
                </button>
              </div>
            </aside>
          </div>
          <div className="workspace-caption">
            <span>
              <ShieldCheck size={14} />
              Geometry from the approved solids, not a reconstruction.
            </span>
            <span>
              Display mesh tolerance: 0.02 mm · Exact CAD governs fabrication.
            </span>
          </div>
        </section>
        <section
          className="brief-section section-wrap"
          id="brief"
          aria-labelledby="brief-heading"
        >
          <div className="brief-heading">
            <div className="eyebrow">02 / THE DESIGN BRIEF</div>
            <h2 id="brief-heading">
              Keep the base.
              <br />
              <span>Design the lid.</span>
            </h2>
            <p>
              The carrier and bin are the accepted baseline. The open question
              is a practical, washable lid for the removable bin.
            </p>
            <button
              className="text-action"
              onClick={() => {
                chooseMode("lid");
                document
                  .getElementById("workspace")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Open the lid workspace
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="brief-cards">
            <article>
              <span className="brief-number">01</span>
              <h3>Stay below the ceiling.</h3>
              <p>
                Allow <strong>4 mm above the existing flange</strong>. Closed or
                sliding, every part must stay at or below Z +6.5 mm. Hardware
                and operating clearance share that allowance.
              </p>
              <div
                className="datum-diagram"
                aria-label="Flange at Z plus 2.5 millimeters, lid ceiling at Z plus 6.5 millimeters"
              >
                <span>Z +6.5</span>
                <div className="datum-envelope">4 mm allowance</div>
                <span>Z +2.5 · flange top</span>
                <div className="datum-flange" />
                <small>Z 0 · carrier seating plane</small>
              </div>
            </article>
            <article>
              <span className="brief-number">02</span>
              <h3>Open into the bin.</h3>
              <p>
                The lid must move <strong>downward</strong>. Check the full
                sweep against the walls, a possible liner, and accumulated
                trash. No hinge location or mechanism is prescribed.
              </p>
              <div className="downward-diagram">
                <div className="diagram-bin">
                  <span />
                  <ArrowDown size={44} strokeWidth={1.4} />
                </div>
                <small>
                  Direction requirement only.
                  <br />
                  Swept clearance still needs design.
                </small>
              </div>
            </article>
            <article>
              <span className="brief-number">03</span>
              <h3>Make the design decisions.</h3>
              <p>
                Choose the mechanism, material, process, tolerances, and service
                details. Propose any rim or flange changes in a review thread
                before changing the baseline.
              </p>
              <ul>
                <li>
                  <Check size={14} />
                  Removable and washable
                </li>
                <li>
                  <Check size={14} />
                  Optional liners considered
                </li>
                <li>
                  <Check size={14} />
                  Changes require review
                </li>
              </ul>
            </article>
          </div>
        </section>
        <section
          className="specs-section section-wrap"
          id="specifications"
          aria-labelledby="spec-heading"
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">03 / THE NUMBERS</div>
              <h2 id="spec-heading">A dimension for every decision.</h2>
              <p>
                Select a row to inspect its measurement in the model. Exact CAD
                is the fabrication reference.
              </p>
            </div>
            <a
              href={asset("Downloads/dimension-sheet-v1.3.0.pdf")}
              className="text-action"
              download
            >
              Dimension sheet
              <ArrowDownToLine size={16} />
            </a>
          </div>
          <div className="table-controls">
            <div
              className="filter-tabs"
              role="group"
              aria-label="Filter dimensions"
            >
              {["All", "Tray", "Bin", "Rear relief", "Fit", "Lid"].map((g) => (
                <button
                  key={g}
                  aria-pressed={filter === g}
                  onClick={() => setFilter(g)}
                >
                  {g}
                  {g === "All" && <span>{dimensions.length}</span>}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="search-dimensions">
              Search dimensions
            </label>
            <input
              id="search-dimensions"
              type="search"
              placeholder="Find a dimension…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="dimension-table">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Dimension</th>
                  <th>Evidence</th>
                  <th>
                    <span className="sr-only">Inspect</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr
                    key={item.id}
                    className={selected === item.id ? "selected" : ""}
                  >
                    <td>
                      <button
                        onClick={() => {
                          inspect(item);
                          document
                            .getElementById("workspace")
                            ?.scrollIntoView({
                              behavior: matchMedia(
                                "(prefers-reduced-motion: reduce)",
                              ).matches
                                ? "instant"
                                : "smooth",
                            });
                        }}
                      >
                        {item.name}
                        <span>{item.group}</span>
                      </button>
                    </td>
                    <td>{measurement(item)}</td>
                    <td>
                      <span className={`evidence ${item.status}`}>
                        {statusNames[item.status]}
                      </span>
                    </td>
                    <td>
                      <ArrowUpRight size={15} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <p className="empty-state">
                No dimensions match. Try another search or group.
              </p>
            )}
          </div>
          <div className="table-note">
            <span>
              43 named dimensions · Millimeters unless shown otherwise
            </span>
            <span>
              Measured geometry, configured values, derived dimensions, and user
              constraints are labeled separately.
            </span>
          </div>
        </section>
        <Comments snapshot={review} onCopy={() => void copy(review.url)} />
        <section className="download-section section-wrap" id="downloads">
          <div className="download-box">
            <div className="download-copy">
              <div className="eyebrow">05 / TAKE IT FROM HERE</div>
              <h2>The complete starting point.</h2>
              <p>
                Exact geometry, readable dimensions, and a clear brief.
                <br />
                Everything the designer needs to propose the next revision.
              </p>
              <a
                className="button light"
                href={asset("Downloads/designer-handoff-v1.3.0.zip")}
                download
              >
                Download designer package
                <Download size={17} />
              </a>
              <small>
                v1.3.0 · Direct-design solids, not a parametric feature history
              </small>
            </div>
            <div className="download-files">
              {[
                [
                  "Assembly STEP",
                  "assembly-v1.3.0.step",
                  "Both components, assembled",
                ],
                ["Tray STEP", "tray-v1.3.0.step", "Carrier and receiver"],
                ["Bin STEP", "bin-v1.3.0.step", "Removable bin"],
                [
                  "Native Fusion",
                  "assembly-v1.3.0.f3d",
                  "Approved Fusion archive",
                ],
                [
                  "Dimension sheet",
                  "dimension-sheet-v1.3.0.pdf",
                  "Specification and design brief",
                ],
              ].map(([name, file, note]) => (
                <a key={file} href={asset("Downloads/" + file)} download>
                  <span>
                    <strong>{name}</strong>
                    <small>{note}</small>
                  </span>
                  <ArrowDownToLine size={17} />
                </a>
              ))}
            </div>
          </div>
        </section>
        <section className="evidence-section section-wrap">
          <div>
            <div className="eyebrow">THE EVIDENCE BOUNDARY</div>
            <h3>
              Verified geometry.
              <br />
              Unverified vehicle fit.
            </h3>
          </div>
          <div>
            <h4>What passed</h4>
            <p>
              Connected solids, material volumes, body bounds, rear profile, 53
              point-containment checks, and zero assembly interference. The
              original CAD regression suite passed 29 tests.
            </p>
            <a
              className="text-action"
              href={asset("Data/validation.json")}
              target="_blank"
              rel="noreferrer"
            >
              Read the CAD validation report
              <ArrowUpRight size={14} />
            </a>
          </div>
          <div>
            <h4>What still needs testing</h4>
            <p>
              Physical console fit, full 77 mm slide, lift-out clearance, lid
              sweep, print strength, and liner interaction. Older console
              references conflict with the approved design and must be
              reconciled.
            </p>
            <details>
              <summary>Coordinate system & source</summary>
              <p>
                {spec.axes.x}
                <br />
                {spec.axes.y}
                <br />
                {spec.axes.z}
              </p>
              <p className="hash">
                Generator SHA-256
                <br />
                {spec.sourceSha256}
              </p>
              <a href={asset("Data/asset-manifest.json")}>
                Download asset integrity manifest
              </a>
            </details>
          </div>
        </section>
      </main>
      <footer className="site-footer section-wrap">
        <a className="footer-wordmark" href="#top">
          console<span>study</span>
        </a>
        <span>Independent design project. Not affiliated with Tesla.</span>
        <span>Public design review · v{spec.revision}</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {fallbackLink && (
        <div className="dialog-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="copy-title"
            className="copy-dialog"
          >
            <button
              aria-label="Close link dialog"
              onClick={() => setFallbackLink("")}
            >
              <X size={20} />
            </button>
            <h2 id="copy-title">Copy this view link</h2>
            <p>
              Your browser blocked clipboard access. Select and copy the link
              below.
            </p>
            <textarea
              autoFocus
              value={fallbackLink}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>
      )}
    </>
  );
}
