import * as React from "react";
import { Badge } from "@/components/ui/Badge";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <Badge variant="brand" className="px-2.5 py-1 text-[10px] uppercase tracking-wider">
          {eyebrow}
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-2">{title}</h1>
        <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
