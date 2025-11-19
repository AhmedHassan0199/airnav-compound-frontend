"use client";

import { useEffect, useState } from "react";
import { subscribeToLoader } from "@/lib/loaderManager";

export default function GlobalLoaderOverlay() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeToLoader((count) => {
      setActive(count);

      // لو فيه ريكوستات شغّالة
      if (count > 0) {
        // استنى 0.5s قبل ما تظهر اللودر
        if (!timeoutId) {
          timeoutId = setTimeout(() => {
            setVisible(true);
          }, 500);
        }
      } else {
        // مفيش ريكوستات → اخفي فورًا وامسح التايمر
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        setVisible(false);
      }
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-lg px-5 py-4 flex items-center gap-3 pointer-events-auto">
        <div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
        <div className="text-sm text-slate-700">
          جارٍ تحميل البيانات، برجاء الانتظار...
        </div>
      </div>
    </div>
  );
}
