import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("defaults to button type and invokes its action by keyboard and pointer", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Continue</Button>);
    const button = screen.getByRole("button", { name: "Continue" });

    expect(button).toHaveAttribute("type", "button");
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["primary", "bg-indigo-700"],
    ["secondary", "border-slate-300"],
    ["danger", "bg-red-700"],
    ["text", "hover:bg-slate-100"]
  ] as const)(
    "supports the %s variant",
    (variant, expectedClass) => {
      render(<Button variant={variant}>Action</Button>);
      expect(screen.getByRole("button", { name: "Action" }))
        .toHaveClass("min-h-11", expectedClass);
    }
  );

  it("does not invoke a disabled action", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Unavailable</Button>);

    await user.click(screen.getByRole("button", { name: "Unavailable" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disables and announces a loading action", () => {
    render(<Button loading loadingText="Saving…">Save</Button>);
    const button = screen.getByRole("button", { name: "Saving…" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
