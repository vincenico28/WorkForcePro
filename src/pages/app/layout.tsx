import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { FloatingAIAssistant } from '@/components/shared/ai-assistant'

export default function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppHeader />
        <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:gap-6 md:p-6 pb-24 md:pb-6 overflow-x-hidden max-w-full">
          <Outlet />
        </main>
      </SidebarInset>
      <MobileBottomNav />
      <FloatingAIAssistant />
    </SidebarProvider>
  )
}
