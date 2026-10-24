import { useCallback, useEffect, useState } from "react";
import { getAvailability, type Slot } from "@/entities/slot";
import { addDays } from "@/shared/lib";
import { SEARCH_DAYS } from "../lib/schedule";

/**
 * Las horas libres del día elegido. Si ese día no tiene, busca el próximo día con cupo
 * para ofrecerlo (nextAvailable es la primera hora de ese día).
 */
export function useDaySlots(serviceId: number | undefined, date: string, barberId: number | undefined) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) return;
    let current = true;
    setSlots(null);
    setNextAvailable(null);
    getAvailability(serviceId, date, barberId).then(async (found) => {
      if (!current) return;
      setSlots(found);
      if (found.length > 0) return;
      for (let i = 1; i <= SEARCH_DAYS; i++) {
        const later = await getAvailability(serviceId, addDays(date, i), barberId);
        if (!current) return;
        if (later.length) {
          setNextAvailable(later[0].start);
          return;
        }
      }
    });
    return () => {
      current = false;
    };
  }, [serviceId, date, barberId]);

  /** Para cuando alguien tomó la hora mientras tanto: se vuelve a pedir el mismo día */
  const reload = useCallback(() => {
    if (!serviceId) return;
    setSlots(null);
    getAvailability(serviceId, date, barberId).then(setSlots);
  }, [serviceId, date, barberId]);

  return { slots, nextAvailable, reload };
}
