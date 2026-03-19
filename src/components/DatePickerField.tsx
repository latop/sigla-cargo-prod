import { useState, useEffect } from "react";
import { format, parseISO, parse, isValid } from "date-fns";
import { pt, es, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerFieldProps {
  /** ISO date string (e.g. "2024-01-15" or "2024-01-15T10:30:00") */
  value?: string | null;
  /** Called with ISO string or null */
  onChange: (value: string | null) => void;
  /** Show time input alongside calendar */
  includeTime?: boolean;
  /** Additional class for the trigger button */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Error styling */
  hasError?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

const toDateObj = (val?: string | null): Date | undefined => {
  if (!val) return undefined;
  try {
    const d = parseISO(val);
    return isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
};

const extractTime = (val?: string | null): string => {
  if (!val) return "00:00";
  try {
    const match = val.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : "00:00";
  } catch {
    return "00:00";
  }
};

/** Apply dd/mm/yyyy mask while typing */
const applyDateMask = (input: string): string => {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/** Apply dd/mm/yyyy hh:mm mask while typing */
const applyDateTimeMask = (input: string): string => {
  const digits = input.replace(/\D/g, "").slice(0, 12);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length <= 10) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8, 10)}:${digits.slice(10)}`;
};

/** Parse dd/mm/yyyy string to Date */
const parseDateString = (str: string): Date | null => {
  if (str.length !== 10) return null;
  const parsed = parse(str, "dd/MM/yyyy", new Date());
  return isValid(parsed) ? parsed : null;
};

/** Parse dd/mm/yyyy hh:mm string to Date */
const parseDateTimeString = (str: string): Date | null => {
  if (str.length !== 16) return null;
  const parsed = parse(str, "dd/MM/yyyy HH:mm", new Date());
  return isValid(parsed) ? parsed : null;
};

export function DatePickerField({
  value,
  onChange,
  includeTime = false,
  className,
  placeholder,
  hasError = false,
  disabled = false,
}: DatePickerFieldProps) {
  const { i18n } = useTranslation();
  const calendarLocale = i18n.language === "pt" ? pt : i18n.language === "es" ? es : enUS;
  const [open, setOpen] = useState(false);
  const dateObj = toDateObj(value);
  const timeValue = extractTime(value);

  // Local text state for typing
  const [dateText, setDateText] = useState(() =>
    dateObj
      ? includeTime
        ? format(dateObj, "dd/MM/yyyy HH:mm")
        : format(dateObj, "dd/MM/yyyy")
      : ""
  );

  // Sync external value to local text
  useEffect(() => {
    setDateText(
      dateObj
        ? includeTime
          ? format(dateObj, "dd/MM/yyyy HH:mm")
          : format(dateObj, "dd/MM/yyyy")
        : ""
    );
  }, [value]);

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) {
      onChange(null);
      setOpen(false);
      return;
    }
    if (includeTime) {
      const iso = format(d, "yyyy-MM-dd");
      onChange(`${iso}T${timeValue}:00`);
    } else {
      onChange(`${format(d, "yyyy-MM-dd")}T00:00:00`);
    }
    setOpen(false);
  };

  const handleDateTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (includeTime) {
      const masked = applyDateTimeMask(e.target.value);
      setDateText(masked);

      if (masked.length === 16) {
        const parsed = parseDateTimeString(masked);
        if (parsed) {
          onChange(`${format(parsed, "yyyy-MM-dd")}T${format(parsed, "HH:mm")}:00`);
        }
      } else if (masked.length === 0) {
        onChange(null);
      }
    } else {
      const masked = applyDateMask(e.target.value);
      setDateText(masked);

      if (masked.length === 10) {
        const parsed = parseDateString(masked);
        if (parsed) {
          onChange(`${format(parsed, "yyyy-MM-dd")}T00:00:00`);
        }
      } else if (masked.length === 0) {
        onChange(null);
      }
    }
  };

  const handleDateTextBlur = () => {
    const expectedLen = includeTime ? 16 : 10;
    if (dateText.length > 0 && dateText.length < expectedLen) {
      setDateText(
        dateObj
          ? includeTime
            ? format(dateObj, "dd/MM/yyyy HH:mm")
            : format(dateObj, "dd/MM/yyyy")
          : ""
      );
    }
  };

  const defaultPlaceholder = includeTime ? "dd/mm/aaaa hh:mm" : "dd/mm/aaaa";
  const maxLen = includeTime ? 16 : 10;

  if (includeTime) {
    return (
      <div className={cn("relative", className)}>
        <Input
          type="text"
          disabled={disabled}
          placeholder={placeholder || defaultPlaceholder}
          value={dateText}
          onChange={handleDateTextChange}
          onBlur={handleDateTextBlur}
          className={cn(
            "h-8 text-xs pl-2 pr-7",
            hasError && "border-destructive"
          )}
          maxLength={maxLen}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="absolute right-0 top-0 h-8 w-7 hover:bg-transparent"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dateObj}
              onSelect={handleDateSelect}
              locale={calendarLocale}
              initialFocus
              captionLayout="dropdown-buttons"
              fromYear={2020}
              toYear={2035}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        disabled={disabled}
        placeholder={placeholder || defaultPlaceholder}
        value={dateText}
        onChange={handleDateTextChange}
        onBlur={handleDateTextBlur}
        className={cn(
          "h-8 w-full text-xs pl-2 pr-7",
          hasError && "border-destructive"
        )}
        maxLength={10}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-0 top-0 h-8 w-7 hover:bg-transparent"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={dateObj}
            onSelect={handleDateSelect}
            locale={calendarLocale}
            initialFocus
            captionLayout="dropdown-buttons"
            fromYear={2020}
            toYear={2035}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
