import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="space-y-2 mt-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}
