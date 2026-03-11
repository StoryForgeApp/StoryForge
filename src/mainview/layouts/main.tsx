import { Link } from "@tanstack/react-router";
import { NewspaperIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/mainview/components/ui/dropdown-menu";
import { CircleFadingPlusDrawIcon } from "@/mainview/components/ui/icons/circle-fading-plus-draw";
import { EarthIcon } from "@/mainview/components/ui/icons/earth";
import { GlobeIcon } from "@/mainview/components/ui/icons/globe";
import { HomeIcon } from "@/mainview/components/ui/icons/home";
import { MapPinIcon } from "@/mainview/components/ui/icons/map-pin";
import { SettingsIcon } from "@/mainview/components/ui/icons/settings";
import { UserIcon } from "@/mainview/components/ui/icons/user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@/mainview/components/ui/sidebar";
import { TooltipProvider } from "@/mainview/components/ui/tooltip";
import { useInstallations } from "@/mainview/hooks/use-installations";
import { useInstalledVersions } from "@/mainview/hooks/use-installed-versions";
import { useServers } from "@/mainview/hooks/use-servers";
import { OpenFolderIcon } from "../components/ui/icons/open-folder";
import { useWorlds } from "../hooks/use-worlds";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: installedVersions } = useInstalledVersions();
  const { data: installations } = useInstallations();
  const { data: servers } = useServers();
  const { data: worlds } = useWorlds();
  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <SidebarMenuButton render={<DropdownMenuTrigger />}>
                    <UserIcon />
                    Account(s)
                    <SidebarMenuBadge className="text-muted-foreground text-xs">
                      {">"}
                    </SidebarMenuBadge>
                  </SidebarMenuButton>
                  <DropdownMenuContent align="start" side="right">
                    <div className="p-2">
                      <p className="text-muted-foreground text-sm">No accounts yet</p>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        activeProps={{
                          className: "bg-accent text-accent-foreground",
                        }}
                        to="/"
                      />
                    }
                  >
                    <HomeIcon />
                    Home
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        activeProps={{
                          className: "bg-accent text-accent-foreground",
                        }}
                        to="/installations"
                      />
                    }
                  >
                    <OpenFolderIcon />
                    Installations
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="text-muted-foreground text-xs">
                    {installations?.length ?? 0}
                  </SidebarMenuBadge>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        render={
                          <Link
                            activeProps={{
                              className: "bg-accent text-accent-foreground",
                            }}
                            to="/installations/worlds"
                          />
                        }
                        size="sm"
                      >
                        <EarthIcon />
                        Worlds
                        <SidebarMenuBadge className="text-muted-foreground text-xs">
                          {worlds?.length ?? 0}
                        </SidebarMenuBadge>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        activeProps={{
                          className: "bg-accent text-accent-foreground",
                        }}
                        to="/servers"
                      />
                    }
                  >
                    <MapPinIcon />
                    Servers
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="text-muted-foreground text-xs">
                    {servers?.length ?? 0}
                  </SidebarMenuBadge>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        render={
                          <Link
                            activeProps={{
                              className: "bg-accent text-accent-foreground",
                            }}
                            to="/servers/public"
                          />
                        }
                        size="sm"
                      >
                        <GlobeIcon />
                        Public
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        activeProps={{
                          className: "bg-accent text-accent-foreground",
                        }}
                        to="/versions"
                      />
                    }
                  >
                    <CircleFadingPlusDrawIcon />
                    Versions
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="text-muted-foreground text-xs">
                    {installedVersions?.length ?? 0}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        activeProps={{
                          className: "bg-accent text-accent-foreground",
                        }}
                        to="/news"
                      />
                    }
                  >
                    <NewspaperIcon />
                    News
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        activeProps={{
                          className: "bg-accent text-accent-foreground",
                        }}
                        to="/settings"
                      />
                    }
                  >
                    <SettingsIcon />
                    Settings
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
