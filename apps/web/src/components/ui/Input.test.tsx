import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("generates distinct ids when callers do not provide one", () => {
    render(
      <>
        <Input label="First name" />
        <Input label="Last name" />
      </>
    );

    expect(screen.getByLabelText("First name")).toHaveAttribute("id");
    expect(screen.getByLabelText("Last name")).toHaveAttribute("id");
    expect(screen.getByLabelText("First name").getAttribute("id"))
      .not.toBe(screen.getByLabelText("Last name").getAttribute("id"));
  });

  it("associates its visible label and helper text with a generated input id", () => {
    render(<Input label="Email address" helperText="Use your work email." type="email" />);
    const input = screen.getByLabelText("Email address");
    const helperId = input.getAttribute("aria-describedby");

    expect(input).toHaveAttribute("type", "email");
    expect(helperId).toBeTruthy();
    expect(document.getElementById(helperId!)).toHaveTextContent("Use your work email.");
  });

  it("announces required and validation error state without relying on color", () => {
    render(<Input id="title" label="Title" required helperText="Up to 200 characters." error="Enter a title." />);
    const input = screen.getByLabelText("Title");
    const describedIds = input.getAttribute("aria-describedby")?.split(" ") ?? [];

    expect(input).toHaveAttribute("required");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(describedIds).toHaveLength(2);
    expect(describedIds.every((id) => document.getElementById(id))).toBe(true);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a title.");
  });
});
