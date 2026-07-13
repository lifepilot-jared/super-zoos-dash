import { useEffect } from "react";

const WORLD_CLASS = "living-school-world-v07";

function makeElement(className: string, text?: string): HTMLDivElement {
  const element = document.createElement("div");
  element.className = className;
  if (text) element.textContent = text;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function buildWorld(stage: Element): void {
  if (stage.querySelector(`.${WORLD_CLASS}`)) return;

  const world = makeElement(WORLD_CLASS);
  const far = makeElement("school-layer far-school-layer");
  far.append(
    makeElement("school-building canteen-building", "CANTEEN"),
    makeElement("school-building library-building", "LIBRARY"),
    makeElement("school-building hall-building-v07", "SCHOOL HALL"),
  );

  const mid = makeElement("school-layer mid-school-layer");
  mid.append(
    makeElement("shade-sail-v07"),
    makeElement("playground-v07", "PLAYGROUND"),
    makeElement("basketball-court-v07", "BASKETBALL COURT"),
    makeElement("gum-row-v07 gum-row-left"),
    makeElement("gum-row-v07 gum-row-right"),
  );

  const near = makeElement("school-layer near-school-layer");
  near.append(
    makeElement("foreground-fence-v07 fence-left-v07"),
    makeElement("foreground-fence-v07 fence-right-v07"),
    makeElement("track-stream-v07 track-stream-left"),
    makeElement("track-stream-v07 track-stream-right"),
    makeElement("sports-flags-v07"),
  );

  const motion = makeElement("ground-rush-v07");
  const banner = makeElement("winnie-action-banner-v07", "DR WINNIE CAUSED A RED RIPPLE!");

  world.append(far, mid, near, motion, banner);
  stage.prepend(world);
}

export function useLivingSchoolExperience(): void {
  useEffect(() => {
    function refresh(): void {
      document.querySelectorAll(".school-stage").forEach((stage) => {
        buildWorld(stage);
        const hasWinnie = Boolean(stage.querySelector(".doctor-winnie-cameo"));
        stage.classList.toggle("winnie-event-active-v07", hasWinnie);
      });
    }

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
