import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SelectField } from "@/components/ui/select-field";

const AIRPORTS = [
  { value: "LAX", code: "LAX", label: "Los Angeles, CA" },
  { value: "SEA", code: "SEA", label: "Seattle, WA" },
  { value: "SFO", code: "SFO", label: "San Francisco, CA" },
];

describe("SelectField", () => {
  it("filters a searchable option list and returns the chosen value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <SelectField
        label="Airport"
        ariaLabel="Origin airport"
        value="LAX"
        options={AIRPORTS}
        onValueChange={onValueChange}
        searchable
      />,
    );

    await user.click(screen.getByRole("button", { name: "Origin airport" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search origin airport" }),
      "Seattle",
    );

    expect(
      screen.queryByRole("option", { name: "LAX — Los Angeles, CA" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "SEA — Seattle, WA" }));
    expect(onValueChange).toHaveBeenCalledWith("SEA");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports arrow-key selection for a compact list", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <SelectField
        label="Month"
        ariaLabel="Travel month"
        value="5"
        options={[
          { value: "5", label: "May" },
          { value: "6", label: "June" },
        ]}
        onValueChange={onValueChange}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Travel month",
    });
    trigger.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("6");
  });
});
