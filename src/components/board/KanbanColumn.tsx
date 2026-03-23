
"use client"

import * as React from "react"
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Task, TaskStatus } from "@/types/task"
import { TaskCard } from "./TaskCard"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onAddTask: (status: TaskStatus) => void
  onTaskClick: (task: Task) => void
  onDropTask: (taskId: string, targetStatus: TaskStatus) => void
}

export function KanbanColumn({ status, tasks, onAddTask, onTaskClick, onDropTask }: KanbanColumnProps) {
  const [isOver, setIsOver] = React.useState(false)
  const { toast } = useToast()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    const taskId = e.dataTransfer.getData("taskId")
    onDropTask(taskId, status)
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId)
  }

  const handleEditColumn = () => {
    toast({
      title: "Edit Column",
      description: `Feature to rename "${status}" is coming soon.`,
    })
  }

  const handleDeleteColumn = () => {
    toast({
      variant: "destructive",
      title: "Delete Column",
      description: `Column "${status}" cannot be deleted while it contains active tasks.`,
    })
  }

  return (
    <div 
      className={cn(
        "flex flex-col w-full min-w-[280px] max-w-sm rounded-xl transition-colors duration-200 p-2 h-fit",
        isOver ? "bg-accent/5 ring-2 ring-accent ring-inset" : "bg-muted/40"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-headline font-semibold text-sm tracking-wide">{status.toUpperCase()}</h2>
          <span className="flex items-center justify-center h-5 px-1.5 text-[10px] font-bold rounded-full bg-white border text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddTask(status)}>
            <Plus className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditColumn} className="gap-2 cursor-pointer">
                <Pencil className="h-4 w-4" />
                Edit Column
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteColumn} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-3 min-h-[200px] mb-2">
        {tasks.map((task) => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onClick={onTaskClick} 
            onDragStart={handleDragStart} 
          />
        ))}
        {tasks.length === 0 && !isOver && (
          <div className="flex-1 border-2 border-dashed border-muted rounded-lg flex items-center justify-center p-8">
            <p className="text-xs text-muted-foreground text-center">No tasks in this stage</p>
          </div>
        )}
      </div>
    </div>
  )
}
