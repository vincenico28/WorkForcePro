import { Trophy, Medal, Award, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useEmployees } from '@/hooks/use-employees'
import { Skeleton } from '@/components/ui/skeleton'

// A simple utility to generate a consistent pseudo-random score based on a string (employee ID)
// This simulates dynamic points for the Capstone demo without needing complex DB views.
function generateScore(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0; 
  }
  return Math.abs(hash % 5000) + 1200; // Scores between 1200 and 6200
}

export function GamificationLeaderboard() {
  const { data: employees, isLoading } = useEmployees()

  if (isLoading) {
    return (
      <Card className="col-span-1 border-border/50 glass overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            Top Performers
          </CardTitle>
          <CardDescription>Highest workforce points this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Calculate scores and sort employees
  const leaderboard = (employees || [])
    .map(emp => ({
      ...emp,
      points: generateScore(emp.id)
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5) // Top 5

  return (
    <Card className="col-span-1 border-border/50 glass overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
        <Trophy className="size-48" />
      </div>

      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" />
          Top Performers
        </CardTitle>
        <CardDescription>Highest workforce points this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {leaderboard.map((emp, index) => {
            let Icon = Award
            let iconColor = "text-muted-foreground"
            
            if (index === 0) {
              Icon = Trophy
              iconColor = "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
            } else if (index === 1) {
              Icon = Medal
              iconColor = "text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]"
            } else if (index === 2) {
              Icon = Medal
              iconColor = "text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.5)]"
            }

            return (
              <div key={emp.id} className="flex items-center gap-4 relative group">
                {/* Rank Badge */}
                <div className="flex flex-col items-center justify-center min-w-8">
                  <Icon className={`size-6 transition-transform group-hover:scale-110 ${iconColor}`} />
                  <span className="text-[10px] font-bold text-muted-foreground mt-0.5">#{index + 1}</span>
                </div>

                <Avatar className="size-10 border-2 border-background shadow-sm">
                  {emp.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {emp.first_name[0]}{emp.last_name[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emp.position || emp.departments?.name || 'Employee'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end text-sm font-bold text-primary">
                    {emp.points.toLocaleString()}
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">pts</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end text-[10px] text-emerald-500 font-medium">
                    <TrendingUp className="size-3" />
                    +{(emp.points * 0.05).toFixed(0)} this week
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
