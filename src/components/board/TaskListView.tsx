"use client"

import * as React from "react"
import { format } from "date-fns"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Task } from "@/types/task"
import { Calendar, User } from "lucide-react"

interface TaskListViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

export function TaskListView({ tasks, onTaskClick }: TaskListViewProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="w-[100px] font-semibold">ID</TableHead>
            <TableHead className="font-semibold">Title</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Assignee</TableHead>
            <TableHead className="font-semibold text-right">Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow 
              key={task.id} 
              className="cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => onTaskClick(task)}
            >
              <TableCell className="font-code text-xs text-muted-foreground">
                {task.id}
              </TableCell>
              <TableCell className="font-medium">
                {task.title}
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] font-bold",
                    task.status === 'New' && "border-blue-400 text-blue-600",
                    task.status === 'In Development' && "border-accent text-accent",
                    task.status === 'Resolved' && "border-emerald-400 text-emerald-600",
                    task.status === 'Closed' && "border-gray-300 text-gray-500"
                  )}
                >
                  {task.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center border">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">{task.assignee || "Unassigned"}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {task.dueDate ? (
                  <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(task.dueDate), "MMM d, yyyy")}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                <p>No tasks match your filters.</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

import { cn } from "@/lib/utils"
