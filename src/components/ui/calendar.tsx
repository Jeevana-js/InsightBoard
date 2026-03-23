
"use client"

import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
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
  const selectedDate = props.mode === "single" && props.selected instanceof Date 
    ? props.selected 
    : null;

  return (
    <div className={cn("bg-[#1a1a1a] text-white rounded-2xl p-4 shadow-2xl border border-white/5 w-fit", className)}>
      {selectedDate && (
        <div className="flex items-center justify-between mb-8 px-2">
          <span className="text-xl font-medium tracking-tight">
            {format(selectedDate, "EEEE, d MMMM")}
          </span>
          <div className="h-9 w-9 bg-[#2a2a2a] hover:bg-[#333] rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-inner border border-white/5">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      )}

      <DayPicker
        showOutsideDays={showOutsideDays}
        weekStartsOn={6} // Saturday as seen in the reference image
        formatters={{
          formatWeekdayName: (date) => format(date, "EEEEEE"), // Gives 'Sa', 'Su', 'Mo', etc.
        }}
        className="p-0"
        classNames={{
          months: "flex flex-col",
          month: "space-y-6",
          caption: "flex items-center px-2 mb-2",
          caption_label: "text-lg font-bold flex-1 text-white/90",
          nav: "flex items-center gap-1",
          nav_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-white/5 text-white border-0"
          ),
          nav_button_previous: "",
          nav_button_next: "",
          table: "w-full border-collapse",
          head_row: "flex w-full mb-4 justify-between gap-1",
          head_cell: "text-gray-500 w-10 font-bold text-[13px] flex justify-center uppercase tracking-wider",
          row: "flex w-full justify-between mb-1 gap-1",
          cell: "h-10 w-10 text-center text-sm p-0 relative flex justify-center items-center",
          day: cn(
            "h-10 w-10 p-0 font-medium text-white/80 hover:bg-white/5 rounded-full transition-all flex items-center justify-center cursor-pointer"
          ),
          day_selected:
            "bg-[#4FC3F7] !text-black hover:bg-[#4FC3F7] hover:text-black focus:bg-[#4FC3F7] focus:text-black rounded-full font-bold shadow-[0_0_15px_rgba(79,195,247,0.3)]",
          day_today: "text-[#4FC3F7] font-bold ring-1 ring-[#4FC3F7]/50 rounded-full",
          day_outside: "text-white/20",
          day_disabled: "text-white/10",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ ...props }) => <ChevronUp className="h-4 w-4" />,
          IconRight: ({ ...props }) => <ChevronDown className="h-4 w-4" />,
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
