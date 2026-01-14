"use client";

import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { api } from "@/lib/api";

interface CalendarViewProps {
  serviceId: string;
  durationMinutes: number;
  onTimeSelect: (time: string) => void;
  selectedTime?: string;
}

export function CalendarView({ serviceId, durationMinutes, onTimeSelect, selectedTime }: CalendarViewProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekDays = eachDayOfInterval({
    start: currentWeek,
    end: addDays(currentWeek, 6),
  });

  useEffect(() => {
    if (serviceId && selectedDate) {
      fetchAvailability();
    }
  }, [serviceId, selectedDate]);

  async function fetchAvailability() {
    if (!serviceId) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/availability?serviceId=${serviceId}&date=${selectedDate}`);
      setAvailableSlots(res.data.availableSlots || []);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? "Failed to load availability");
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeSlot(isoString: string): string {
    return format(parseISO(isoString), "h:mm a");
  }

  function isSlotSelected(slot: string): boolean {
    return selectedTime === slot;
  }

  function handlePreviousWeek() {
    setCurrentWeek(addDays(currentWeek, -7));
  }

  function handleNextWeek() {
    setCurrentWeek(addDays(currentWeek, 7));
  }

  function handleDateSelect(date: Date) {
    setSelectedDate(format(date, "yyyy-MM-dd"));
  }

  const selectedDateObj = parseISO(selectedDate);
  const todaySlots = availableSlots.filter((slot) => {
    const slotDate = parseISO(slot);
    return isSameDay(slotDate, selectedDateObj);
  });

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePreviousWeek}
          className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          ← Previous
        </button>
        <span className="text-sm font-medium text-slate-200">
          {format(currentWeek, "MMM d")} - {format(addDays(currentWeek, 6), "MMM d, yyyy")}
        </span>
        <button
          type="button"
          onClick={handleNextWeek}
          className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const isSelected = dayStr === selectedDate;
          const isToday = isSameDay(day, new Date());
          const daySlots = availableSlots.filter((slot) => {
            const slotDate = parseISO(slot);
            return isSameDay(slotDate, day);
          });

          return (
            <button
              key={dayStr}
              type="button"
              onClick={() => handleDateSelect(day)}
              className={`relative rounded-lg border p-2 text-center transition-all ${
                isSelected
                  ? "border-brand-500 bg-brand-500/20 shadow-lg shadow-brand-500/20"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/70"
              }`}
            >
              <div className={`text-xs ${isToday ? "font-bold text-brand-400" : "text-slate-400"}`}>
                {format(day, "EEE")}
              </div>
              <div className={`mt-1 text-sm font-semibold ${isSelected ? "text-brand-300" : "text-slate-200"}`}>
                {format(day, "d")}
              </div>
              {daySlots.length > 0 && (
                <div className="mt-1 text-[10px] text-emerald-400">
                  {daySlots.length} slots
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Time Slots */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">
          Available times for {format(selectedDateObj, "EEEE, MMMM d")}
        </h3>
        {loading ? (
          <div className="text-xs text-slate-400">Loading availability...</div>
        ) : error ? (
          <div className="text-xs text-red-400">{error}</div>
        ) : todaySlots.length === 0 ? (
          <div className="text-xs text-slate-500">No available slots for this date</div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {todaySlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onTimeSelect(slot)}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-all ${
                  isSlotSelected(slot)
                    ? "border-brand-500 bg-brand-500/20 text-brand-300 shadow-md shadow-brand-500/20"
                    : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300"
                }`}
              >
                {formatTimeSlot(slot)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
