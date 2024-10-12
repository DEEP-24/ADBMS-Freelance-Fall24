import type React from "react";
import { useEffect, useState } from "react";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface TimePickerInputProps {
  value: Date | null;
  onChange: (date: Date) => void;
  className?: string;
  date?: Date | null;
}

const TimePickerInput: React.FC<TimePickerInputProps> = ({ value, onChange, className, date }) => {
  const [hours, setHours] = useState("00");
  const [minutes, setMinutes] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (value) {
      const hours = value.getHours();
      const minutes = value.getMinutes();
      setHours(
        hours === 0
          ? "12"
          : (hours > 12 ? (hours - 12).toString() : hours.toString()).padStart(2, "0"),
      );
      setMinutes(minutes.toString().padStart(2, "0"));
      setPeriod(hours >= 12 ? "PM" : "AM");
    }
  }, [value]);

  const handleChange = (newHours: string, newMinutes: string, newPeriod: "AM" | "PM") => {
    const baseDate = date || new Date();
    let hours24 = Number.parseInt(newHours);
    if (newPeriod === "PM" && hours24 !== 12) {
      hours24 += 12;
    }
    if (newPeriod === "AM" && hours24 === 12) {
      hours24 = 0;
    }

    const newDate = new Date(baseDate);
    newDate.setHours(hours24, Number.parseInt(newMinutes), 0, 0);
    onChange(newDate);
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Input
        type="number"
        min="1"
        max="12"
        value={hours}
        onChange={(e) => {
          const val = e.target.value;
          const newHours = val.length > 2 ? val.slice(0, 2) : val;
          setHours(newHours);
          handleChange(newHours, minutes, period);
        }}
        className="w-16"
      />
      <span>:</span>
      <Input
        type="number"
        min="0"
        max="59"
        value={minutes}
        onChange={(e) => {
          const val = e.target.value;
          const newMinutes = val.length > 2 ? val.slice(0, 2) : val;
          setMinutes(newMinutes);
          handleChange(hours, newMinutes, period);
        }}
        className="w-16"
      />
      <Select
        value={period}
        onValueChange={(value: "AM" | "PM") => {
          setPeriod(value);
          handleChange(hours, minutes, value);
        }}
      >
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimePickerInput;
