import {
  isTrustedReferenceHost,
  parseSingleHttpsReferenceUrl,
  type GeneratedQuestionItem,
} from "../_shared/question-generator.ts";

export type GeneratedReferenceValidationCode =
  | "INVALID_REFERENCE_URL_FORMAT"
  | "REFERENCE_DOMAIN_NOT_ALLOWED"
  | "REFERENCE_URL_UNREACHABLE";

export class GeneratedReferenceValidationError extends Error {
  code: GeneratedReferenceValidationCode;
  itemIndex: number;
  status: number | null;
  url: string;

  constructor(
    code: GeneratedReferenceValidationCode,
    message: string,
    {
      itemIndex,
      status = null,
      url,
    }: {
      itemIndex: number;
      status?: number | null;
      url: string;
    },
  ) {
    super(message);
    this.code = code;
    this.itemIndex = itemIndex;
    this.status = status;
    this.url = url;
  }
}

export type GeneratedReferenceRepairReason = {
  code: GeneratedReferenceValidationCode;
  itemIndex: number;
  status: number | null;
  url: string;
};

export type GeneratedReferenceRepairer = (
  item: GeneratedQuestionItem,
  reason: GeneratedReferenceRepairReason,
) => Promise<GeneratedQuestionItem | null>;

function createReferenceError(
  code: GeneratedReferenceValidationCode,
  itemIndex: number,
  url: string,
  status?: number | null,
) {
  switch (code) {
    case "INVALID_REFERENCE_URL_FORMAT":
      return new GeneratedReferenceValidationError(
        code,
        "Generator belum menghasilkan satu link https utama yang valid untuk setiap soal.",
        { itemIndex, status, url },
      );
    case "REFERENCE_DOMAIN_NOT_ALLOWED":
      return new GeneratedReferenceValidationError(
        code,
        "Output generator memakai domain referensi yang tidak termasuk sumber terpercaya yang diizinkan.",
        { itemIndex, status, url },
      );
    case "REFERENCE_URL_UNREACHABLE":
      return new GeneratedReferenceValidationError(
        code,
        "Output generator memakai link referensi yang tidak bisa diakses dari server.",
        { itemIndex, status, url },
      );
  }
}

const MAX_REFERENCE_REDIRECT_HOPS = 3;
const MAX_REFERENCE_FALLBACK_REWRITES = 6;
const clinicalEvidencePubMedFilters = "(systematic review OR randomized controlled trial OR guideline)";
const ignoredClinicalSearchTerms = new Set([
  "adalah",
  "akibat",
  "dalam",
  "dengan",
  "diberikan",
  "diagnosis",
  "efek",
  "gangguan",
  "karena",
  "kemudian",
  "kunci",
  "menjadi",
  "mengonsumsi",
  "merupakan",
  "opsi",
  "pada",
  "pasien",
  "pembahasan",
  "pertanyaan",
  "sebagai",
  "sedang",
  "sehingga",
  "seorang",
  "tahun",
  "tanpa",
  "terapi",
  "terjadi",
  "yang",
]);

function promoteSameHostRedirectToHttps(candidate: URL, currentUrl: string) {
  const current = new URL(currentUrl);

  if (candidate.protocol === "https:") {
    return candidate;
  }

  if (candidate.protocol === "http:" && candidate.hostname === current.hostname) {
    return new URL(`https://${candidate.host}${candidate.pathname}${candidate.search}${candidate.hash}`);
  }

  return candidate;
}

function buildSameHostParentFallbackUrl(currentUrl: string) {
  const parsed = new URL(currentUrl);
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const nextSegments = segments.slice(0, -1);
  const nextPath = nextSegments.length ? `/${nextSegments.join("/")}` : "/";

  return new URL(`${parsed.origin}${nextPath}`).toString();
}

function buildClinicalEvidenceQuery(item: GeneratedQuestionItem) {
  const correctOptionText = item.options[item.correctOptionKey] ?? "";
  const sourceText = `${item.stem} ${correctOptionText} ${item.explanationText}`;
  const terms = Array.from(
    new Set(
      (sourceText.toLowerCase().match(/[a-z0-9]{4,}/gi) ?? [])
        .map((term) => term.trim())
        .filter((term) => term.length >= 4 && !ignoredClinicalSearchTerms.has(term)),
    ),
  );
  const coreTerms = terms.slice(0, 10).join(" ").trim() || correctOptionText.trim() || item.stem.trim();

  return `${coreTerms} ${clinicalEvidencePubMedFilters}`.trim();
}

export async function repairGeneratedReferenceFromPubMed(
  item: GeneratedQuestionItem,
  fetchImpl: typeof fetch = fetch,
): Promise<GeneratedQuestionItem> {
  const query = buildClinicalEvidenceQuery(item);
  const pubMedSearchUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
  const searchEndpoint = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  searchEndpoint.searchParams.set("db", "pubmed");
  searchEndpoint.searchParams.set("retmode", "json");
  searchEndpoint.searchParams.set("retmax", "1");
  searchEndpoint.searchParams.set("sort", "relevance");
  searchEndpoint.searchParams.set("term", query);

  try {
    const response = await fetchImpl(searchEndpoint.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const payload = await response.json() as {
        esearchresult?: {
          idlist?: unknown;
        };
      };
      const idList = Array.isArray(payload.esearchresult?.idlist) ? payload.esearchresult.idlist : [];
      const firstPubMedId = idList.find((id): id is string => typeof id === "string" && /^\d+$/.test(id));

      if (firstPubMedId) {
        return {
          ...item,
          reference: {
            label: "PubMed clinical evidence article",
            url: `https://pubmed.ncbi.nlm.nih.gov/${firstPubMedId}/`,
          },
        };
      }
    }
  } catch {
    // PubMed search-page fallback below is still a trusted, accessible output reference.
  }

  return {
    ...item,
    reference: {
      label: "PubMed clinical evidence search",
      url: pubMedSearchUrl,
    },
  };
}

async function validateGeneratedReferenceItem(
  item: GeneratedQuestionItem,
  itemIndex: number,
  fetchImpl: typeof fetch,
) {
  const rawUrl = item.reference?.url ?? "";
  let parsedUrl: URL;

  try {
    parsedUrl = parseSingleHttpsReferenceUrl(rawUrl);
  } catch {
    throw createReferenceError("INVALID_REFERENCE_URL_FORMAT", itemIndex, rawUrl);
  }

  if (!isTrustedReferenceHost(parsedUrl.hostname)) {
    throw createReferenceError("REFERENCE_DOMAIN_NOT_ALLOWED", itemIndex, rawUrl);
  }

  let currentUrl = rawUrl;
  let rewriteAttempts = 0;

  while (rewriteAttempts <= MAX_REFERENCE_FALLBACK_REWRITES) {
    let response: Response;

    try {
      response = await fetchImpl(currentUrl, {
        method: "GET",
        redirect: "manual",
      });
    } catch {
      throw createReferenceError("REFERENCE_URL_UNREACHABLE", itemIndex, currentUrl);
    }

    if (response.status >= 200 && response.status < 300) {
      return {
        ...item,
        reference: {
          ...item.reference,
          url: currentUrl,
        },
      };
    }

    if (response.status >= 300 && response.status < 400) {
      const redirectLocation = response.headers.get("location");

      if (!redirectLocation) {
        throw createReferenceError("REFERENCE_URL_UNREACHABLE", itemIndex, currentUrl, response.status);
      }

      let redirectedUrl: URL;

      try {
        redirectedUrl = promoteSameHostRedirectToHttps(new URL(redirectLocation, currentUrl), currentUrl);
      } catch {
        throw createReferenceError("INVALID_REFERENCE_URL_FORMAT", itemIndex, redirectLocation, response.status);
      }

      try {
        parseSingleHttpsReferenceUrl(redirectedUrl.toString());
      } catch {
        throw createReferenceError("INVALID_REFERENCE_URL_FORMAT", itemIndex, redirectedUrl.toString(), response.status);
      }

      if (!isTrustedReferenceHost(redirectedUrl.hostname)) {
        throw createReferenceError("REFERENCE_DOMAIN_NOT_ALLOWED", itemIndex, redirectedUrl.toString(), response.status);
      }

      currentUrl = redirectedUrl.toString();

      rewriteAttempts += 1;

      if (rewriteAttempts > MAX_REFERENCE_REDIRECT_HOPS + MAX_REFERENCE_FALLBACK_REWRITES) {
        throw createReferenceError("REFERENCE_URL_UNREACHABLE", itemIndex, currentUrl, response.status);
      }

      continue;
    }

    if (response.status === 404 || response.status === 410) {
      const fallbackUrl = buildSameHostParentFallbackUrl(currentUrl);

      if (fallbackUrl && fallbackUrl !== currentUrl) {
        currentUrl = fallbackUrl;
        rewriteAttempts += 1;
        continue;
      }
    }

    throw createReferenceError("REFERENCE_URL_UNREACHABLE", itemIndex, currentUrl, response.status);
  }

  throw createReferenceError("REFERENCE_URL_UNREACHABLE", itemIndex, currentUrl);
}

export async function validateGeneratedReferenceBatch(
  generatedItems: GeneratedQuestionItem[],
  fetchImpl: typeof fetch = fetch,
  options: {
    repairReference?: GeneratedReferenceRepairer | null;
  } = {},
) {
  const normalizedItems: GeneratedQuestionItem[] = [];

  for (const [itemIndex, item] of generatedItems.entries()) {
    try {
      normalizedItems.push(await validateGeneratedReferenceItem(item, itemIndex, fetchImpl));
    } catch (error) {
      if (!(error instanceof GeneratedReferenceValidationError) || !options.repairReference) {
        throw error;
      }

      const repairedItem = await options.repairReference(item, {
        code: error.code,
        itemIndex: error.itemIndex,
        status: error.status,
        url: error.url,
      });

      if (!repairedItem) {
        throw error;
      }

      normalizedItems.push(await validateGeneratedReferenceItem(repairedItem, itemIndex, fetchImpl));
    }
  }

  return normalizedItems;
}
