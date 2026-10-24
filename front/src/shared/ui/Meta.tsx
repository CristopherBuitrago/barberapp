import { duration, thousands } from "../lib/format";
import clock from "../assets/figma/reloj.svg";
import pesos from "../assets/figma/pesos.svg";

const meta = "inline-flex items-center whitespace-nowrap text-[10px] font-bold text-db-text";

/** "30min" con el reloj del diseño */
export function Duration({ minutes }: { minutes: number }) {
  return (
    <span className={`${meta} gap-[5px]`}>
      <img src={clock} alt="" width={12} height={12} />
      {duration(minutes)}
    </span>
  );
}

/** "$ 20.000" con el signo del diseño */
export function Price({ value }: { value: number }) {
  return (
    <span className={`${meta} gap-[3px]`}>
      <img src={pesos} alt="$" width={6} height={11} />
      {thousands(value)}
    </span>
  );
}
