import LanguageSelector from "./LanguageSelector";
import { User, ChevronDown, LogOut } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const UserDropdown = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, setSelectedDealer, resetToDefaultBrand } = useTheme();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        setSelectedDealer(null);
        resetToDefaultBrand();
        localStorage.removeItem("selectedBrand");
        localStorage.removeItem("selectedDealer");
        navigate("/login");
    };

    return (
        <div className="flex items-center gap-4">
            <DropdownMenu>
                <DropdownMenuTrigger className="bg-background rounded-lg" asChild>
                    <button className="flex items-center gap-3 px-4 py-2 cursor-pointer outline-none data-[state=open]:border  data-[state=open]:border-[#DBDCDE] data-[state=open]:border-b-white data-[state=open]:rounded-b-none">
                        <User className="w-10 h-10 bg-primary text-white rounded-full" />
                        <p className="text-lg font-medium text-black whitespace-nowrap">{user?.name}</p>
                        <ChevronDown className="ml-auto w-5 h-5 text-foreground" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side="bottom"
                    sideOffset={-1}
                    className="min-w-[calc(var(--radix-popper-anchor-width)+0.5px)] px-4 py-2 bg-card rounded-b-lg shadow-none border-t-white"
                >
                    <div className="mb-2">
                        <LanguageSelector />
                    </div>
                    <DropdownMenuItem
                        className="flex items-center gap-2 text-xl text-foreground hover:text-foreground! cursor-pointer!"
                        onClick={handleLogout}
                    >
                        <LogOut className="size-4.5 text-foreground" />
                        {t("Sair")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default UserDropdown;
