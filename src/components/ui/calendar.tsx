
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // Extract selected date for the custom header if in single mode
  // Default to today if nothing is selected yet
  const selectedDate = props.mode === "single" && props.selected instanceof Date 
    ? props.selected 
    : new Date();

  return (
    <div className={cn("bg-[#0f0f12] text-white rounded-[2.5rem] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 w-[330px]", className)}>
      <div className="flex flex-col gap-1 mb-8 px-2">
        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] opacity-80">
          {format(selectedDate, "EEEE")}
        </span>
        <span className="text-4xl font-bold tracking-tighter text-white">
          {format(selectedDate, "d MMM")}
        </span>
      </div>

      <DayPicker
        showOutsideDays={showOutsideDays}
        weekStartsOn={6} // Saturday as first day
        formatters={{
          formatWeekdayName: (date) => format(date, "EEEEEE"), // 'Sa', 'Su', etc.
        }}
        className="p-0"
        classNames={{
          months: "flex flex-col",
          month: "space-y-6",
          caption: "flex items-center justify-between mb-2 px-2",
          caption_label: "text-sm font-bold text-white/90 tracking-wide",
          nav: "flex items-center gap-1.5",
          nav_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 bg-white/5 p-0 opacity-70 hover:opacity-100 hover:bg-white/10 text-white rounded-full border-0 transition-all duration-200"
          ),
          nav_button_previous: "",
          nav_button_next: "",
          table: "w-full border-collapse",
          head_row: "flex w-full mb-4 justify-between",
          head_cell: "text-white/20 w-10 font-bold text-[10px] flex justify-center uppercase tracking-widest",
          row: "flex w-full justify-between mt-1",
          cell: "h-10 w-10 text-center text-sm p-0 relative flex justify-center items-center",
          day: cn(
            "h-9 w-9 p-0 font-medium text-white/60 hover:bg-white/10 hover:text-white rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer"
          ),
          day_selected:
            "bg-blue-500 !text-white hover:bg-blue-400 hover:text-white focus:bg-blue-500 focus:text-white rounded-full font-bold shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110",
          day_today: "text-blue-400 font-bold ring-2 ring-blue-400/20 rounded-full",
          day_outside: "text-white/10 pointer-events-none",
          day_disabled: "text-white/5",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
