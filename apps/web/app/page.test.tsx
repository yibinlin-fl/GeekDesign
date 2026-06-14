import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("identifies the platform", () => {
    render(<HomePage />);
    expect(screen.getByText("GeekDesign")).toBeTruthy();
  });
});
