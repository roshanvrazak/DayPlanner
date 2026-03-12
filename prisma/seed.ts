import { PrismaClient, TaskStatus } from "@prisma/client";
import { addDays, startOfWeek } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  // Create default user
  const user = await prisma.user.upsert({
    where: { id: "default-user" },
    update: {},
    create: {
      id: "default-user",
      name: "Default User",
      dayStartTime: "09:00",
      dayEndTime: "17:00",
      strictMode: true,
    },
  });

  console.log("Created user:", user.name);

  // Clear existing tasks for clean seed
  await prisma.timeBlock.deleteMany({ where: { task: { userId: user.id } } });
  await prisma.task.deleteMany({ where: { userId: user.id } });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday

  // Sample backlog tasks
  const tasks = [
    { title: "Design system architecture", duration: 90, priority: 1, deadline: addDays(weekStart, 1) },
    { title: "Write API documentation", duration: 60, priority: 2, deadline: addDays(weekStart, 2) },
    { title: "Code review: auth module", duration: 45, priority: 1, deadline: addDays(weekStart, 1) },
    { title: "Update dependencies", duration: 30, priority: 3, deadline: addDays(weekStart, 4) },
    { title: "Team standup prep", duration: 15, priority: 2, deadline: addDays(weekStart, 0) },
    { title: "Implement user dashboard", duration: 120, priority: 1, deadline: addDays(weekStart, 3) },
    { title: "Write unit tests", duration: 60, priority: 2, deadline: addDays(weekStart, 3) },
    { title: "Fix login bug", duration: 45, priority: 1, deadline: addDays(weekStart, 0) },
    { title: "Refactor database queries", duration: 75, priority: 2, deadline: addDays(weekStart, 5) },
    { title: "Prepare sprint demo", duration: 30, priority: 3, deadline: addDays(weekStart, 4) },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        status: TaskStatus.BACKLOG,
        userId: user.id,
      },
    });
  }

  console.log(`Seeded ${tasks.length} tasks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
