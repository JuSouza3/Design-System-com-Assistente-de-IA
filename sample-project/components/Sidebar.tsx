import React from "react"
import { NavLink } from "react-router-dom"
import { FileText, Home, TextAlignStart, MessageCircleMore, Users, Tractor } from "lucide-react"
import { useTranslation } from "react-i18next"
import LanguageSelector from "./LanguageSelector"
import UserDropdown from "@/components/custom/ui/UserDropdown"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/custom/base/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip";


import { APP_NAME, SUPPORT_EMAIL } from "@/config";

import { useAuth } from "@/context/AuthContext"

const AppSidebar = () => {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const { user } = useAuth()

  const navItems = [
    {
      label: t("Início"),
      path: "/inicio",
      icon: Home
    },
    {
      label: t("Material de apoio"),
      path: "/materiais",
      icon: FileText
    },
    {
      label: t("Ferramentas para você"),
      path: "/ferramentas",
      icon: MessageCircleMore,
    },
    {
      label: t("Relatório de performance"),
      path: "/relatorio-de-performance",
      icon: TextAlignStart
    },

    ...(user?.isAdmin
      ? [{
          label: t("Usuários"),
          path: "/usuarios",
          icon: Users
        }]
      : []),
    ...(
      user?.isAdmin
        ? [{
            label: t("Concessionárias"),
            path: "/concessionarias",
            icon: Tractor
          }]
        : []
    )
  ]

  return (
    <Sidebar
      collapsible="icon"
    >
      <div className="flex h-full flex-col">
        <SidebarHeader className="flex mb-8 flex-row justify-between items-center">
          <div className="flex flex-row items-center gap-2 group-data-[collapsible=icon]:hidden">
            <h1>{APP_NAME}</h1>
          </div>
          <SidebarTrigger onClick={() => setIsCollapsed(!isCollapsed)} />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <TooltipProvider>
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem className="py-1" key={item.path}>
                      <NavLink to={item.path}>
                        {({ isActive }) => (
                          <SidebarMenuButton
                            data-active={isActive}
                            className="group-data-[collapsible=icon]:p-1.5! hover:[&>span]:text-sidebar-accent-foreground [&[data-active=true]>span]:text-white"
                            tooltip={item.label}
                          >
                            <Icon className="size-5!" />
                            <span className="text-xl group-data-[collapsible=icon]:sr-only">{item.label}</span>
                          </SidebarMenuButton>
                        )}
                      </NavLink>
                    </SidebarMenuItem>
                  )
                })}
              </TooltipProvider>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          {/* FOOTER */}
          <div>
            <p className="border-t border-sidebar-ring mt-3 pt-3.5  text-base text-foreground font-normal">
              {t("Precisando de suporte? Entre em contato:")}
              <a href={`mailto:${SUPPORT_EMAIL}`} target="_blank" className="font-bold">
                {SUPPORT_EMAIL}
              </a>
            </p>

            <div className="block md:hidden mt-4">
              <UserDropdown />
            </div>
          </div>
        </SidebarFooter>

      </div>
    </Sidebar>
  )
}

export default AppSidebar
