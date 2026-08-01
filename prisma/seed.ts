import { PrismaClient, Dominio, Recurrencia } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "gomezbarrioshermerson@gmail.com" },
    update: {},
    create: {
      email: "gomezbarrioshermerson@gmail.com",
      nombre: "Hemerson",
    },
  });

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      dominio: Dominio.ESTUDIO,
      titulo: "Estudiar 10 horas por semana",
      metrica: "horas/semana",
      valorObjetivo: 10,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        userId: user.id,
        dominio: Dominio.LIMPIEZA,
        titulo: "Lavar platos",
        recurrencia: Recurrencia.DIARIA,
        duracionMin: 15,
      },
      {
        userId: user.id,
        dominio: Dominio.LIMPIEZA,
        titulo: "Aspirar la casa",
        recurrencia: Recurrencia.SEMANAL,
        diasSemana: [6], // sábado
        duracionMin: 30,
      },
      {
        userId: user.id,
        goalId: goal.id,
        dominio: Dominio.ESTUDIO,
        titulo: "Sesión de estudio (2 pomodoros)",
        recurrencia: Recurrencia.SEMANAL,
        diasSemana: [1, 2, 3, 4, 5], // lunes a viernes
        duracionMin: 60,
      },
      {
        userId: user.id,
        dominio: Dominio.COMIDAS,
        titulo: "Preparar almuerzo del día siguiente",
        recurrencia: Recurrencia.DIARIA,
        duracionMin: 20,
      },
      {
        userId: user.id,
        dominio: Dominio.TIEMPO_LIBRE,
        titulo: "30 min sin pantallas",
        recurrencia: Recurrencia.DIARIA,
        duracionMin: 30,
      },
    ],
  });

  console.log("Seed completado: usuario", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
