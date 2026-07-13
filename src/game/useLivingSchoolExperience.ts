import { useEffect } from "react";

const WORLD_CLASS = "living-school-world-v08";

function makeElement(className: string, text?: string): HTMLDivElement {
  const element = document.createElement("div");
  element.className = className;
  if (text) element.textContent = text;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function addPassingProps(layer: HTMLElement, side: "left" | "right"): void {
  const props = [
    ["gum-tree", "🌳"],
    ["school-sign", side === "left" ? "OVAL" : "PLAYGROUND"],
    ["bench-prop", "▰"],
    ["fence-post", ""],
    ["shade-prop", "▲"],
    ["gum-tree", "🌳"],
  ] as const;

  props.forEach(([kind, text], index) => {
    const prop = makeElement(`passing-prop-v08 ${kind}-v08 ${side}-passing-v08`, text);
    prop.style.setProperty("--pass-delay", `${index * -0.82}s`);
    prop.style.setProperty("--pass-duration", `${4.5 + (index % 3) * 0.35}s`);
    layer.append(prop);
  });
}

function buildWorld(stage: Element): void {
  if (stage.querySelector(`.${WORLD_CLASS}`)) return;

  // Remove the older injected world so there is only one scenery system.
  stage.querySelectorAll(".living-school-world-v07").forEach((node) => node.remove());

  const world = makeElement(WORLD_CLASS);

  const far = makeElement("school-layer far-school-layer-v08");
  far.append(
    makeElement("school-building-v08 canteen-building-v08", "CANTEEN"),
    makeElement("school-building-v08 library-building-v08", "LIBRARY"),
    makeElement("school-building-v08 hall-building-v08", "SCHOOL HALL"),
  );

  const mid = makeElement("school-layer mid-school-layer-v08");
  mid.append(
    makeElement("shade-sail-v08"),
    makeElement("playground-v08", "PLAYGROUND"),
    makeElement("basketball-court-v08", "BASKETBALL COURT"),
  );

  const passing = makeElement("school-layer passing-school-layer-v08");
  addPassingProps(passing, "left");
  addPassingProps(passing, "right");

  const near = makeElement("school-layer near-school-layer-v08");
  near.append(
    makeElement("foreground-speed-edge-v08 speed-edge-left-v08"),
    makeElement("foreground-speed-edge-v08 speed-edge-right-v08"),
    makeElement("track-stream-v08 track-stream-left-v08"),
    makeElement("track-stream-v08 track-stream-right-v08"),
  );

  const motion = makeElement("ground-rush-v08");
  const banner = makeElement("winnie-action-banner-v08", "DR WINNIE CAUSED A RED RIPPLE!");

  world.append(far, mid, passing, near, motion, banner);
  stage.prepend(world);
}

export function useLivingSchoolExperience(): void {
  useEffect(() => {
    function refresh(): void {
      document.querySelectorAll(".school-stage").forEach((stage) => {
        buildWorld(stage);
        const hasWinnie = Boolean(stage.querySelector(".doctor-winnie-cameo"));
        stage.classList.toggle("winnie-event-active-v08", hasWinnie);
      });
    }

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
