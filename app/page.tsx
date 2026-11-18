import prisma from "@/lib/prisma";
import HomeInteractive from "@/components/HomeInteractive";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [totalWaiting, totalCompleted, queues, venue] = await Promise.all([
    prisma.queueEntry.count({ where: { status: "WAITING" } }),
    prisma.queueEntry.count({ where: { status: "COMPLETED" } }),
    prisma.queue.findMany({
      include: {
        _count: { select: { entries: { where: { status: "WAITING" } } } },
      },
    }),
    prisma.venue.findFirst({
      include: { counters: true },
    }),
  ]);

  const activeCounters =
    venue?.counters.filter((c) => c.status === "OPEN" || c.status === "BUSY")
      .length || 0;

  return (
    <HomeInteractive
      initialQueues={queues}
      venue={venue}
      totalWaiting={totalWaiting}
      totalCompleted={totalCompleted}
      activeCounters={activeCounters}
    />
  );
}
