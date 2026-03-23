"use client"

import * as React from "react"
import { Calendar, User } from "lucide-react"
import { format } from "date-fns"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Task } from "@/types/task"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
  onDragStart: (e: React.DragEvent, taskId: string) => void
}

export function TaskCard({ task, onClick, onDragStart }: TaskCardProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Closed'
  
  return (
    <Card 
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 border-l-4",
        task.status === 'New' && "border-l-blue-400",
        task.status === 'In Development' && "border-l-accent",
        task.status === 'Ready for Review' && "border-l-amber-400",
        task.status === 'Resolved' && "border-l-emerald-400",
        task.status === 'Closed' && "border-l-gray-300 opacity-75"
      )}
      onClick={() => onClick(task)}
    >
      <CardHeader className="p-3 pb-2 space-y-1">
        <div className="flex justify-between items-start gap-2">
          <Badge variant="outline" className="text-[10px] py-0 font-code tracking-tighter">
            {task.id}
          </Badge>
          {task.dueDate && (
            <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-[10px] py-0 flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(task.dueDate), "MMM d")}
            </Badge>
          )}
        </div>
        <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
          {task.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {task.description || "No description provided."}
        </p>
        
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-muted/50">
          <div className="flex gap-2">
            {/* Acceptance Criteria and Sub-tasks indicators removed */}
          </div>
          
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">{task.assignee}</span>
              <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                <User className="h-3 w-3 text-accent" />
              </div>
            </div>
          ) : (
             <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center border border-dashed">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
