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
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-50">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
          <Orbit className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            {t("app.title")}
          </h1>
          <p className="text-slate-500 text-xs">
            {t("app.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {(session?.user?.email || session?.user?.name) && (
          <span className="text-sm text-slate-500 truncate max-w-[120px]">
            {session.user.email || session.user.name}
          </span>
        )}
        <Select value={language} onValueChange={(value: "zh" | "en") => setLanguage(value)}>
          <SelectTrigger className="w-32 h-8 border-slate-200 text-slate-600 hover:text-slate-800">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
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
          className="text-slate-500 hover:text-slate-700"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
