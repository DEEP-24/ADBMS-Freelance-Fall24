import { DialogTitle } from "@radix-ui/react-dialog";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import ObjectID from "bson-objectid";
import * as React from "react";
import { z } from "zod";
import { TailwindContainer } from "~/components/TailwindContainer";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import TimePickerInput from "~/components/ui/time-picker-input";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { daysOfWeek, formatTime } from "~/utils/misc";
import { useFetcherCallback } from "~/utils/use-fetcher-callback";
import type { inferErrors } from "~/utils/validation";

const AddFoodTruckSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.string().min(1, "Image is required"),
  description: z.string().min(1, "Description is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  foodTruckPhoneNo: z.string().min(1, "FoodTruck Phone number is required"),
  managerPhoneNo: z.string().min(1, "Manager Phone number is required"),
  location: z.string().min(1, "Location is required"),
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const managerId = await requireUserId(request);

  const foodTruck = await db.foodTruck.findFirst({
    where: {
      staff: {
        some: {
          id: managerId,
        },
      },
    },
    include: {
      schedule: true,
    },
  });

  if (!foodTruck) {
    return redirect("/manager");
  }

  return json({ foodTruck });
};

interface ActionData {
  success: boolean;
  fieldErrors?: inferErrors<typeof AddFoodTruckSchema>;
}

export default function ManageFoodTrucks() {
  const fetcher = useFetcherCallback<ActionData>({
    onSuccess: () => {
      setModalOpen(false);
    },
  });

  const { foodTruck } = useLoaderData<typeof loader>();

  const [selectedFoodTruck, setSelectedFoodTruck] = React.useState<typeof foodTruck | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const isSubmitting = fetcher.state !== "idle";

  const [schedules, setSchedules] = React.useState<(typeof foodTruck)["schedule"]>([]);

  React.useEffect(() => {
    if (selectedFoodTruck) {
      setSchedules(selectedFoodTruck.schedule);
    } else {
      setSchedules([]);
    }
  }, [selectedFoodTruck]);

  const validateTimes = (startTime: Date, endTime: Date): boolean => {
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return false;
    }
    return startTime < endTime;
  };

  const updateSchedule = (day: string, field: keyof (typeof schedules)[0], value: Date | null) => {
    const scheduleForDay = schedules.find((s) => s.day === day);

    const updatedSchedule: (typeof schedules)[0] = {
      ...(scheduleForDay || {
        id: new ObjectID().toString(),
        foodTruckId: selectedFoodTruck?.id || "",
        day,
        startTime: "",
        endTime: "",
      }),
    };

    if (value) {
      updatedSchedule[field] = value.toISOString();
    } else {
      setSchedules((prev) => prev.filter((s) => s.day !== day));
      return;
    }

    if (!scheduleForDay && field === "startTime" && value) {
      const endTime = new Date(value);
      endTime.setHours(value.getHours() + 1);
      updatedSchedule.endTime = endTime.toISOString();
    }

    if (updatedSchedule.startTime && updatedSchedule.endTime) {
      const startTime = new Date(updatedSchedule.startTime);
      const endTime = new Date(updatedSchedule.endTime);

      if (!validateTimes(startTime, endTime)) {
        alert("Start time should be before end time.");
        return;
      }
    }

    setSchedules((prev) => [...prev.filter((s) => s.day !== day), updatedSchedule]);
  };

  const validateAndSave = () => {
    const isValid = schedules.every((schedule) => {
      const startTime = new Date(schedule.startTime);
      const endTime = new Date(schedule.endTime);
      return validateTimes(startTime, endTime);
    });

    if (!isValid) {
      alert(
        "Please ensure that all start and end times are valid and that start times are before their respective end times.",
      );
      return;
    }

    // Save the schedule here
    const formData = new FormData();

    formData.append("foodTruckId", selectedFoodTruck!.id);
    formData.append("schedules", JSON.stringify(schedules));

    fetcher.submit(formData, {
      method: "post",

      action: "/api/food-trucks/schedule",
    });
  };

  return (
    <>
      <TailwindContainer className="lg:max-w-full">
        <div className="bg-white p-10 ">
          <div className="mx-auto max-w-7xl p-4">
            <div>
              <div className="flex items-center justify-center">
                <h1 className="text-4xl font-semibold text-gray-900">
                  Manage the Schedule of your FoodTruck
                </h1>
              </div>
            </div>
            <div className="mt-16 grid grid-cols-2 gap-12">
              <article
                key={foodTruck?.id}
                className="relative isolate flex flex-col gap-8 lg:flex-row"
              >
                <div className="relative aspect-[16/9] sm:aspect-[2/1] lg:aspect-square lg:w-64 lg:shrink-0">
                  <img
                    src={foodTruck?.image}
                    alt=""
                    className="absolute inset-0 h-full w-full rounded-2xl bg-gray-50 object-cover"
                  />
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
                </div>
                <div>
                  <div className="group relative max-w-xl pb-2">
                    <p className="mt-5 text-xl  text-orange-500">{foodTruck?.name}</p>
                  </div>
                  <div className="whitespace-nowrap border-t border-gray-900/5 py-4 pl-4 pr-3 pt-2 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                    {foodTruck?.schedule.length > 0 ? (
                      <div className="flex h-40 flex-col gap-1">
                        {daysOfWeek.map((day) => {
                          const scheduleForDay = foodTruck.schedule.find((s) => s.day === day);
                          return (
                            <div key={day} className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{day}: </span>
                              <span className="text-sm font-medium text-gray-900">
                                {scheduleForDay
                                  ? `${formatTime(scheduleForDay.startTime)} - ${formatTime(scheduleForDay.endTime)}`
                                  : "Closed"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="flex h-40 items-center text-lg font-medium text-gray-900">
                        No schedule
                      </span>
                    )}
                  </div>
                  <div className="mt-6 flex border-t border-gray-900/5 pt-2">
                    <div className="relative flex items-center gap-x-4">
                      <Button
                        onClick={() => {
                          setSelectedFoodTruck(foodTruck);
                          setModalOpen(true);
                        }}
                        className="bg-orange-500 text-white hover:bg-orange-400"
                      >
                        Edit Schedule
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </TailwindContainer>

      <Dialog open={modalOpen} onOpenChange={() => setModalOpen((prev) => !prev)}>
        <DialogContent className="max-w-[70vw]">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          <div>
            <div className="w-full">
              <div className="flex flex-col gap-4 p-5">
                <input hidden />
                {daysOfWeek.map((day) => {
                  const scheduleForDay = schedules.find((s) => s.day === day);

                  return (
                    <div key={day} className="grid grid-cols-3 items-center gap-4">
                      <p className="pr-12 text-right text-sm font-bold text-gray-900">{day}</p>

                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label>Start Time</Label>
                        <TimePickerInput
                          value={
                            scheduleForDay?.startTime ? new Date(scheduleForDay.startTime) : null
                          }
                          onChange={(value) => {
                            if (!scheduleForDay) {
                              value.setHours(value.getHours() + 1);
                            }
                            updateSchedule(day, "startTime", value);
                          }}
                        />
                      </div>

                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label>End Time</Label>
                        <TimePickerInput
                          value={scheduleForDay?.endTime ? new Date(scheduleForDay.endTime) : null}
                          onChange={(value) => {
                            if (!scheduleForDay) {
                              alert("Please set a start time before setting the end time.");
                            }
                            updateSchedule(day, "endTime", value);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <DialogFooter>
                  <div className="mt-1 flex items-center justify-end gap-4">
                    <DialogClose>
                      <Button disabled={isSubmitting} variant="destructive">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button onClick={validateAndSave} color="orange">
                      Save
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
