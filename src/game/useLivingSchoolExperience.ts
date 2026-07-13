import { useEffect } from "react";

const WORLD_CLASS = "living-school-world-v10";

type Side = "left" | "right";
type PropKind =
  | "gum-tree"
  | "fence-panel"
  | "school-sign"
  | "bench"
  | "basketball-hoop"
  | "play-tower"
  | "shade-sail"
  | "drink-fountain";

function makeElement(className: string, text?: string): HTMLDivElement {
  const element = document.createElement("div");
  element.className = className;
  if (text) element.textContent = text;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function addCampusBuilding(layer: HTMLElement, className: string, label: string): void {
  const building = makeElement(`campus-building-v10 ${className}`);
  building.append(
    makeElement("campus-roof-v10"),
    makeElement("campus-windows-v10"),
    makeElement("campus-label-v10", label),
  );
  layer.append(building);
}

function propLabel(kind: PropKind, side: Side, index: number): string | undefined {
  if (kind !== "school-sign") return undefined;
  const labels = side === "left"
    ? ["OVAL", "CANTEEN", "LIBRARY"]
    : ["PLAYGROUND", "COURT", "HALL"];
  return labels[index % labels.length];
}

function addPassingRoute(layer: HTMLElement, side: Side): void {
  const sequence: PropKind[] = [
    "gum-tree",
    "fence-panel",
    "school-sign",
    "bench",
    "gum-tree",
    "basketball-hoop",
    "shade-sail",
    "play-tower",
    "drink-fountain",
    "fence-panel",
    "gum-tree",
    "school-sign",
  ];

  sequence.forEach((kind, index) => {
    const prop = makeElement(
      `route-prop-v10 prop-${kind}-v10 route-${side}-v10`,
      propLabel(kind, side, index),
    );
    prop.style.setProperty("--route-delay", `${index * -0.52}s`);
    prop.style.setProperty("--route-duration", `${6.1 + (index % 4) * 0.18}s`);
    prop.style.setProperty("--route-depth", `${0.92 + (index % 3) * 0.05}`);
    layer.append(prop);
  });
}

function buildWorld(stage: Element): void {
  if (stage.querySelector(`.${WORLD_CLASS}`)) return;

  stage.querySelectorAll("[class*='living-school-world-v0']").forEach((node) => node.remove());

  const world = makeElement(WORLD_CLASS);

  const sky = makeElement("campus-sky-v10");
  sky.append(
    makeElement("cloud-bank-v10 cloud-bank-one-v10"),
    makeElement("cloud-bank-v10 cloud-bank-two-v10"),
    makeElement("school-flag-v10"),
  );

  const far = makeElement("campus-layer-v10 campus-far-v10");
  addCampusBuilding(far, "campus-canteen-v10", "CANTEEN");
  addCampusBuilding(far, "campus-hall-v10", "SCHOOL HALL");
  addCampusBuilding(far, "campus-library-v10", "LIBRARY");
  far.append(
    makeElement("oval-scoreboard-v10", "SUPER ZOOS OVAL"),
    makeElement("distant-gums-v10 distant-gums-left-v10"),
    makeElement("distant-gums-v10 distant-gums-right-v10"),
  );

  const mid = makeElement("campus-layer-v10 campus-mid-v10");
  mid.append(
    makeElement("court-zone-v10"),
    makeElement("court-hoop-v10"),
    makeElement("playground-zone-v10"),
    makeElement("playground-tower-v10"),
    makeElement("playground-slide-v10"),
    makeElement("shade-sails-v10"),
    makeElement("oval-fence-left-v10"),
    makeElement("oval-fence-right-v10"),
  );

  const ground = makeElement("campus-layer-v10 campus-ground-v10");
  ground.append(
    makeElement("oval-grass-v10"),
    makeElement("oval-lane-grid-v10"),
    makeElement("oval-edge-v10 oval-edge-left-v10"),
    makeElement("oval-edge-v10 oval-edge-right-v10"),
    makeElement("foreground-blur-v10 foreground-blur-left-v10"),
    makeElement("foreground-blur-v10 foreground-blur-right-v10"),
  );

  const route = makeElement("campus-layer-v10 campus-route-v10");
  addPassingRoute(route, "left");
  addPassingRoute(route, "right");

  const eventLayer = makeElement("campus-layer-v10 campus-event-v10");
  eventLayer.append(
    makeElement("winnie-action-banner-v10", "THUNDER WINNIE MADE A RED RIPPLE!"),
  );

  world.append(sky, far, mid, ground, route, eventLayer);
  stage.prepend(world);
  stage.classList.add("school-route-v10-active");
}

export function useLivingSchoolExperience(): void {
  useEffect(() => {
    function refresh(): void {
      document.querySelectorAll(".school-stage").forEach((stage) => {
        buildWorld(stage);
        const hasWinnie = Boolean(stage.querySelector(".doctor-winnie-cameo"));
        stage.classList.toggle("winnie-event-active-v10", hasWinnie);
      });
    }

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
