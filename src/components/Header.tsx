"use client";

import React from "react";
import { Orbit, Globe, LogOut } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { language, setLanguage, t } = useLanguage();
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 h-14 md:h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-6 z-50">
      <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
        <div className="w-6 h-6 flex-shrink-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
          <Orbit className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm md:text-lg font-bold text-slate-800 tracking-tight truncate">
            QualiProbe
          </h1>
          <p className="hidden md:block text-slate-500 text-xs">
            {t("app.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {(session?.user?.email || session?.user?.name) && (
          <span className="hidden sm:inline text-sm text-slate-500 truncate max-w-[80px] md:max-w-[120px]">
            {session.user.email || session.user.name}
          </span>
        )}
        <Select value={language} onValueChange={(value: "zh" | "en") => setLanguage(value)}>
          <SelectTrigger className="w-28 md:w-32 h-8 border-slate-200 text-slate-600 hover:text-slate-800 text-sm">
            <div className="flex items-center space-x-1.5 md:space-x-2">
              <Globe className="w-4 h-4 flex-shrink-0" />
              <SelectValue placeholder={t("header.selectLanguage")} />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zh">{t("languages.chinese").split(" ")[1]}</SelectItem>
            <SelectItem value="en">{t("languages.english").split(" ")[1]}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-slate-500 hover:text-slate-700 p-2"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
