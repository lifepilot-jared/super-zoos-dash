import { useEffect } from "react";

const WORLD_CLASS = "living-school-world-v09";

type Side = "left" | "right";

function makeElement(className: string, text?: string): HTMLDivElement {
  const element = document.createElement("div");
  element.className = className;
  if (text) element.textContent = text;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function addPassingProps(layer: HTMLElement, side: Side): void {
  const props = [
    ["gum-tree", "🌳"],
    ["school-sign", side === "left" ? "OVAL" : "PLAYGROUND"],
    ["bench-prop", "▰"],
    ["fence-post", ""],
    ["shade-prop", "▲"],
    ["gum-tree", "🌳"],
    ["ball-prop", "●"],
    ["school-sign", side === "left" ? "CANTEEN" : "LIBRARY"],
    ["gum-tree", "🌳"],
    ["fence-post", ""],
  ] as const;

  props.forEach(([kind, text], index) => {
    const prop = makeElement(`passing-prop-v09 ${kind}-v09 ${side}-passing-v09`, text);
    prop.style.setProperty("--pass-delay", `${index * -0.34}s`);
    prop.style.setProperty("--pass-duration", `${2.65 + (index % 4) * 0.18}s`);
    prop.style.setProperty("--pass-lane-offset", `${(index % 3) * 3.5}vw`);
    layer.append(prop);
  });
}

function buildWorld(stage: Element): void {
  if (stage.querySelector(`.${WORLD_CLASS}`)) return;

  stage.querySelectorAll(".living-school-world-v07, .living-school-world-v08").forEach((node) => node.remove());

  const world = makeElement(WORLD_CLASS);

  const far = makeElement("school-layer far-school-layer-v09");
  far.append(
    makeElement("school-building-v09 canteen-building-v09", "CANTEEN"),
    makeElement("school-building-v09 library-building-v09", "LIBRARY"),
    makeElement("school-building-v09 hall-building-v09", "SCHOOL HALL"),
  );

  const mid = makeElement("school-layer mid-school-layer-v09");
  mid.append(
    makeElement("shade-sail-v09"),
    makeElement("playground-v09", "PLAYGROUND"),
    makeElement("basketball-court-v09", "BASKETBALL COURT"),
  );

  const passing = makeElement("school-layer passing-school-layer-v09");
  addPassingProps(passing, "left");
  addPassingProps(passing, "right");

  const near = makeElement("school-layer near-school-layer-v09");
  near.append(
    makeElement("foreground-speed-edge-v09 speed-edge-left-v09"),
    makeElement("foreground-speed-edge-v09 speed-edge-right-v09"),
    makeElement("track-stream-v09 track-stream-left-v09"),
    makeElement("track-stream-v09 track-stream-right-v09"),
    makeElement("side-grass-rush-v09 side-grass-left-v09"),
    makeElement("side-grass-rush-v09 side-grass-right-v09"),
  );

  const motion = makeElement("ground-rush-v09");
  const banner = makeElement("winnie-action-banner-v09", "DR WINNIE CAUSED A RED RIPPLE!");

  world.append(far, mid, passing, near, motion, banner);
  stage.prepend(world);
}

export function useLivingSchoolExperience(): void {
  useEffect(() => {
    function refresh(): void {
      document.querySelectorAll(".school-stage").forEach((stage) => {
        buildWorld(stage);
        const hasWinnie = Boolean(stage.querySelector(".doctor-winnie-cameo"));
        stage.classList.toggle("winnie-event-active-v09", hasWinnie);
      });
    }

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
