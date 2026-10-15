import type { ElementType, KeyboardEvent } from "react";
import { Link } from "react-router";
import { ArrowRight, FlaskConical, Plus, Stethoscope, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button, getButtonStyleProps } from "../../../components/ui/button";
import {
  STANDARD_BLOCKS,
  getBlockQuestionCount,
} from "../questions-page-blocks";

export interface QuestionBlockSelectionViewProps {
  basePath: string; // "/admin/questions" or "/app/questions"
  questions: Array<{ blockName: string | null }>;
  onSelectBlock: (blockId: string) => void;
}

const BLOCK_VISUALS: Record<
  string,
  {
    icon: ElementType;
    accentBg: string;
  }
> = {
  "clinical-science": {
    icon: Stethoscope,
    accentBg: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
  },
  "pharmaceutical-science": {
    icon: FlaskConical,
    accentBg: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
  },
  "social-behavioural-administration": {
    icon: Users,
    accentBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  },
};

export default function QuestionBlockSelectionView({
  basePath,
  questions,
  onSelectBlock,
}: QuestionBlockSelectionViewProps) {
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, blockId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectBlock(blockId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Control Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Bank Soal
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Pilih blok bidang farmasi untuk melihat, mengelola, menyunting, dan menyaring bank soal.
          </p>
        </div>
        <Link
          {...getButtonStyleProps({
            className: "gap-2 sm:min-w-[11rem] h-10 px-5 text-sm font-bold shadow-md shadow-primary/20",
            size: "sm",
            variant: "primary",
          })}
          to={`${basePath}/new`}
        >
          <Plus className="h-4 w-4" />
          Tambah soal
        </Link>
      </div>

      {/* Block Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {STANDARD_BLOCKS.map((block) => {
          const visuals = BLOCK_VISUALS[block.id] ?? {
            icon: Stethoscope,
            accentBg: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
          };
          const Icon = visuals.icon;
          const count = getBlockQuestionCount(questions, block);

          return (
            <Card
              key={block.id}
              role="article"
              tabIndex={0}
              aria-label={block.name}
              className="group relative flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => onSelectBlock(block.id)}
              onKeyDown={(event) => handleCardKeyDown(event, block.id)}
            >
              <CardHeader className="pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${visuals.accentBg} transition-transform group-hover:scale-105`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="font-semibold">
                    {count} Soal
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {block.name}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {block.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 pb-6 mt-auto">
                <Button
                  variant="primary"
                  className="w-full justify-center shadow-sm font-bold gap-2 cursor-pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectBlock(block.id);
                  }}
                >
                  Buka Bank Soal
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
