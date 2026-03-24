"use client"

import * as React from "react"
import { Plus, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  onEditColumn?: (oldName: string, newName: string) => void
  onDeleteColumn?: (name: string) => void
  showAddButton?: boolean
}

export function KanbanColumn({ 
  status, 
  tasks, 
  onAddTask, 
  onTaskClick, 
  onDropTask,
  onEditColumn,
  onDeleteColumn,
  showAddButton = false
}: KanbanColumnProps) {
  const [isOver, setIsOver] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(status)
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

  const handleStartEdit = () => {
    setEditValue(status)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditValue(status)
  }

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue !== status) {
      onEditColumn?.(status, editValue.trim())
    }
    setIsEditing(false)
  }

  const handleDeleteColumn = () => {
    onDeleteColumn?.(status)
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
        <div className="flex items-center gap-2 flex-1 mr-2">
          {isEditing ? (
            <div className="flex items-center gap-1 w-full">
              <Input 
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit()
                  if (e.key === 'Escape') handleCancelEdit()
                }}
                className="h-7 text-xs py-0 px-2"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500" onClick={handleSaveEdit}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={handleCancelEdit}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <h2 className="font-headline font-semibold text-sm tracking-wide truncate max-w-[150px]">{status.toUpperCase()}</h2>
              <span className="flex items-center justify-center h-5 px-1.5 text-[10px] font-bold rounded-full bg-card border text-muted-foreground">
                {tasks.length}
              </span>
            </>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {showAddButton && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddTask(status)}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleStartEdit} className="gap-2 cursor-pointer">
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
