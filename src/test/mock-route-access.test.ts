import { describe, it, expect } from "vitest";
import {
  MOCK_PATHS,
  isMockPath,
  shouldRedirectFromMockPath,
  filterMockGroupsForAuth,
  type MenuGroupLike,
} from "@/config/routeRegistry";
import { menuGroups } from "@/components/AppSidebar";

/**
 * These tests guarantee the access rule:
 *  - Mock screens only open for users authenticated via email + password.
 *  - SSO sessions (cookie-only, no JWT) are always redirected to completed screens.
 */
describe("Mock route access control", () => {
  describe("isMockPath / MOCK_PATHS", () => {
    it("includes the known mock paths and excludes real ones", () => {
      const knownMock = [
        "/vehicle-maintenance",
        "/journey-rules",
        "/user-management",
        "/audit-log",
        "/analytics",
        "/operational-kpis",
        "/smart-allocation",
        "/shift-swap",
        "/driver-availability",
      ];
      for (const p of knownMock) expect(isMockPath(p)).toBe(true);

      const realScreens = [
        "/home",
        "/driver",
        "/daily-trip",
        "/reports",
        "/overtime-bank",
        "/drivers-schedule",
        "/departures-and-arrivals",
      ];
      for (const p of realScreens) expect(isMockPath(p)).toBe(false);
    });

    it("never accepts unknown paths as mock", () => {
      expect(isMockPath("/nope")).toBe(false);
      expect(isMockPath("")).toBe(false);
    });

    it("exposes a non-empty, frozen-ish list of mock paths", () => {
      expect(MOCK_PATHS.size).toBeGreaterThan(0);
    });
  });

  describe("shouldRedirectFromMockPath", () => {
    it("redirects SSO users away from mock paths", () => {
      expect(shouldRedirectFromMockPath("/audit-log", false)).toBe(true);
      expect(shouldRedirectFromMockPath("/user-management", false)).toBe(true);
    });

    it("never redirects password-authenticated users from mock paths", () => {
      expect(shouldRedirectFromMockPath("/audit-log", true)).toBe(false);
      expect(shouldRedirectFromMockPath("/analytics", true)).toBe(false);
    });

    it("never redirects either user type away from a real screen", () => {
      for (const auth of [true, false]) {
        expect(shouldRedirectFromMockPath("/home", auth)).toBe(false);
        expect(shouldRedirectFromMockPath("/driver", auth)).toBe(false);
        expect(shouldRedirectFromMockPath("/reports", auth)).toBe(false);
      }
    });
  });

  describe("filterMockGroupsForAuth (sidebar visibility)", () => {
    const sample: MenuGroupLike[] = [
      { labelKey: "dashboard.title", items: [], directLink: { url: "/home" } },
      {
        labelKey: "sidebar.admin",
        items: [
          { url: "/admin-parameters" },
          { url: "/user-management" }, // mock
          { url: "/audit-log" }, // mock
        ],
      },
      {
        labelKey: "sidebar.analytics",
        items: [
          { url: "/operational-kpis" }, // mock
          { url: "/analytics" }, // mock
        ],
      },
      {
        labelKey: "sidebar.driverSchedule",
        items: [
          { url: "/driver-journey" },
          { url: "/shift-swap" }, // mock
          { url: "/journey-rules" }, // mock
        ],
      },
    ];

    it("returns the groups untouched for password-authenticated users", () => {
      const out = filterMockGroupsForAuth(sample, true);
      expect(out).toEqual(sample);
    });

    it("for SSO users, removes mock items and drops groups that become empty", () => {
      const out = filterMockGroupsForAuth(sample, false);

      // /home direct link stays
      const dashboard = out.find((g) => g.labelKey === "dashboard.title");
      expect(dashboard?.directLink?.url).toBe("/home");

      // sidebar.admin keeps only the non-mock item
      const admin = out.find((g) => g.labelKey === "sidebar.admin");
      expect(admin?.items.map((i) => i.url)).toEqual(["/admin-parameters"]);

      // sidebar.analytics was 100% mock → removed entirely
      expect(out.find((g) => g.labelKey === "sidebar.analytics")).toBeUndefined();

      // sidebar.driverSchedule keeps only /driver-journey
      const driverSchedule = out.find((g) => g.labelKey === "sidebar.driverSchedule");
      expect(driverSchedule?.items.map((i) => i.url)).toEqual(["/driver-journey"]);

      // Final sanity: no mock URL survives anywhere
      const allUrls = out.flatMap((g) => [
        ...(g.directLink ? [g.directLink.url] : []),
        ...g.items.map((i) => i.url),
      ]);
      for (const url of allUrls) expect(isMockPath(url)).toBe(false);
    });

    it("applied to the real sidebar menuGroups, hides every mock route for SSO", () => {
      const filtered = filterMockGroupsForAuth(menuGroups, false);
      const surviving = filtered.flatMap((g) => [
        ...(g.directLink ? [g.directLink.url] : []),
        ...g.items.map((i) => i.url),
      ]);
      for (const url of surviving) expect(isMockPath(url)).toBe(false);
    });

    it("applied to the real sidebar menuGroups, preserves every mock route for password login", () => {
      const filtered = filterMockGroupsForAuth(menuGroups, true);
      const surviving = filtered.flatMap((g) => [
        ...(g.directLink ? [g.directLink.url] : []),
        ...g.items.map((i) => i.url),
      ]);
      for (const mock of MOCK_PATHS) expect(surviving).toContain(mock);
    });
  });
});
