"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import { Wordmark } from "./Wordmark";

export function Dialog({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="aero-dialog" aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === ref.current) onClose(); }}>
    <div className="dialog-content">
      <div className="dialog-cap"><span><i className="status-light" /><Wordmark compact /></span><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
      <div className="dialog-body"><p className="eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2>{children}</div>
    </div>
  </dialog>;
}
