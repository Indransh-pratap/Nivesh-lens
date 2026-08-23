"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { reportError } from "@/lib/analytics";

interface Props {
  children: React.ReactNode;
  /** Optional label so the fallback message can say what failed, e.g. "the crash simulator". */
  label?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render/runtime errors thrown by its children and shows a small
 * recoverable fallback instead of letting the whole app crash to a blank
 * white screen. Wrap any component that renders third-party chart data,
 * user-uploaded content, or anything else that could throw unexpectedly.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error, { boundary: this.props.label ?? "unlabeled" });
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl border border-[var(--negative)]/25 bg-[var(--negative-soft)] text-center">
          <AlertTriangle className="w-8 h-8 text-[var(--negative)] mx-auto mb-2" strokeWidth={1.75} />
          <p className="text-sm font-semibold text-foreground">
            {this.props.label ? `${this.props.label} couldn't be displayed.` : "Something went wrong displaying this section."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">The rest of the page is unaffected.</p>
          <Button size="sm" variant="outline" onClick={this.reset} className="mt-4 gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
