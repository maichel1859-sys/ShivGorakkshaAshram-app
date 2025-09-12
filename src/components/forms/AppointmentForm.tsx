"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Clock,
  User,
  AlertCircle,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
} from "date-fns";
import { cn } from "@/lib/utils/helpers";

interface TimeSlot {
  time: string;
  available: boolean;
  gurujiId?: string;
}

interface Guruji {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  specialization?: string;
  isAvailable: boolean;
}

interface AppointmentFormProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  selectedGuruji: string;
  setSelectedGuruji: (guruji: string) => void;
  reason: string;
  setReason: (reason: string) => void;
  gurujis: Guruji[];
  gurujisLoading: boolean;
  availability: TimeSlot[] | undefined;
  availabilityLoading: boolean;
  availabilityError: Error | null;
  onBookAppointment: () => void;
  booking: boolean;
}

// Generate time slots with AM/PM format (5-minute intervals) - 24 hours for development
const generateTimeSlots = (selectedDate?: Date) => {
  const slots = [];
  const now = new Date();

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const time = new Date();
      time.setHours(hour, minute, 0, 0);
      const timeString = format(time, "h:mm a");

      // Check if this time slot is in the past
      let isAvailable = true;
      if (selectedDate) {
        const slotDateTime = new Date(selectedDate);
        slotDateTime.setHours(hour, minute, 0, 0);

        // If the selected date is today, check if the time is in the past
        if (isSameDay(selectedDate, now)) {
          isAvailable = slotDateTime > now;
        }
      }

      slots.push({
        time: timeString,
        available: isAvailable,
      });
    }
  }
  console.log("Generated time slots (24 hours):", slots);
  return slots;
};

// Generate time slots dynamically based on selected date

export default function AppointmentForm({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  selectedGuruji,
  setSelectedGuruji,
  reason,
  setReason,
  gurujis,
  gurujisLoading,
  availability,
  availabilityLoading,
  availabilityError,
  onBookAppointment,
  booking,
}: AppointmentFormProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getAvailableGurujisList = () => {
    return gurujis.filter((guruji) => guruji.isAvailable);
  };

  const getAvailableTimeSlots = () => {
    console.log("getAvailableTimeSlots called", { availability, selectedDate });
    // Generate time slots dynamically based on selected date
    const dynamicTimeSlots = generateTimeSlots(selectedDate);
    console.log(
      "Using generated timeSlots with AM/PM format and date filtering"
    );
    return dynamicTimeSlots;
  };

  // Custom Calendar Component
  const CustomCalendar = () => {
    console.log("CustomCalendar component is rendering");
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get days from previous month to fill the first week
    const startDate = monthStart;
    const startDay = startDate.getDay();
    const prevMonthDays = [];
    for (let i = startDay - 1; i >= 0; i--) {
      prevMonthDays.push(
        new Date(startDate.getTime() - (i + 1) * 24 * 60 * 60 * 1000)
      );
    }

    // Get days from next month to fill the last week
    const endDate = monthEnd;
    const endDay = endDate.getDay();
    const nextMonthDays = [];
    for (let i = 1; i <= 6 - endDay; i++) {
      nextMonthDays.push(new Date(endDate.getTime() + i * 24 * 60 * 60 * 1000));
    }

    const allDays = [...prevMonthDays, ...days, ...nextMonthDays];

    return (
      <div
        className="w-72 sm:w-80 p-4 bg-background rounded-xl border"
        data-custom-calendar="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-sm text-foreground">
            {format(currentMonth, "MMMM yyyy")} 📅
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground p-1 sm:p-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {allDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const isDisabled = isPast(day) && !isTodayDate;

            return (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs",
                  !isCurrentMonth && "text-muted-foreground/50",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  isTodayDate &&
                    !isSelected &&
                    "bg-accent text-accent-foreground",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => {
                  if (!isDisabled) {
                    setSelectedDate(day);
                    setCalendarOpen(false);
                  }
                }}
                disabled={isDisabled}
              >
                {format(day, "d")}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="rounded-xl relative z-10 !gap-1">
      <CardHeader className="rounded-t-xl ">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <CalendarIcon className="h-5 w-5" />
          <span>Appointment Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-3 sm:p-4">
        {/* Date Selection */}
        <div className="space-y-1.5 relative">
          <Label htmlFor="date" className="text-sm font-medium">
            Select Date
          </Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-10 rounded-xl",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 rounded-xl z-[9999] shadow-lg border"
              align="start"
              side="bottom"
              sideOffset={4}
              avoidCollisions={true}
              collisionPadding={20}
              style={{ zIndex: 9999 }}
            >
              <CustomCalendar />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <p className="text-xs text-muted-foreground">
              Selected: {format(selectedDate, "EEEE, MMMM do, yyyy")}
            </p>
          )}
        </div>

        {/* Guruji Selection */}
        <div className="space-y-1.5">
          <Label htmlFor="guruji" className="text-sm font-medium">
            Select Guruji
          </Label>
          <Select value={selectedGuruji} onValueChange={setSelectedGuruji}>
            <SelectTrigger className="!h-14 rounded-xl">
              <SelectValue placeholder="Choose a guruji for consultation" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {gurujisLoading ? (
                <SelectItem value="loading" disabled>
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading gurujis...</span>
                  </div>
                </SelectItem>
              ) : getAvailableGurujisList().length === 0 ? (
                <SelectItem value="no-gurujis" disabled>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>No gurujis available</span>
                  </div>
                </SelectItem>
              ) : (
                getAvailableGurujisList().map((guruji) => (
                  <SelectItem
                    key={guruji.id}
                    value={guruji.id}
                    className="py-3 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {guruji.name || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {typeof guruji.specialization === "string"
                            ? guruji.specialization
                            : "General Consultation"}
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedGuruji && (
            <p className="text-xs text-muted-foreground">
              Selected:{" "}
              {gurujis.find((g) => g.id === selectedGuruji)?.name || "Unknown"}
            </p>
          )}
        </div>

        {/* Time Selection */}
        <div className="space-y-1.5">
          <Label htmlFor="time" className="text-sm font-medium">
            Select Time Slot
          </Label>
          {!selectedDate ? (
            <div className="p-3 border-2 border-dashed border-muted-foreground/25 rounded-xl text-center">
              <Clock className="h-4 w-4 mx-auto text-muted-foreground/50 mb-1" />
              <p className="text-xs text-muted-foreground">
                Please select a date first
              </p>
            </div>
          ) : availabilityLoading ? (
            <div className="p-3 border rounded-xl text-center">
              <Loader2 className="h-4 w-4 mx-auto animate-spin text-primary mb-1" />
              <p className="text-xs text-muted-foreground">
                Loading available time slots...
              </p>
            </div>
          ) : availabilityError ? (
            <div className="p-3 border border-destructive/50 rounded-xl text-center bg-destructive/5">
              <AlertCircle className="h-4 w-4 mx-auto text-destructive mb-1" />
              <p className="text-xs text-destructive">
                Error loading time slots
              </p>
            </div>
          ) : getAvailableTimeSlots().length === 0 ? (
            <div className="p-3 border border-muted-foreground/25 rounded-xl text-center">
              <Clock className="h-4 w-4 mx-auto text-muted-foreground/50 mb-1" />
              <p className="text-xs text-muted-foreground">
                No available slots for this date
              </p>
            </div>
          ) : (
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Choose a time slot" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60 overflow-y-auto">
                {(() => {
                  const slots = getAvailableTimeSlots();
                  console.log("Time slots for dropdown:", slots);

                  // Use the generated slots directly
                  const displaySlots = slots;
                  console.log("Display slots:", displaySlots);

                  const amSlots = displaySlots.filter((slot: TimeSlot) =>
                    slot.time.includes("AM")
                  );
                  const pmSlots = displaySlots.filter((slot: TimeSlot) =>
                    slot.time.includes("PM")
                  );
                  console.log("AM slots:", amSlots, "PM slots:", pmSlots);

                  return (
                    <>
                      {amSlots.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            Morning (AM)
                          </div>
                          {amSlots.map((slot: TimeSlot) => (
                            <SelectItem
                              key={slot.time}
                              value={slot.time}
                              className={cn(
                                "py-2 rounded-lg ml-2",
                                !slot.available &&
                                  "opacity-50 cursor-not-allowed"
                              )}
                              disabled={!slot.available}
                            >
                              <div className="flex items-center space-x-3">
                                <Clock
                                  className={cn(
                                    "h-4 w-4",
                                    slot.available
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  )}
                                />
                                <span
                                  className={cn(
                                    "font-medium",
                                    !slot.available && "text-muted-foreground"
                                  )}
                                >
                                  {slot.time}
                                  {!slot.available && " (Past)"}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {pmSlots.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-1">
                            Afternoon (PM)
                          </div>
                          {pmSlots.map((slot: TimeSlot) => (
                            <SelectItem
                              key={slot.time}
                              value={slot.time}
                              className={cn(
                                "py-2 rounded-lg ml-2",
                                !slot.available &&
                                  "opacity-50 cursor-not-allowed"
                              )}
                              disabled={!slot.available}
                            >
                              <div className="flex items-center space-x-3">
                                <Clock
                                  className={cn(
                                    "h-4 w-4",
                                    slot.available
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  )}
                                />
                                <span
                                  className={cn(
                                    "font-medium",
                                    !slot.available && "text-muted-foreground"
                                  )}
                                >
                                  {slot.time}
                                  {!slot.available && " (Past)"}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {amSlots.length === 0 && pmSlots.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground">
                          <Clock className="h-6 w-6 mx-auto mb-2" />
                          <p className="text-sm">No time slots available</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </SelectContent>
            </Select>
          )}
          {selectedDate &&
            !availabilityLoading &&
            getAvailableTimeSlots().length > 0 && (
              <p className="text-xs text-muted-foreground">
                {getAvailableTimeSlots().length} available slots for{" "}
                {format(selectedDate, "MMM dd, yyyy")}
              </p>
            )}
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <Label htmlFor="reason" className="text-sm font-medium">
            Reason for Consultation
          </Label>
          <Textarea
            id="reason"
            placeholder="Please describe your symptoms, concerns, or reason for consultation..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="resize-none rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            {reason.length}/500 characters
          </p>
        </div>

        {/* Book Button */}
        <div className="pt-1">
          <Button
            onClick={onBookAppointment}
            disabled={
              booking ||
              !selectedDate ||
              !selectedTime ||
              !selectedGuruji ||
              !reason.trim()
            }
            className="w-full h-10 text-base font-medium rounded-xl"
            size="lg"
          >
            {booking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Booking Appointment...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Book Appointment
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
