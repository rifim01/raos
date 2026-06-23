interface ModulPlaceholderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  eta?: string;
}

export default function ModulPlaceholder({
  title,
  description,
  icon,
  eta,
}: ModulPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
      {/* Animated ring */}
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          {icon ?? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              className="w-10 h-10" style={{ color: "var(--accent)" }}>
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <path d="M9 9h6M9 12h6M9 15h4"/>
            </svg>
          )}
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-black mb-2" style={{ color: "var(--text-primary)" }}>{title}</h1>
        <p className="text-sm max-w-md" style={{ color: "var(--text-muted)" }}>
          {description ?? "Modul ini sedang dalam proses pengembangan dan akan segera tersedia."}
        </p>
        {eta && (
          <p className="text-xs mt-2 font-semibold" style={{ color: "var(--accent)" }}>
            Estimasi tersedia: {eta}
          </p>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full"
        style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--warning)" }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--warning)" }}>
          Sedang Dikembangkan
        </span>
      </div>

      {/* RAOS branding */}
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        RAOS v3.0.1 · BY RIFIM × MAXIM
      </p>
    </div>
  );
}
