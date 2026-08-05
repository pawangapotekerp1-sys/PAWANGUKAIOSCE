import Button from "../ui/button";

type FlashCardRecallControlsProps = {
  isSaving?: boolean;
  onSelect: (difficulty: "easy" | "medium" | "hard") => void;
  selectedDifficulty: "easy" | "medium" | "hard" | null;
};

const OPTIONS = [
  {
    value: "easy",
    label: "Mudah",
  },
  {
    value: "medium",
    label: "Sedang",
  },
  {
    value: "hard",
    label: "Sulit",
  },
] as const;

function FlashCardRecallControls({
  isSaving = false,
  onSelect,
  selectedDifficulty,
}: FlashCardRecallControlsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          data-selected={selectedDifficulty === option.value ? "true" : "false"}
          disabled={isSaving}
          type="button"
          variant={selectedDifficulty === option.value ? "secondary" : "outline"}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export default FlashCardRecallControls;
