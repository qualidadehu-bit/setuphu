import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function ConfirmPopup({ open, onClose, onConfirm, title, message, confirmLabel = "Confirmar", variant = "success" }) {
  const Icon = variant === 'success' ? CheckCircle2 : AlertCircle;
  const iconColor = variant === 'success' ? 'text-[#12B37A]' : 'text-orange-500';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Icon size={28} className={iconColor} />
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 bg-[#12B37A] hover:bg-[#0fa068] text-white"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}