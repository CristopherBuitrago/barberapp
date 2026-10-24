import { useEffect, useState } from "react";
import type { Barber } from "@/entities/barber";
import { ServiceHeader, type Service } from "@/entities/service";
import type { Slot } from "@/entities/slot";
import { DAYS_SHORT, MONTHS, addDays, cn, longDate, startOfWeek, time12, time24, weekday } from "@/shared/lib";
import { resolveImageUrl } from "@/shared/api";
import { Duration, Price, siteActions, siteBox, siteBoxBody, siteButton, siteText } from "@/shared/ui";
import arrowLeft from "@/shared/assets/figma/flecha-izq.svg";
import arrowRight from "@/shared/assets/figma/flecha-der.svg";
import { BOOKABLE_DAYS_PER_WEEK, DAY_PARTS, firstBookableDay, inDayPart } from "../lib/schedule";

const chip =
  "h-[17px] cursor-pointer rounded-[5px] border border-solid px-2 py-0 text-[10px] font-bold [font-family:inherit]";
const chipOff = "border-db-day-border bg-white text-db-text";
const chipOn = "border-db-blue bg-db-blue text-white";

/** Paso 2: barbero, día de la semana y hora, agrupada por jornada. */
export function ScheduleStep({
  service,
  barbers,
  barberId,
  onBarber,
  date,
  onDate,
  week,
  onWeek,
  slots,
  nextAvailable,
  chosen,
  onChoose,
  error,
  onBack,
  onNext,
}: {
  service: Service;
  barbers: Barber[];
  barberId: number | undefined;
  onBarber: (id: number | undefined) => void;
  date: string;
  onDate: (date: string) => void;
  /** El lunes de la semana que se está viendo */
  week: string;
  onWeek: (monday: string) => void;
  slots: Slot[] | null;
  nextAvailable: string | null;
  chosen: Slot | null;
  onChoose: (slot: Slot) => void;
  error: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const [openPart, setOpenPart] = useState<string | null>(null);
  useEffect(() => setOpenPart(null), [slots]);

  const first = firstBookableDay();
  const days = Array.from({ length: BOOKABLE_DAYS_PER_WEEK }, (_, i) => addDays(week, i));
  const part = DAY_PARTS.find((p) => p.name === openPart);

  function goToDate(next: string) {
    onDate(next);
    onWeek(startOfWeek(next));
  }

  function moveWeek(daysToMove: number) {
    const monday = addDays(week, daysToMove);
    onWeek(monday);
    onDate(monday < first ? first : monday);
  }

  return (
    <>
      <div className={siteBox}>
        <div className={siteBoxBody}>
          {service.imageUrl ? (
            // Con foto: miniatura a la izquierda, y la duración y el precio debajo del nombre
            <>
              <div className="flex items-center gap-2">
                <img
                  className="h-[34px] w-[46px] shrink-0 rounded-[4px] bg-db-gray-photo object-cover"
                  src={resolveImageUrl(service.imageUrl)!}
                  alt={service.name}
                />
                <div className="min-w-0 flex-1">
                  <h2 className={siteText.title}>{service.name}</h2>
                  <div className="mt-1 flex items-center justify-between">
                    <Duration minutes={service.durationMin} />
                    <Price value={service.price} />
                  </div>
                </div>
              </div>
              <p className={cn(siteText.description, "mt-2! mb-0!")}>{service.description}</p>
            </>
          ) : (
            <>
              <ServiceHeader service={service} />
              <p className={cn(siteText.description, "mt-2! mb-[6px]!")}>{service.description}</p>
              <div className="flex justify-end">
                <Price value={service.price} />
              </div>
            </>
          )}
        </div>
      </div>

      {barbers.length > 1 && (
        <>
          <h3 className={siteText.section}>Barbero</h3>
          <div className="flex flex-wrap gap-[6px]">
            <button className={cn(chip, !barberId ? chipOn : chipOff)} onClick={() => onBarber(undefined)}>
              Cualquiera
            </button>
            {barbers.map((b) => (
              <button key={b.id} className={cn(chip, barberId === b.id ? chipOn : chipOff)} onClick={() => onBarber(b.id)}>
                {b.name}
              </button>
            ))}
          </div>
        </>
      )}

      <h3 className={siteText.section}>Seleccionar fecha</h3>
      <p className="mt-0 mb-[6px] text-center text-[12px] font-bold first-letter:uppercase">
        {MONTHS[Number(date.slice(5, 7)) - 1]} {date.slice(0, 4)}
      </p>
      <div className="mx-auto flex max-w-[300px] items-center justify-between px-[6px]">
        <button
          className="grid cursor-pointer border-0 bg-transparent p-0 disabled:cursor-default disabled:opacity-35"
          aria-label="Semana anterior"
          disabled={week <= startOfWeek(first)}
          onClick={() => moveWeek(-7)}
        >
          <img src={arrowLeft} alt="" width={20} height={20} />
        </button>
        {days.map((d) => (
          <button
            key={d}
            className={cn(
              "flex h-[21px] w-[21px] cursor-pointer flex-col items-center justify-center rounded-full border border-solid bg-white p-0 text-[7px] leading-[normal] font-bold text-black [font-family:inherit]",
              d === date ? "border-db-step-blue" : "border-db-day-border",
              "disabled:cursor-default disabled:bg-[rgb(255_255_255/53%)] disabled:text-db-day-border",
            )}
            disabled={d < first}
            aria-label={longDate(d)}
            aria-pressed={d === date}
            onClick={() => onDate(d)}
          >
            <span>{DAYS_SHORT[weekday(d)]}</span>
            <span>{Number(d.slice(8, 10))}</span>
          </button>
        ))}
        <button className="grid cursor-pointer border-0 bg-transparent p-0" aria-label="Semana siguiente" onClick={() => moveWeek(7)}>
          <img src={arrowRight} alt="" width={20} height={20} />
        </button>
      </div>

      {!slots && <p className={siteText.loading}>Buscando horas libres…</p>}
      {slots?.length === 0 && (
        <div className="mt-4 text-center">
          <p className="mt-0 mb-[6px] text-[10px] font-bold text-db-text-soft">No quedan horas este día.</p>
          {nextAvailable && (
            <button className={siteText.link} onClick={() => goToDate(nextAvailable.slice(0, 10))}>
              Próxima disponible: {longDate(nextAvailable)}, {time12(nextAvailable)}
            </button>
          )}
        </div>
      )}
      {slots && slots.length > 0 && (
        <>
          <div className="mx-auto mt-6 grid w-full max-w-[300px] grid-cols-3 gap-[10px] px-[9px]">
            {DAY_PARTS.map((p) => {
              const free = inDayPart(slots, p);
              const hasChosen = chosen && free.some((s) => s.start === chosen.start);
              return (
                <div key={p.name} className="flex flex-col items-center gap-[3px]">
                  <button
                    className={siteButton("primary", {
                      disabledBg: "disabled:bg-db-gray-slot",
                      extra: cn(
                        "w-[67px] px-0!",
                        openPart === p.name && "outline-2 outline-offset-1 outline-db-step-blue outline-solid",
                      ),
                    })}
                    disabled={free.length === 0}
                    aria-expanded={openPart === p.name}
                    onClick={() => setOpenPart(openPart === p.name ? null : p.name)}
                  >
                    {hasChosen ? time24(chosen.start) : p.name}
                  </button>
                  {free.length === 0 && (
                    <span className="max-w-[100px] text-center text-[8px] font-bold text-db-text-soft">
                      No hay horarios disponibles para esta jornada
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {part && (
            <div className="mt-3 flex flex-wrap gap-[6px] px-[9px]">
              {inDayPart(slots, part).map((s) => (
                <button
                  key={s.start}
                  className={cn(chip, chosen?.start === s.start ? chipOn : chipOff)}
                  onClick={() => {
                    onChoose(s);
                    setOpenPart(null);
                  }}
                >
                  {time24(s.start)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className={siteText.error}>{error}</p>}
      <div className={siteActions}>
        <button className={siteButton("danger")} onClick={onBack}>Atrás</button>
        <button className={siteButton("primary")} disabled={!chosen} onClick={onNext}>Siguiente</button>
      </div>
    </>
  );
}
