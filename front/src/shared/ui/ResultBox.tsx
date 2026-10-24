import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import checkBig from "../assets/figma/check-grande.svg";
import { siteBox, siteBoxBodyAfterHeader, siteBoxHeader, siteText } from "./styles";

/** El recuadro grande con el círculo: verde con chulo cuando salió bien, gris con X cuando se canceló. */
export function ResultBox({ title, cancelled = false, children }: { title: string; cancelled?: boolean; children: ReactNode }) {
  return (
    <div className={cn(siteBox, "mt-[23px]! min-h-[291px]")}>
      <div className={cn(siteBoxHeader, "justify-center")}>
        <h2 className={siteText.title}>{title}</h2>
      </div>
      <div className={siteBoxBodyAfterHeader}>
        <div
          className={cn(
            "mx-auto mt-[43px] mb-[34px] grid h-[88px] w-[88px] place-items-center rounded-full text-[44px] text-white",
            cancelled ? "bg-db-gray-button" : "bg-db-green",
          )}
        >
          {cancelled ? "✕" : <img src={checkBig} alt="" width={64} height={64} />}
        </div>
        {children}
      </div>
    </div>
  );
}

/** El texto debajo del círculo */
export const resultText = cn(siteText.description, "mt-0! mb-3! text-center");
