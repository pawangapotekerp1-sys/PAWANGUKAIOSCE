import { describe, expect, test, vi } from "vitest";
import {
  GeneratedReferenceValidationError,
  repairGeneratedReferenceFromPubMed,
  validateGeneratedReferenceBatch,
} from "./reference-validation";

const validGeneratedItem = {
  stem: "Pasien CKD dengan hipertensi membutuhkan terapi yang tepat.",
  options: {
    A: "Amlodipin",
    B: "Lisinopril",
    C: "Parasetamol",
    D: "Metformin",
    E: "Omeprazol",
  },
  correctOptionKey: "B" as const,
  explanationText: "ACE inhibitor membantu proteksi ginjal.",
  variationMode: "new_case_same_concept" as const,
  reference: {
    label: "KDIGO CKD guideline",
    url: "https://kdigo.org/guidelines/ckd/",
  },
};

describe("validateGeneratedReferenceBatch", () => {
  test("rejects invalid reference format before any accessibility fetch", async () => {
    const fetchSpy = vi.fn();

    await expect(validateGeneratedReferenceBatch([
      {
        ...validGeneratedItem,
        reference: {
          ...validGeneratedItem.reference,
          url: "doi:10.1000/test",
        },
      },
    ], fetchSpy as typeof fetch)).rejects.toMatchObject({
      code: "INVALID_REFERENCE_URL_FORMAT",
      itemIndex: 0,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("rejects non-allowlisted domains before accessibility fetch", async () => {
    const fetchSpy = vi.fn();

    await expect(validateGeneratedReferenceBatch([
      {
        ...validGeneratedItem,
        reference: {
          label: "Random blog",
          url: "https://example.org/post",
        },
      },
    ], fetchSpy as typeof fetch)).rejects.toMatchObject({
      code: "REFERENCE_DOMAIN_NOT_ALLOWED",
      itemIndex: 0,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("rejects unreachable references when the server response is not 2xx", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 404,
      }),
    );

    await expect(validateGeneratedReferenceBatch([
      validGeneratedItem,
    ], fetchSpy as typeof fetch)).rejects.toMatchObject({
      code: "REFERENCE_URL_UNREACHABLE",
      itemIndex: 0,
      status: 404,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  test("accepts a batch when every trusted reference returns 2xx", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response("ok", {
        status: 200,
      }),
    );

    await expect(validateGeneratedReferenceBatch([
      validGeneratedItem,
    ], fetchSpy as typeof fetch)).resolves.toEqual([
      validGeneratedItem,
    ]);

    expect(fetchSpy).toHaveBeenCalledWith(
      validGeneratedItem.reference.url,
      expect.objectContaining({
        method: "GET",
        redirect: "manual",
      }),
    );
  });

  test("repairs an unreachable generated url with a trusted replacement before failing the batch", async () => {
    const unreachableItem = {
      ...validGeneratedItem,
      reference: {
        label: "WHO broken deep link",
        url: "https://www.who.int/publications/i/item/not-real",
      },
    };
    const repairedItem = {
      ...unreachableItem,
      reference: {
        label: "PubMed clinical evidence article",
        url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      },
    };
    const repairReference = vi.fn().mockResolvedValue(repairedItem);
    const fetchSpy = vi.fn(async (input: string) => {
      if (input === repairedItem.reference.url) {
        return new Response("ok", { status: 200 });
      }

      return new Response(null, { status: 404 });
    });

    await expect(validateGeneratedReferenceBatch([
      unreachableItem,
    ], fetchSpy as typeof fetch, { repairReference })).resolves.toEqual([
      repairedItem,
    ]);

    expect(repairReference).toHaveBeenCalledWith(
      unreachableItem,
      expect.objectContaining({
        code: "REFERENCE_URL_UNREACHABLE",
        itemIndex: 0,
      }),
    );
  });

  test("accepts trusted references that redirect to another allowlisted trusted url before returning 2xx", async () => {
    const fetchSpy = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === validGeneratedItem.reference.url) {
        if (init?.redirect === "manual") {
          return new Response(null, {
            status: 302,
            headers: {
              Location: "https://www.kdigo.org/guidelines/ckd/",
            },
          });
        }

        return new Response("ok", {
          status: 200,
        });
      }

      return new Response("ok", {
        status: 200,
      });
    });

    await expect(validateGeneratedReferenceBatch([
      validGeneratedItem,
    ], fetchSpy as typeof fetch)).resolves.toEqual([
      {
        ...validGeneratedItem,
        reference: {
          ...validGeneratedItem.reference,
          url: "https://www.kdigo.org/guidelines/ckd/",
        },
      },
    ]);
  });

  test("repairs a hallucinated deep path by falling back to a reachable parent page on the same trusted host", async () => {
    const whoItem = {
      ...validGeneratedItem,
      reference: {
        label: "WHO publication page",
        url: "https://www.who.int/publications/i/item/9789241546427",
      },
    };
    const fetchSpy = vi.fn(async (input: string) => {
      if (input === "https://www.who.int/publications/i/item/9789241546427") {
        return new Response(null, { status: 404 });
      }

      if (input === "https://www.who.int/publications/i/item") {
        return new Response(null, { status: 404 });
      }

      if (input === "https://www.who.int/publications/i") {
        return new Response(null, { status: 404 });
      }

      if (input === "https://www.who.int/publications") {
        return new Response("ok", { status: 200 });
      }

      return new Response(null, { status: 404 });
    });

    await expect(validateGeneratedReferenceBatch([
      whoItem,
    ], fetchSpy as typeof fetch)).resolves.toEqual([
      {
        ...whoItem,
        reference: {
          ...whoItem.reference,
          url: "https://www.who.int/publications",
        },
      },
    ]);
  });

  test("repairs an insecure redirect by retrying the redirected path over https on the same trusted host", async () => {
    const kemkesItem = {
      ...validGeneratedItem,
      reference: {
        label: "Kemenkes homepage",
        url: "https://www.kemkes.go.id",
      },
    };
    const fetchSpy = vi.fn(async (input: string) => {
      if (input === "https://www.kemkes.go.id") {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "http://www.kemkes.go.id/id/home",
          },
        });
      }

      if (input === "https://www.kemkes.go.id/id/home") {
        return new Response("ok", { status: 200 });
      }

      return new Response(null, { status: 404 });
    });

    await expect(validateGeneratedReferenceBatch([
      kemkesItem,
    ], fetchSpy as typeof fetch)).resolves.toEqual([
      {
        ...kemkesItem,
        reference: {
          ...kemkesItem.reference,
          url: "https://www.kemkes.go.id/id/home",
        },
      },
    ]);
  });

  test("exposes stable machine-readable codes for upstream error mapping", () => {
    const error = new GeneratedReferenceValidationError(
      "REFERENCE_URL_UNREACHABLE",
      "Link referensi gagal diakses.",
      {
        itemIndex: 1,
        status: 503,
        url: validGeneratedItem.reference.url,
      },
    );

    expect(error.code).toBe("REFERENCE_URL_UNREACHABLE");
    expect(error.itemIndex).toBe(1);
    expect(error.status).toBe(503);
    expect(error.url).toBe(validGeneratedItem.reference.url);
  });
});

describe("repairGeneratedReferenceFromPubMed", () => {
  test("uses PubMed esearch to replace an inaccessible generated url with a concrete PubMed article", async () => {
    const fetchSpy = vi.fn(async (input: string) => {
      expect(input).toContain("eutils.ncbi.nlm.nih.gov");

      return new Response(JSON.stringify({
        esearchresult: {
          idlist: ["12345678"],
        },
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    await expect(repairGeneratedReferenceFromPubMed(validGeneratedItem, fetchSpy as typeof fetch)).resolves.toEqual({
      ...validGeneratedItem,
      reference: {
        label: "PubMed clinical evidence article",
        url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      },
    });
  });

  test("falls back to a PubMed clinical evidence search when esearch has no concrete article", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        esearchresult: {
          idlist: [],
        },
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const repaired = await repairGeneratedReferenceFromPubMed(validGeneratedItem, fetchSpy as typeof fetch);

    expect(repaired.reference.label).toBe("PubMed clinical evidence search");
    expect(repaired.reference.url).toMatch(/^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\?term=/);
    expect(decodeURIComponent(new URL(repaired.reference.url).searchParams.get("term") ?? "")).toMatch(
      /systematic review|randomized controlled trial|guideline/i,
    );
  });
});
