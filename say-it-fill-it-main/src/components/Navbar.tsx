import { useState, useEffect } from "react";
import {
  Mic,
  LayoutDashboard,
  FolderKanban,
  Link2,
  FileCheck2,
  History,
  Languages,
  ShieldCheck,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Menu,
  X,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type NavTab =
  | "workspace"
  | "pdf"
  | "dashboard"
  | "hub"
  | "url"
  | "drafts"
  | "history"
  | "languages"
  | "privacy";

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  speakingLanguage: string;
  formLanguage: string;
  readBackEnabled: boolean;
  onToggleReadBack: () => void;
}

export function Navbar({
  activeTab,
  onSelectTab,
  speakingLanguage,
  formLanguage,
  readBackEnabled,
  onToggleReadBack,
}: NavbarProps) {
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check initial theme
    const saved = localStorage.getItem("mozhifill_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = saved === "dark" || (!saved && prefersDark);
    setIsDark(shouldDark);
    if (shouldDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("mozhifill_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("mozhifill_theme", "light");
    }
  };

  const navItems: { id: NavTab; label: string; icon: any }[] = [
    { id: "workspace", label: "Start Voice Fill", icon: Mic },
    { id: "pdf", label: "Word & PDF Voice Fill", icon: FileText },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "hub", label: "Form Hub", icon: FolderKanban },
    { id: "url", label: "Fill from URL", icon: Link2 },
    { id: "drafts", label: "My Drafts", icon: FileCheck2 },
    { id: "history", label: "History", icon: History },
    { id: "languages", label: "Languages", icon: Languages },
    { id: "privacy", label: "Privacy & Help", icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab("workspace")}
            className="flex items-center gap-2.5 text-left transition hover:opacity-90"
            aria-label="mozhifill Home"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-lg font-bold tracking-tight text-foreground">
                  mozhifill
                </span>
                <Badge variant="outline" className="hidden sm:inline-flex border-border text-[10px] text-foreground bg-muted/40 font-mono">
                  Gemini AI
                </Badge>
              </div>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Speak Naturally. Fill Any Form.
              </p>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-2">
          {/* Active Language Badge */}
          <button
            onClick={() => onSelectTab("languages")}
            title="Configure Language Settings"
            className="hidden md:flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span className="capitalize">{speakingLanguage}</span>
            <span className="text-muted-foreground">→</span>
            <span className="capitalize">{formLanguage}</span>
          </button>

          {/* Accessibility Read-back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleReadBack}
            title={readBackEnabled ? "Disable Read-Back" : "Enable Accessibility Read-Back"}
            aria-label="Toggle text to speech read back"
            className={`h-8 w-8 px-0 ${readBackEnabled ? "text-primary" : "text-muted-foreground"}`}
          >
            {readBackEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          {/* Theme Switch */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Light theme" : "Dark theme"}
            className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Mobile Menu Hamburger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="lg:hidden h-8 w-8 px-0"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-card px-4 py-3 shadow-lg animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
