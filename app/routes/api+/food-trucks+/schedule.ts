import type { FoodTruckSchedule } from "@prisma/client";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { badRequest } from "~/utils/misc.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();

  const foodTruckId = formData.get("foodTruckId")?.toString();
  const _schedules = formData.get("schedules")?.toString();

  if (!foodTruckId || !_schedules) {
    return badRequest({ success: false, message: "Invalid request" });
  }

  const schedules = JSON.parse(_schedules) as FoodTruckSchedule[];
  // remove
  await db.foodTruck.update({
    where: { id: foodTruckId },
    data: {
      schedule: {
        deleteMany: {},
        createMany: {
          data: schedules.map((schedule) => ({
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          })),
        },
      },
    },
  });

  return json({ success: true });
};
