import { Link } from "react-router";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "../../lib/utils";
import type { LucideIcon } from "lucide-react";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  actionLabel: string;
  colorPreset?: "blue" | "emerald" | "purple" | "orange" | "rose" | "cyan";
  className?: string;
  isLocked?: boolean;
};

const colorStyles = {
  blue: "from-blue-500/10 to-blue-500/5 hover:border-blue-500/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white",
  emerald: "from-emerald-500/10 to-emerald-500/5 hover:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
  purple: "from-purple-500/10 to-purple-500/5 hover:border-purple-500/30 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
  orange: "from-orange-500/10 to-orange-500/5 hover:border-orange-500/30 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white",
  rose: "from-rose-500/10 to-rose-500/5 hover:border-rose-500/30 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white",
  cyan: "from-cyan-500/10 to-cyan-500/5 hover:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white",
};

const bgDecorStyles = {
  blue: "bg-blue-500/5",
  emerald: "bg-emerald-500/5",
  purple: "bg-purple-500/5",
  orange: "bg-orange-500/5",
  rose: "bg-rose-500/5",
  cyan: "bg-cyan-500/5",
};

export function FeatureCard({
  title,
  description,
  icon: Icon,
  href,
  actionLabel,
  colorPreset = "blue",
  className,
  isLocked = false,
}: FeatureCardProps) {
  const CardWrapper = isLocked ? "div" : Link;

  return (
    <CardWrapper
      to={isLocked ? undefined : href}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-card transition-all duration-500",
        isLocked 
          ? "opacity-80 grayscale-[0.5] cursor-not-allowed" 
          : "hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5",
        className
      )}
    >
      {/* Background Decor */}
      <div
        className={cn(
          "absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[80px] transition-all duration-500 opacity-40",
          bgDecorStyles[colorPreset],
          !isLocked && "group-hover:scale-150 group-hover:opacity-70"
        )}
      />
      
      <div className="relative p-8 md:p-10 z-10 flex flex-col grow">
        <div className="mb-8 flex items-center justify-between">
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm transition-all duration-500",
              colorStyles[colorPreset],
              !isLocked && "group-hover:scale-110 group-hover:rotate-3"
            )}
          >
            <Icon className="h-10 w-10" />
          </div>
          
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 transition-all duration-500",
            isLocked ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-2"
          )}>
            {isLocked ? <Lock className="h-5 w-5 text-muted-foreground" /> : <ArrowRight className="h-5 w-5" />}
          </div>
        </div>
        
        <h3 className={cn("mb-3 text-2xl font-extrabold tracking-tight text-foreground transition-colors", !isLocked && "group-hover:text-primary")}>
          {title}
        </h3>
        
        <p className="text-base leading-relaxed text-muted-foreground grow">
          {description}
        </p>

        {isLocked && (
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-destructive bg-destructive/10 px-4 py-2.5 rounded-xl w-fit">
            <Lock className="h-4 w-4" />
            Butuh Pengaturan API Key (BYOK)
          </div>
        )}
      </div>
      
      {/* Interactive Footer line */}
      <div className="relative z-10 px-8 pb-8 md:px-10">
        <div className={cn("flex items-center text-sm font-bold text-muted-foreground transition-colors duration-300", !isLocked && "group-hover:text-primary")}>
          {isLocked ? "Terkunci" : actionLabel}
          <div className={cn("ml-4 h-[2px] grow bg-border/50 relative overflow-hidden transition-all duration-500", !isLocked && "group-hover:bg-primary/20")}>
             {!isLocked && <div className="absolute inset-y-0 left-0 w-0 bg-primary transition-all duration-700 ease-out group-hover:w-full" />}
          </div>
        </div>
      </div>
    </CardWrapper>
  );
}
