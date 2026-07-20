import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RouteRibbon } from "@/components/route-ribbon";

describe("RouteRibbon", () => {
  it("announces the route independently of its visual treatment", () => {
    render(<RouteRibbon origin="JFK" destination="LAX" />);
    expect(screen.getByLabelText("JFK to LAX")).toBeInTheDocument();
    expect(screen.getByText("JFK")).toBeVisible();
    expect(screen.getByText("LAX")).toBeVisible();
  });
});
