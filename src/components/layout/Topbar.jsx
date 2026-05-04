import { Bell, Menu, Moon, Search, Sun, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/context/ThemeContext";
import { getCurrentUser, setCurrentUser } from "@/lib/currentUser";
import { useEffect, useState } from "react";

export const Topbar = ({ onMenu }) => {
    const { theme, toggle } = useTheme();
    const [user, setUser] = useState("Admin User");

    useEffect(() => {
        setUser(getCurrentUser());
    }, []);

    const changeUser = () => {
        const next = window.prompt("Enter your name (used for activity log):", user);
        if (next) {
            setCurrentUser(next);
            setUser(next);
        }
    };

    const initials = user
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "AU";

    return (
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
                    <Menu className="h-5 w-5" />
                </Button>

                <div className="hidden md:flex flex-col leading-tight mr-4">
                    <h1 className="font-bold text-base text-foreground">JB Rock Bolts Dashboard</h1>
                    <p className="text-[11px] text-muted-foreground">Marketing & Sales Management System</p>
                </div>

                <div className="flex-1 max-w-md ml-auto md:ml-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search clients, orders, invoices..."
                            className="pl-9 bg-secondary/60 border-transparent focus-visible:bg-card"
                        />
                    </div>
                </div>

                <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent" />
                </Button>

                <button
                    onClick={changeUser}
                    className="flex items-center gap-3 pl-3 border-l border-border hover:opacity-80 transition-opacity"
                    title="Change active user"
                >
                    <div className="hidden sm:block text-right leading-tight">
                        <div className="text-sm font-semibold text-foreground flex items-center gap-1.5 justify-end">
                            {user}
                            <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="text-[11px] text-muted-foreground">Active User</div>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm">
                        {initials}
                    </div>
                </button>
            </div>
        </header>
    );
};