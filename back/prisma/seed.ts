import { db } from "../src/lib/db.js";

// Datos de ejemplo para desarrollo. Ajustar con los servicios y barberos reales.
async function main() {
  if ((await db.servicio.count()) > 0) {
    console.log("La base ya tiene datos, no se siembra de nuevo.");
    return;
  }

  await db.servicio.createMany({
    data: [
      { nombre: "Corte a máquina", descripcion: "Corte con máquina y acabado a tijera.", duracionMin: 30, precio: 20000 },
      { nombre: "Corte + barba", descripcion: "Corte completo y perfilado de barba con toalla caliente.", duracionMin: 60, precio: 35000 },
      { nombre: "Barba", descripcion: "Perfilado y arreglo de barba.", duracionMin: 30, precio: 15000 },
      { nombre: "Cejas", descripcion: "Arreglo de cejas con cuchilla.", duracionMin: 15, precio: 5000 },
    ],
  });

  const jornadaLunesASabado = [1, 2, 3, 4, 5, 6].map((diaSemana) => ({
    diaSemana,
    horaInicio: "09:00",
    horaFin: "19:00",
  }));

  await db.barbero.create({
    data: { nombre: "Diego", horarios: { create: jornadaLunesASabado } },
  });
  await db.barbero.create({
    data: { nombre: "Andrés", horarios: { create: jornadaLunesASabado } },
  });

  console.log("Datos de ejemplo creados.");
}

main().finally(() => db.$disconnect());
