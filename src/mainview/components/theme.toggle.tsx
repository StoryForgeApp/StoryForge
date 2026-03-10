import { Button } from "@/mainview/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/mainview/components/ui/dropdown-menu";
import { LaptopMinimalCheckIcon } from "@/mainview/components/ui/icons/laptop-minimal-check";
import { MoonIcon } from "@/mainview/components/ui/icons/moon";
import { SunMediumIcon } from "@/mainview/components/ui/icons/sun-medium";
import { useTheme } from "@/mainview/contexts/theme.context";

export function ThemeToggle() {
  const { userTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button className="h-8 w-8 transition-colors" size="icon-sm" variant="ghost" />}
      >
        <SunMediumIcon className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="gap-2" onClick={() => setTheme("light")}>
          <SunMediumIcon className="h-4 w-4" />
          <span>Light</span>
          {userTheme === "light" && <div className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onClick={() => setTheme("dark")}>
          <MoonIcon className="h-4 w-4" />
          <span>Dark</span>
          {userTheme === "dark" && <div className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onClick={() => setTheme("system")}>
          <LaptopMinimalCheckIcon className="h-4 w-4" />
          <span>System</span>
          {userTheme === "system" && (
            <div className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
