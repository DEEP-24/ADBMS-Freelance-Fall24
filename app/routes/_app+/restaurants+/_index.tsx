import { ChevronRightIcon, ClockIcon, MapPinIcon, PhoneIcon } from "@heroicons/react/24/solid";
import { Link } from "@remix-run/react";
import { useAppData } from "~/utils/hooks";
import { formatTime } from "~/utils/misc";

export default function FoodTrucks() {
  const { foodTrucks } = useAppData();

  return (
    <div className="px-40 py-10">
      <h1 className="flex items-center justify-center text-3xl font-bold">Food Trucks</h1>

      <div className="mt-10 grid grid-cols-2 gap-8 px-5">
        {foodTrucks.map((truck) => (
          <div
            key={truck.id}
            className="border-1 flex h-[46rem] flex-col gap-3 rounded-xl border-black bg-[#f6f6f6]/20 shadow-md transition-transform duration-300 ease-in-out hover:scale-105"
          >
            <div className="relative h-[40%]">
              <img
                src={truck.image}
                alt={truck.name}
                className="aspect-square h-full w-full rounded-t-3xl object-cover"
              />
              <div className="absolute inset-0 rounded-t-3xl bg-black/10" />
            </div>
            <div className="ml-8 flex flex-col gap-2 p-2">
              <span className="text-left text-3xl font-bold">{truck.name}</span>
              <div className="mt-2 flex items-center text-lg font-semibold text-[#888888]">
                <MapPinIcon className="mr-2 inline h-5 w-5" />
                <span>{truck.location}</span>
              </div>
              <div className="flex items-center text-lg font-semibold text-[#888888]">
                <PhoneIcon className="mr-2 inline h-5 w-5" />
                <span>{truck.phoneNo}</span>
              </div>
            </div>

            <div className="ml-8 flex h-[13rem] flex-col gap-2 p-2">
              {truck.schedule.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center text-lg font-semibold text-[#888888]"
                >
                  <ClockIcon className="mr-2 inline h-5 w-5" />
                  <span>{day.day}:</span>
                  <span className="ml-2">
                    {formatTime(day.startTime)} - {formatTime(day.endTime)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4">
              <Link to={`/restaurants/${truck.slug}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-full bg-orange-500 p-3 font-semibold text-white hover:bg-orange-400"
                >
                  Visit
                  <ChevronRightIcon className="inline h-4 w-5" />
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
