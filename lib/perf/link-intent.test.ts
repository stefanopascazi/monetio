import { afterEach, describe, expect, it } from "vitest";
import { internalNavTarget } from "./link-intent";

const current = new URL("http://localhost/movimenti?mese=2026-11");

function click(html: string, extra: Partial<MouseEvent> = {}) {
  document.body.innerHTML = html;
  const target = document.body.querySelector("[data-t]") ?? document.body.firstElementChild;
  return { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, target, ...extra };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("internalNavTarget", () => {
  it("returns path and search of an internal link, also from a nested element", () => {
    expect(internalNavTarget(click('<a href="/conti?x=1"><span data-t>Conti</span></a>'), current)).toBe("/conti?x=1");
  });

  it("ignores external links, new tabs, downloads and modifier clicks", () => {
    expect(internalNavTarget(click('<a href="https://example.com/">x</a>'), current)).toBeNull();
    expect(internalNavTarget(click('<a href="/conti" target="_blank">x</a>'), current)).toBeNull();
    expect(internalNavTarget(click('<a href="/file.csv" download>x</a>'), current)).toBeNull();
    expect(internalNavTarget(click('<a href="/conti">x</a>', { ctrlKey: true }), current)).toBeNull();
    expect(internalNavTarget(click('<a href="/conti">x</a>', { button: 1 }), current)).toBeNull();
    expect(internalNavTarget(click('<a href="/conti">x</a>', { defaultPrevented: true }), current)).toBeNull();
  });

  it("ignores the current page, hash jumps included, and non-link targets", () => {
    expect(internalNavTarget(click('<a href="/movimenti?mese=2026-11#top">x</a>'), current)).toBeNull();
    expect(internalNavTarget(click("<button>x</button>"), current)).toBeNull();
  });
});
