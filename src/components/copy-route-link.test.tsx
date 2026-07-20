import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CopyRouteLink } from "@/components/copy-route-link";

describe("CopyRouteLink", () => {
  it("copies a canonical route comparison URL", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <CopyRouteLink origin="LAX" destination="SFO" month={5} band="Morning" />,
    );
    await user.click(screen.getByRole("button", { name: "Copy route link" }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/route?origin=LAX&destination=SFO&month=5&band=Morning`,
    );
    expect(screen.getByRole("button", { name: "Link copied" })).toBeVisible();
  });
});
