import { Fragment } from "react";
import { cn } from "../lib/cn";
import check from "../assets/figma/check.svg";

/** Los pasos de la reserva arriba de la tarjeta: los hechos con chulo, el actual en azul. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="m-0 flex list-none items-center justify-between p-0 text-[10px] font-bold text-db-text">
      {steps.map((step, i) => (
        <Fragment key={step}>
          {i > 0 && <li className="mx-1 h-px flex-[1_1_28px] bg-db-step-line" aria-hidden="true" />}
          <li className="flex items-center gap-1" aria-current={i === current ? "step" : undefined}>
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full text-[12px]",
                i <= current ? "bg-db-step-blue text-white" : "bg-db-step-off text-db-text-soft",
              )}
            >
              {i < current ? <img src={check} alt="Hecho" width={15} height={15} /> : i + 1}
            </span>
            {step}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
