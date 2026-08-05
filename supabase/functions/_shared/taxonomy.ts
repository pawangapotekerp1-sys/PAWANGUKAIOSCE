export type TaxonomyBlockRecord = {
  id: string;
  name: string;
};

export type TaxonomyTopicRecord = {
  id: string;
  name: string;
  blockId: string | null;
};

export type TaxonomyLookup = {
  blocks: TaxonomyBlockRecord[];
  topics: TaxonomyTopicRecord[];
};

export function normalizeTaxonomyName(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTaxonomyMaps(taxonomy: TaxonomyLookup) {
  const blockByName = new Map<string, TaxonomyBlockRecord>();
  const topicByName = new Map<string, TaxonomyTopicRecord>();

  for (const block of taxonomy.blocks) {
    blockByName.set(normalizeTaxonomyName(block.name), block);
  }

  for (const topic of taxonomy.topics) {
    topicByName.set(normalizeTaxonomyName(topic.name), topic);
  }

  return {
    blockByName,
    topicByName,
  };
}
