"use client";

import Link from "next/link";
import { ChevronDown, GraduationCap, LogOut } from "lucide-react";
import { useAuth, type UserRole } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Học sinh",
  teacher: "Giáo viên",
  admin: "Quản trị viên",
};

export function AppHeader({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();

  if (!user) return null;

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-white px-6 shadow-sm">
      <Link href="/library" className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-[#0a2a5e]" />
        <span className="text-lg font-bold text-[#0a2a5e]">Anh Ngữ</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition duration-150 hover:bg-muted">
          <Avatar size="sm">
            <AvatarFallback className="bg-[#0a2a5e] text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{user.name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {ROLE_LABEL[user.role]}
              </p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
