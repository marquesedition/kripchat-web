import { getPublicBuildLabel } from "@/lib/buildInfo";

describe("build info label", () => {
  it("builds a label with version and incremental build number", () => {
    expect(
      getPublicBuildLabel({
        appVersion: "1.2.3",
        webBuildNumber: "17",
        gitSha: "abc1234"
      })
    ).toBe("v1.2.3 build 17 (abc1234)");
  });

  it("falls back to version only when build metadata is missing", () => {
    expect(
      getPublicBuildLabel({
        appVersion: "2.0.0"
      })
    ).toBe("v2.0.0");
  });
});
