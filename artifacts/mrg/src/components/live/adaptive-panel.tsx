import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

type AdaptivePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  testId: string;
  panelId?: string;
  children: ReactNode;
  footer: ReactNode;
  closeLabel: string;
  onCloseAutoFocus: (event: Event) => void;
};

type ViewportBox = { top: number; left: number; width: number; height: number };
function readViewport(): ViewportBox {
  const visual = window.visualViewport;
  return {
    top: visual?.offsetTop ?? 0,
    left: visual?.offsetLeft ?? 0,
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
  };
}

export function AdaptivePanel({
  open,
  onOpenChange,
  title,
  description,
  testId,
  panelId,
  children,
  footer,
  closeLabel,
  onCloseAutoFocus,
}: AdaptivePanelProps) {
  const { t } = useLanguage();
  const contentRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportBox>(() =>
    typeof window === "undefined" ? { top: 0, left: 0, width: 1, height: 1 } : readViewport()
  );
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const update = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setViewport(readViewport());
      });
    };
    update();
    const visual = window.visualViewport;
    visual?.addEventListener("resize", update);
    visual?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      visual?.removeEventListener("resize", update);
      visual?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [open]);
  const viewportStyle = {
    "--mrg-vv-top": `${viewport.top}px`,
    "--mrg-vv-left": `${viewport.left}px`,
    "--mrg-vv-width": `${viewport.width}px`,
    "--mrg-vv-height": `${viewport.height}px`,
  } as CSSProperties;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="mrg-panel-overlay" />
        <DialogPrimitive.Content
          id={panelId}
          data-testid={testId}
          className="mrg-adaptive-panel"
          style={viewportStyle}
          aria-describedby={`${testId}-description`}
          ref={contentRef}
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={(event) => {
            const help = contentRef.current?.querySelector<HTMLButtonElement>('.live-term-help-trigger[aria-expanded="true"]');
            if (help) {
              event.preventDefault();
              help.click();
            }
          }}
        >
          <header className="mrg-panel-header">
            <div className="mrg-panel-heading">
              <DialogPrimitive.Title className="mrg-panel-title">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description id={`${testId}-description`} className="mrg-panel-description">
                {description}
              </DialogPrimitive.Description>
              <p className="live-small" role="note">{t("Posisi manual · tanpa order · indeks belum dikalibrasi", "Manual positions · no orders · uncalibrated index")}</p>
            </div>
            <DialogPrimitive.Close asChild>
              <button className="live-icon-btn mrg-panel-dismiss" type="button" aria-label={closeLabel}>
                <X size={17} aria-hidden="true" />
              </button>
            </DialogPrimitive.Close>
          </header>
          <div className="mrg-panel-body">{children}</div>
          <footer className="mrg-panel-footer">{footer}</footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
