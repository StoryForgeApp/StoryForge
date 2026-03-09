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
import {
  CircleFadingPlusIcon,
  EarthIcon,
  FolderIcon,
  GlobeIcon,
  HomeIcon,
  MapPinIcon,
  NewspaperIcon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useInstallations } from "../hooks/use-installations";
import { useInstalledVersions } from "../hooks/use-installed-versions";
import { useServers } from "../hooks/use-servers";

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
                    <WrenchIcon />
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
