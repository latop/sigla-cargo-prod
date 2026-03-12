import { useRef, type ReactNode } from "react";
import { motion, useDragControls } from "framer-motion";
import { X, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSidebar } from "@/components/ui/sidebar";

interface FloatingPanelProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
}

export function FloatingPanel({ title, children, onClose, width = 480 }: FloatingPanelProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const { state } = useSidebar();
  const sidebarWidth = state === "collapsed" ? "3rem" : "16rem";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-foreground/10"
        style={{ left: sidebarWidth }}
        onClick={onClose}
      />

      {/* Constraints container */}
      <div
        ref={constraintsRef}
        className="fixed top-4 right-4 bottom-4 z-50 pointer-events-none"
        style={{ left: `calc(${sidebarWidth} + 1rem)` }}
      >
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={constraintsRef}
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{ width, maxWidth: "calc(100vw - 2rem)" }}
          className="pointer-events-auto absolute top-0 left-0"
        >
          <Card className="shadow-xl border-border/80 overflow-hidden">
            <CardHeader
              className="pb-3 cursor-grab active:cursor-grabbing bg-muted/30 select-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripHorizontal className="h-4 w-4 text-muted-foreground/50" />
                  <CardTitle className="text-base font-display">{title}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-[88vh] overflow-y-auto">
              {children}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
