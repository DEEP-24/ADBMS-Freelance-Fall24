import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import ObjectID from "bson-objectid";

import * as React from "react";
import slugify from "slugify";
import { z } from "zod";
import { TailwindContainer } from "~/components/TailwindContainer";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import TimePickerInput from "~/components/ui/time-picker-input";
import { db } from "~/lib/db.server";
import { createPasswordHash, daysOfWeek, formatTime } from "~/utils/misc";
import { badRequest } from "~/utils/misc.server";
import { useFetcherCallback } from "~/utils/use-fetcher-callback";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";

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

export const loader = async () => {
  const foodTrucks = await db.foodTruck.findMany({
    include: {
      schedule: true,
    },
  });

  return json({ foodTrucks });
};

interface ActionData {
  success: boolean;
  fieldErrors?: inferErrors<typeof AddFoodTruckSchema>;
}

export const action: ActionFunction = async ({ request }) => {
  const { fields, fieldErrors } = await validateAction(request, AddFoodTruckSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors });
  }

  await db.foodTruck.create({
    data: {
      name: fields.name,
      image: fields.image,
      slug: slugify(fields.name, { lower: true, strict: true }),
      description: fields.description,
      phoneNo: fields.foodTruckPhoneNo,
      location: fields.location,
      staff: {
        create: {
          email: fields.email,
          passwordHash: await createPasswordHash(fields.password),
          role: "MANAGER",
          firstName: fields.name,
          lastName: "Owner",
          phoneNo: fields.managerPhoneNo,
        },
      },
    },
  });

  await db.manager.create({
    data: {
      email: fields.email,
      passwordHash: await createPasswordHash(fields.password),
      firstName: fields.name,
      lastName: "Owner",
      phoneNo: fields.managerPhoneNo,
    },
  });
  return json({ success: true });
};

export default function ManageFoodTrucks() {
  const fetcher = useFetcherCallback<ActionData>({
    onSuccess: () => {
      setIsAddModalOpen(false);
      setIsScheduleModalOpen(false);
    },
  });

  const { foodTrucks } = useLoaderData<typeof loader>();

  type _FoodTruck = (typeof foodTrucks)[0];

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  const [selectedFoodTruck, setSelectedFoodTruck] = React.useState<_FoodTruck | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false);

  const isSubmitting = fetcher.state !== "idle";

  const [schedules, setSchedules] = React.useState<(typeof foodTrucks)[0]["schedule"]>([]);

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
                <h1 className="text-4xl font-semibold text-gray-900">Food Trucks</h1>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <Button
                  className="bg-orange-500 text-white hover:bg-orange-400"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Add
                </Button>
              </div>
            </div>
            <div className="mt-16 grid grid-cols-2 gap-12">
              {foodTrucks.map((foodTruck) => (
                <article
                  key={foodTruck.id}
                  className="relative isolate flex flex-col gap-8 lg:flex-row"
                >
                  <div className="relative aspect-[16/9] sm:aspect-[2/1] lg:aspect-square lg:w-64 lg:shrink-0">
                    <img
                      src={foodTruck.image}
                      alt=""
                      className="absolute inset-0 h-full w-full rounded-2xl bg-gray-50 object-cover"
                    />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
                  </div>
                  <div>
                    <div className="group relative max-w-xl pb-2">
                      <p className="mt-5 text-xl  text-orange-500">{foodTruck.name}</p>
                    </div>
                    <div className="whitespace-nowrap border-t border-gray-900/5 py-4 pl-4 pr-3 pt-2 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                      {/* {foodTruck.schedule.length > 0 ? (
                        <div className="flex h-40 flex-col gap-1">
                          {foodTruck.schedule.map((s) => (
                            <div key={s.id} className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{s.day}: </span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatTime(s.startTime)} - {formatTime(s.endTime)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="flex h-40 items-center text-lg font-medium text-gray-900">
                          No schedule
                        </span>
                      )} */}

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
                          className="bg-orange-500 text-white hover:bg-orange-400"
                          onClick={() => {
                            setSelectedFoodTruck(foodTruck);
                            setIsScheduleModalOpen(true);
                          }}
                        >
                          Edit Schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </TailwindContainer>

      <Dialog open={isAddModalOpen} onOpenChange={() => setIsAddModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add FoodTruck</DialogTitle>
          </DialogHeader>
          <fetcher.Form method="post">
            <fieldset
              disabled={isSubmitting}
              className="flex flex-col gap-4 items-center justify-center p-3"
            >
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input type="text" name="name" required />

                {fetcher.data?.fieldErrors?.name && (
                  <p className="text-sm text-red-500">{fetcher.data.fieldErrors.name}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="image">Image</Label>
                <Input name="image" type="url" required />

                {fetcher.data?.fieldErrors?.image && (
                  <p className="text-sm text-red-500">{fetcher.data.fieldErrors.image}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea name="description" required />
                {fetcher.data?.fieldErrors?.description && (
                  <p className="text-sm text-red-500">{fetcher.data.fieldErrors.description}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="foodTruckPhoneNo">Phone No</Label>
                <Input name="foodTruckPhoneNo" type="tel" required />
                {fetcher.data?.fieldErrors?.foodTruckPhoneNo && (
                  <p className="text-sm text-red-500">
                    {fetcher.data.fieldErrors.foodTruckPhoneNo}
                  </p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input type="text" name="location" required />

                {fetcher.data?.fieldErrors?.location && (
                  <p className="text-sm text-red-500">{fetcher.data.fieldErrors.location}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input name="email" type="email" required />
                {fetcher.data?.fieldErrors?.email && (
                  <p className="text-sm text-red-500">{fetcher.data.fieldErrors.email}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input type="password" name="password" required />
                {fetcher.data?.fieldErrors?.password && (
                  <p className="text-sm text-red-500">{fetcher.data.fieldErrors.password}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="managerPhoneNo">Manager Phone Number</Label>
                <Input name="managerPhoneNo" type="tel" required />
                {fetcher.data?.fieldErrors?.managerPhoneNo && (
                  <p className="text-sm text-red-500">{fetcher.data.fieldErrors.managerPhoneNo}</p>
                )}
              </div>

              <DialogFooter>
                <div className="mt-1 flex items-center justify-end gap-4">
                  <DialogClose>
                    <Button disabled={isSubmitting} color="red" variant="destructive">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" color="orange">
                    Create
                  </Button>
                </div>
              </DialogFooter>
            </fieldset>
          </fetcher.Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduleModalOpen} onOpenChange={() => setIsScheduleModalOpen(false)}>
        <DialogContent className="max-w-[70vw]">
          <DialogHeader>
            <DialogTitle>Edit Schedule for {selectedFoodTruck?.name}</DialogTitle>
          </DialogHeader>
          <div className="w-full">
            <div className="flex flex-col gap-4 p-5">
              <input hidden />
              {daysOfWeek.map((day) => {
                const scheduleForDay = schedules.find((s) => s.day === day);

                // console.log("Schedule for day", scheduleForDay);

                // console.log("StartTime", scheduleForDay?.startTime);
                // console.log("EndTime", scheduleForDay?.endTime);

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
        </DialogContent>
      </Dialog>
    </>
  );
}
