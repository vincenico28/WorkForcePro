import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { FloatingAIAssistant } from '@/components/shared/ai-assistant'

export default function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6 overflow-x-hidden max-w-full">
          <Outlet />
        </main>
      </SidebarInset>
      <FloatingAIAssistant />
    </SidebarProvider>
  )
}
