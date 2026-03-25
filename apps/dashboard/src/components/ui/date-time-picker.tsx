import * as React from "react"
import { format } from "date-fns"
import { CalendarLine } from "@mingcute/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateTimePickerProps {
    value: string // "YYYY-MM-DDTHH:mm" format (datetime-local)
    onChange: (value: string) => void
    className?: string
    error?: boolean
}

export function DateTimePicker({ value, onChange, className, error }: DateTimePickerProps) {
    const [open, setOpen] = React.useState(false)

    const date = value ? new Date(value) : undefined
    const timeStr = date ? format(date, "HH:mm") : "12:00"

    const updateDateTime = (newDate?: Date, newTime?: string) => {
        const d = newDate ?? date ?? new Date()
        const t = newTime ?? (timeStr || "12:00")
        const [h, m] = t.split(":").map(Number)
        const updated = new Date(d)
        updated.setHours(h || 0, m || 0, 0, 0)
        onChange(format(updated, "yyyy-MM-dd'T'HH:mm"))
    }

    const handleDateSelect = (selected: Date | undefined) => {
        if (!selected) return
        updateDateTime(selected)
        setOpen(false)
    }

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateDateTime(undefined, e.target.value || "00:00")
    }

    return (
        <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
            {/* Date picker */}
            <div className="flex flex-col gap-1 flex-1">
                <Label className="text-xs text-fg-3">Date</Label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full justify-start text-left font-normal h-9",
                                !date && "text-fg-3",
                                error && "border-destructive",
                            )}
                        >
                            <span className="flex-1 truncate">
                                {date ? format(date, "dd/MM/yyyy") : "Select date"}
                            </span>
                            <CalendarLine size={16} className="text-fg-3 shrink-0" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            defaultMonth={date}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Time input */}
            <div className="flex flex-col gap-1 w-full sm:w-[100px] shrink-0">
                <Label className="text-xs text-fg-3">Time</Label>
                <Input
                    type="time"
                    step="60"
                    value={timeStr}
                    onChange={handleTimeChange}
                    className={cn("h-9", error && "border-destructive")}
                />
            </div>
        </div>
    )
}
