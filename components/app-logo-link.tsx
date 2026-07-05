import Image from "next/image";
import Link from "next/link";

type AppLogoLinkProps = {
  compact?: boolean;
};

export function AppLogoLink({ compact = false }: AppLogoLinkProps) {
  return (
    <Link
      href="/panel"
      className="flex w-fit items-center gap-3 rounded-2xl transition hover:opacity-80"
      aria-label="Ir al panel docente"
    >
      <Image
        src="/logo-dia-a-dia-escolar.png"
        alt="Día a Día Escolar"
        width={compact ? 48 : 72}
        height={compact ? 48 : 72}
        className={
          compact
            ? "h-12 w-12 rounded-xl object-cover shadow-sm"
            : "h-18 w-18 rounded-2xl object-cover shadow-sm"
        }
        priority
      />

      <div className={compact ? "hidden sm:block" : ""}>
        <p className="text-sm font-bold leading-tight text-slate-900">
          Día a Día Escolar
        </p>
        <p className="text-xs text-slate-500">Panel docente</p>
      </div>
    </Link>
  );
}