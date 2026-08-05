import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FullPageLoader from "./full-page-loader";

describe("FullPageLoader", () => {
  it("renders default loading state with Hygieia icon and title", () => {
    render(<FullPageLoader />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Menyiapkan Ruang Belajar...")).toBeInTheDocument();
    expect(screen.getByText(/halaman sedang dimuat agar pengalaman belajar/i)).toBeInTheDocument();
  });

  it("renders error state when variant is error", () => {
    render(
      <FullPageLoader
        variant="error"
        title="Akses Belum Diverifikasi"
        description="Gagal memverifikasi akun Anda."
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Akses Belum Diverifikasi")).toBeInTheDocument();
    expect(screen.getByText("Gagal memverifikasi akun Anda.")).toBeInTheDocument();
  });
});
