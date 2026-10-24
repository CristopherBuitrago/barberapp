import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MenuButton, ProfileButton } from "@/features/app-menu";
import { business } from "@/shared/config/business";
import logo from "@/shared/assets/figma/logo.png";

/**
 * Encabezado negro con menú, logo y perfil, y el panel gris redondeado donde va el contenido.
 * El contenido está diseñado a 320 px y se escala con --db-scale.
 */
export function SiteLayout({ children, inProfile = false }: { children: ReactNode; inProfile?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-db-black text-black">
      <header className="relative flex shrink-0 justify-center">
        <div className="pointer-events-none absolute top-0 right-0 left-0 flex justify-between px-[calc(11px*var(--db-scale))] py-[calc(13px*var(--db-scale))]">
          <MenuButton variant="site" />
          <ProfileButton variant="site" inProfile={inProfile} />
        </div>
        <Link to="/" className="block h-[170px] pt-[7px] [zoom:var(--db-scale)]">
          <img className="block" src={logo} alt={business.name} width={159} height={159} />
        </Link>
      </header>
      <main className="flex-1 rounded-t-[23px] bg-db-panel md:rounded-t-[32px]">
        <div className="mx-auto flex max-w-[920px] flex-col gap-[21px] px-[18px] pt-5 pb-24 [zoom:var(--db-scale)] md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
