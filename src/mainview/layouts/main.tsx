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
import { Link } from "@tanstack/react-router";
import { CircleFadingPlusIcon, FolderIcon, GlobeIcon, NewspaperIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/mainview/components/ui/dropdown-menu";
import { useInstallations } from "@/mainview/hooks/use-installations";
import { useInstalledVersions } from "@/mainview/hooks/use-installed-versions";
import { useServers } from "@/mainview/hooks/use-servers";
import { UserIcon } from "@/mainview/components/ui/icons/user";
import { HomeIcon } from "@/mainview/components/ui/icons/home";
import { EarthIcon } from "@/mainview/components/ui/icons/earth";
import { SettingsIcon } from "@/mainview/components/ui/icons/settings";
import { MapPinIcon } from "@/mainview/components/ui/icons/map-pin";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: installedVersions } = useInstalledVersions();
  const { data: installations } = useInstallations();
  const { data: servers } = useServers();
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
                    <SidebarMenuBadge className="text-xs text-muted-foreground">
                      {">"}
                    </SidebarMenuBadge>
                  </SidebarMenuButton>
                  <DropdownMenuContent align="start" side="right">
                    <div className="p-2">
                      <p className="text-sm text-muted-foreground">No accounts yet</p>
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
                    <FolderIcon />
                    Installations
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="text-xs text-muted-foreground">
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
                  <SidebarMenuBadge className="text-xs text-muted-foreground">
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
                    <CircleFadingPlusIcon />
                    Versions
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="text-xs text-muted-foreground">
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
