import { Moon, Sun, Monitor, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

export function ModeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 relative border border-transparent hover:border-border transition-colors">
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2">
              Appearance
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {themes.map(({ value, label, icon: Icon }) => (
              <DropdownMenuItem
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex items-center justify-between gap-2",
                  theme === value && "bg-accent"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span>{label}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {value === "system" && (
                    <span className="text-[10px] text-muted-foreground">
                      ({resolvedTheme})
                    </span>
                  )}
                  {theme === value && (
                    <Check className="size-3.5 text-primary" />
                  )}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>Theme: {theme === "system" ? `System (${resolvedTheme})` : theme.charAt(0).toUpperCase() + theme.slice(1)}</p>
        <p className="text-muted-foreground">Press D to toggle</p>
      </TooltipContent>
    </Tooltip>
  )
}
