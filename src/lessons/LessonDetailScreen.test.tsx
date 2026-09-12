import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LessonDetailScreen } from "./LessonDetailScreen";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lessons" element={<div>Lessons list</div>} />
        <Route path="/lessons/:lessonId" element={<LessonDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LessonDetailScreen", () => {
  it("redirects to the Lessons list when the URL names an unknown Lesson", () => {
    renderAt("/lessons/not-a-real-lesson");

    expect(screen.getByText("Lessons list")).toBeInTheDocument();
  });

  it("deep-links directly to a Lesson", () => {
    renderAt("/lessons/active-listening");

    expect(screen.getByRole("heading", { name: "Active Listening" })).toBeInTheDocument();
  });
});
