import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import {
  listQuestionTaxonomy,
  type QuestionTaxonomyBlock,
} from "../../lib/api/question-authoring-api";
import {
  deliverGeneratedItemToQuestionBank,
  deliverGeneratedItemToScheduledEvent,
  getQuestionGenerationBatchDetail,
  updateGeneratedDraftItem,
} from "../../lib/api/question-generator-api";
import {
  listScheduledOpsEvents,
  type ScheduledOpsEventSummary,
} from "../../lib/api/scheduled-tryout-api";
import type {
  QuestionGenerationBatchDetailViewModel,
  QuestionGeneratorDeliveryViewModel,
  QuestionGeneratorItemViewModel,
} from "../../lib/mappers/question-generator-mappers";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Loader2, AlertCircle, Sparkles, BookOpen } from "lucide-react";
import DeliveryDialog from "./delivery-dialog";
import GeneratedDraftEditor from "./generated-draft-editor";

type ActiveDeliveryState = {
  itemId: string;
  destinationType: "question_bank" | "scheduled_event";
};

function summarizeDeliveries(deliveries: QuestionGeneratorDeliveryViewModel[]) {
  if (!deliveries.length) {
    return "Belum dikirim";
  }

  const questionBankCount = deliveries.filter((delivery) => delivery.destinationType === "question_bank").length;
  const scheduledEventCount = deliveries.filter((delivery) => delivery.destinationType === "scheduled_event").length;

  if (questionBankCount > 0 && scheduledEventCount === 0) {
    return `Bank soal ${questionBankCount}x`;
  }

  if (scheduledEventCount > 0 && questionBankCount === 0) {
    return `Sesi ${scheduledEventCount}x`;
  }

  return `Bank soal ${questionBankCount}x + Sesi ${scheduledEventCount}x`;
}

function formatDeliveryTimestamp(value: string) {
  return `${new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value)).replace(".", ":")} WIB`;
}

function resolveQuestionBankDeliveryLabel(
  delivery: QuestionGeneratorDeliveryViewModel,
  taxonomy: QuestionTaxonomyBlock[],
) {
  const block = taxonomy.find((item) => item.id === delivery.blockId);
  const topic = block?.topics.find((item) => item.id === delivery.topicId);

  if (block && topic) {
    return `${block.name} / ${topic.name}`;
  }

  if (block) {
    return block.name;
  }

  return delivery.topicId ?? delivery.blockId ?? "Bank soal";
}

function resolveScheduledEventDeliveryLabel(
  delivery: QuestionGeneratorDeliveryViewModel,
  events: ScheduledOpsEventSummary[],
) {
  return events.find((event) => event.id === delivery.destinationEventId)?.title
    ?? delivery.destinationEventId
    ?? "Sesi terjadwal";
}

function updateItem(
  detail: QuestionGenerationBatchDetailViewModel,
  itemId: string,
  updater: (item: QuestionGeneratorItemViewModel) => QuestionGeneratorItemViewModel,
) {
  return {
    ...detail,
    items: detail.items.map((item) => item.id === itemId ? updater(item) : item),
  };
}

function QuestionGeneratorReviewFlow() {
  const { batchId = "" } = useParams();
  const [detail, setDetail] = useState<QuestionGenerationBatchDetailViewModel | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDeliveryState | null>(null);
  const detailQuery = useQuery({
    enabled: Boolean(batchId),
    queryKey: ["question-generator-batch-detail", batchId],
    queryFn: () => getQuestionGenerationBatchDetail({ batchId }),
  });
  const taxonomyQuery = useQuery({
    queryKey: ["question-generator-taxonomy"],
    queryFn: () => listQuestionTaxonomy(),
  });
  const eventsQuery = useQuery({
    queryKey: ["question-generator-events"],
    queryFn: () => listScheduledOpsEvents(),
  });
  const saveMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateGeneratedDraftItem>[0]) => updateGeneratedDraftItem(input),
    onSuccess: (_, variables) => {
      setDetail((current) => {
        if (!current) {
          return current;
        }

        return updateItem(current, variables.generationItemId, (item) => ({
          ...item,
          stem: variables.stem,
          options: variables.options,
          correctOptionKey: variables.correctOptionKey,
          explanationText: variables.explanationText,
          status: "draft_edited",
          editedAt: new Date().toISOString(),
        }));
      });
    },
  });
  const questionBankMutation = useMutation({
    mutationFn: (input: Parameters<typeof deliverGeneratedItemToQuestionBank>[0]) =>
      deliverGeneratedItemToQuestionBank(input),
    onSuccess: (result, variables) => {
      setDetail((current) => {
        if (!current) {
          return current;
        }

        return updateItem(current, variables.generationItemId, (item) => {
          const nextDelivery: QuestionGeneratorDeliveryViewModel = {
            id: result.deliveryId,
            destinationType: "question_bank",
            destinationQuestionId: result.questionId,
            destinationEventId: null,
            destinationEventQuestionId: null,
            blockId: variables.blockId,
            topicId: variables.topicId,
            deliveredBy: null,
            createdAt: new Date().toISOString(),
          };
          const deliveries: QuestionGeneratorDeliveryViewModel[] = [
            ...item.deliveries,
            nextDelivery,
          ];

          return {
            ...item,
            deliveries,
            deliverySummaryLabel: summarizeDeliveries(deliveries),
          };
        });
      });
      setActiveDelivery(null);
    },
  });
  const scheduledEventMutation = useMutation({
    mutationFn: (input: Parameters<typeof deliverGeneratedItemToScheduledEvent>[0]) =>
      deliverGeneratedItemToScheduledEvent(input),
    onSuccess: (result, variables) => {
      setDetail((current) => {
        if (!current) {
          return current;
        }

        return updateItem(current, variables.generationItemId, (item) => {
          const nextDelivery: QuestionGeneratorDeliveryViewModel = {
            id: result.deliveryId,
            destinationType: "scheduled_event",
            destinationQuestionId: null,
            destinationEventId: variables.eventId,
            destinationEventQuestionId: result.eventQuestionId,
            blockId: null,
            topicId: null,
            deliveredBy: null,
            createdAt: new Date().toISOString(),
          };
          const deliveries: QuestionGeneratorDeliveryViewModel[] = [
            ...item.deliveries,
            nextDelivery,
          ];

          return {
            ...item,
            deliveries,
            deliverySummaryLabel: summarizeDeliveries(deliveries),
          };
        });
      });
      setActiveDelivery(null);
    },
  });

  useEffect(() => {
    if (detailQuery.data) {
      setDetail(detailQuery.data);
    }
  }, [detailQuery.data]);

  const activeItem = detail?.items.find((item) => item.id === activeDelivery?.itemId) ?? null;
  const taxonomy = (taxonomyQuery.data as QuestionTaxonomyBlock[] | undefined) ?? [];
  const events = (eventsQuery.data as ScheduledOpsEventSummary[] | undefined) ?? [];
  const isDeliverySubmitting = questionBankMutation.isPending || scheduledEventMutation.isPending;
  const isQuestionBankDeliveryReady = Boolean(taxonomyQuery.data);
  const isScheduledEventDeliveryReady = Boolean(eventsQuery.data);
  const isActiveDeliveryReady = activeDelivery?.destinationType === "question_bank"
    ? isQuestionBankDeliveryReady
    : activeDelivery?.destinationType === "scheduled_event"
      ? isScheduledEventDeliveryReady
      : false;

  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center text-muted-foreground border rounded-2xl bg-card/60 shadow-sm backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div>
          <h3 className="text-lg font-bold text-foreground">Hasil soal sedang dimuat</h3>
          <p className="text-sm">Soal, referensi, dan riwayat kirim sedang dimuat.</p>
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Hasil soal belum tersedia</AlertTitle>
        <AlertDescription>Hasil soal belum bisa dimuat.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Tinjau Hasil Soal
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tersusun {detail.batch.generatedCount} soal dari {detail.batch.referenceCount} referensi. Semua
              soal masih bisa diedit setelah dikirim.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 text-xs font-semibold bg-primary/5 text-primary border-primary/20">
              {detail.batch.statusLabel}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">
              {detail.batch.targetQuestionCount} target soal
            </Badge>
          </div>
        </div>
      </div>

      {/* Reference Summary */}
      <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
        <h2 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Soal Acuan
        </h2>
        <div className="grid gap-3">
          {detail.references.map((reference) => (
            <div key={reference.id} className="rounded-xl border border-border/80 bg-background/50 p-4">
              <p className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">Referensi {reference.order}</p>
              <p className="mt-1 text-sm text-foreground leading-relaxed">{reference.stem}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {detail.items.map((item) => (
          <GeneratedDraftEditor
            deliveryHistory={item.deliveries.map((delivery) => ({
              id: delivery.id,
              destinationLabel: delivery.destinationType === "question_bank"
                ? resolveQuestionBankDeliveryLabel(delivery, taxonomy)
                : resolveScheduledEventDeliveryLabel(delivery, events),
              timestampLabel: formatDeliveryTimestamp(delivery.createdAt),
              typeLabel: delivery.destinationType === "question_bank"
                ? "Bank soal"
                : "Sesi terjadwal",
            }))}
            key={item.id}
            isDistributing={isDeliverySubmitting && activeDelivery?.itemId === item.id}
            isSaving={saveMutation.isPending && saveMutation.variables?.generationItemId === item.id}
            item={item}
            onDistributeToQuestionBank={() =>
              setActiveDelivery({
                itemId: item.id,
                destinationType: "question_bank",
              })}
            onDistributeToScheduledEvent={() =>
              setActiveDelivery({
                itemId: item.id,
                destinationType: "scheduled_event",
              })}
            onSave={(input) => saveMutation.mutate(input)}
          />
        ))}
      </div>

      <DeliveryDialog
        destinationType={activeDelivery?.destinationType ?? "question_bank"}
        events={(eventsQuery.data as ScheduledOpsEventSummary[] | undefined) ?? []}
        isSubmitting={isDeliverySubmitting}
        key={activeDelivery ? `${activeDelivery.itemId}-${activeDelivery.destinationType}` : "closed"}
        onClose={() => setActiveDelivery(null)}
        onSubmit={(input) => {
          if (!activeDelivery) {
            return;
          }

          if (activeDelivery.destinationType === "question_bank" && "blockId" in input) {
            questionBankMutation.mutate({
              generationItemId: activeDelivery.itemId,
              blockId: input.blockId,
              topicId: input.topicId,
            });
            return;
          }

          if (activeDelivery.destinationType === "scheduled_event" && "eventId" in input) {
            scheduledEventMutation.mutate({
              generationItemId: activeDelivery.itemId,
              eventId: input.eventId,
            });
          }
        }}
        open={Boolean(activeDelivery && isActiveDeliveryReady)}
        taxonomy={taxonomy}
      />
    </div>
  );
}

export default QuestionGeneratorReviewFlow;
