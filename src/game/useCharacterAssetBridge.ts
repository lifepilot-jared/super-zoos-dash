import { useEffect } from "react";
import {
  CHARACTER_FALLBACKS,
  getCharacterAsset,
  type HeroForm,
  type HeroId,
} from "./config/characterAssets";

/**
 * Bridges the existing runner component to the v0.6 character asset contract.
 *
 * The current MVP runner is intentionally left stable while v0.6 is developed.
 * This hook observes the rendered hero state and swaps the running sprite to the
 * correct rear-view image:
 *
 * normal -> ordinary plush rear view
 * super  -> superhero-suit rear view
 * aura   -> fully powered rear view with aura
 *
 * Missing PNG files fall back to the canonical SVG instead of displaying a
 * broken-image icon.
 */
export function useCharacterAssetBridge(): void {
  useEffect(() => {
    const managedImages = new WeakSet<HTMLImageElement>();

    function resolveHero(runner: Element): HeroId {
      return runner.classList.contains("judy") ? "judy" : "peter";
    }

    function resolveForm(runner: Element): HeroForm {
      if (runner.classList.contains("shielded")) return "aura";
      if (runner.classList.contains("super")) return "super";
      return "normal";
    }

    function applyRunnerAsset(runner: Element): void {
      const image = runner.querySelector<HTMLImageElement>("img.hero-sprite");
      if (!image) return;

      const hero = resolveHero(runner);
      const form = resolveForm(runner);
      const desiredSource = getCharacterAsset(hero, form, "back");

      image.dataset.hero = hero;
      image.dataset.form = form;
      image.dataset.view = "back";

      if (!managedImages.has(image)) {
        managedImages.add(image);
        image.addEventListener("error", () => {
          const fallbackHero = image.dataset.hero === "judy" ? "judy" : "peter";
          const fallback = CHARACTER_FALLBACKS[fallbackHero];
          if (!image.src.endsWith(fallback)) image.src = fallback;
          image.classList.add("using-character-fallback");
        });
        image.addEventListener("load", () => {
          if (!image.src.endsWith(CHARACTER_FALLBACKS[hero])) {
            image.classList.remove("using-character-fallback");
          }
        });
      }

      if (!image.src.endsWith(desiredSource)) {
        image.classList.add("changing-character-form");
        image.src = desiredSource;
        window.setTimeout(() => image.classList.remove("changing-character-form"), 180);
      }
    }

    function refresh(): void {
      document.querySelectorAll(".hero-runner").forEach(applyRunnerAsset);
    }

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);
}
