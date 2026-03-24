"use client"

import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Task, INITIAL_COLUMNS } from "@/types/task"
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  Trophy,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkspaceMember {
  id: string
  name: string
  role: string
}

interface AnalyticsDashboardProps {
  tasks: Task[]
  members: WorkspaceMember[]
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
]

const STATUS_COLORS: Record<string, string> = {
  New: "#6366f1",
  "In Development": "#f59e0b",
  "Ready for Review": "#3b82f6",
  Resolved: "#22c55e",
  Closed: "#6b7280",
}

export function AnalyticsDashboard({ tasks, members }: AnalyticsDashboardProps) {
  // Filter out admin from student list
  const students = members.filter((m) => m.role !== "admin")

  // --- Summary Stats ---
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "Resolved" || t.status === "Closed").length
  const inProgressTasks = tasks.filter((t) => t.status === "In Development").length
  const overallCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Tasks with due dates
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate) return false
    return new Date(t.dueDate) < new Date() && t.status !== "Resolved" && t.status !== "Closed"
  }).length

  // --- Task Distribution by Status (Pie Chart) ---
  const statusDistribution = INITIAL_COLUMNS.map((col) => ({
    name: col,
    value: tasks.filter((t) => t.status === col).length,
    fill: STATUS_COLORS[col] || "#94a3b8",
  })).filter((d) => d.value > 0)

  const statusChartConfig: ChartConfig = {
    value: { label: "Tasks" },
  }

  // --- Student Performance Data ---
  const studentPerformance = students.map((student) => {
    const studentTasks = tasks.filter(
      (t) => t.assigneeId === student.id || t.assignee === student.name || t.creatorId === student.id
    )
    const completed = studentTasks.filter(
      (t) => t.status === "Resolved" || t.status === "Closed"
    ).length
    const total = studentTasks.length
    const inProgress = studentTasks.filter((t) => t.status === "In Development").length
    const newTasks = studentTasks.filter((t) => t.status === "New").length

    // Calculate average days from creation to now for completed tasks
    const completedTaskDurations = studentTasks
      .filter((t) => t.status === "Resolved" || t.status === "Closed")
      .map((t) => {
        const created = new Date(t.createdAt).getTime()
        const now = Date.now()
        return Math.max(1, Math.round((now - created) / (1000 * 60 * 60 * 24)))
      })

    const avgDays =
      completedTaskDurations.length > 0
        ? Math.round(completedTaskDurations.reduce((a, b) => a + b, 0) / completedTaskDurations.length)
        : 0

    return {
      name: student.name,
      id: student.id,
      total,
      completed,
      inProgress,
      newTasks,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgDays,
    }
  })

  // Sort by activity (total tasks)
  const sortedByActivity = [...studentPerformance].sort((a, b) => b.total - a.total)
  const mostActive = sortedByActivity[0]
  const leastActive = sortedByActivity[sortedByActivity.length - 1]

  // --- Bar Chart: Student Task Breakdown ---
  const barChartConfig: ChartConfig = {
    completed: { label: "Completed", color: "#22c55e" },
    inProgress: { label: "In Progress", color: "#f59e0b" },
    newTasks: { label: "New", color: "#6366f1" },
  }

  // --- Completion Rate Chart ---
  const completionData = studentPerformance
    .filter((s) => s.total > 0)
    .sort((a, b) => b.completionRate - a.completionRate)

  const completionChartConfig: ChartConfig = {
    completionRate: { label: "Completion %", color: "hsl(var(--primary))" },
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-3xl font-bold">{totalTasks}</p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedTasks}</p>
              </div>
              <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <Progress value={overallCompletionRate} className="mt-3 h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">{overallCompletionRate}% completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-amber-600">{inProgressTasks}</p>
              </div>
              <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-3xl font-bold">{students.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            {overdueTasks > 0 && (
              <div className="flex items-center gap-1 mt-2 text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-[10px] font-medium">{overdueTasks} overdue</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Distribution</CardTitle>
            <CardDescription>Tasks by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} tasks`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No tasks yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Task Breakdown Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Task Breakdown</CardTitle>
            <CardDescription>Tasks per student by status</CardDescription>
          </CardHeader>
          <CardContent>
            {studentPerformance.length > 0 && studentPerformance.some((s) => s.total > 0) ? (
              <ChartContainer config={barChartConfig} className="h-[280px] w-full">
                <BarChart
                  data={studentPerformance}
                  layout="vertical"
                  margin={{ left: 10, right: 10 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="newTasks" stackId="a" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No student data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate + Active Students */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion Rate per Student */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Task Completion Rate</CardTitle>
            <CardDescription>Percentage of completed tasks per student</CardDescription>
          </CardHeader>
          <CardContent>
            {completionData.length > 0 ? (
              <ChartContainer config={completionChartConfig} className="h-[280px] w-full">
                <BarChart data={completionData} margin={{ left: 10, right: 10, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [`${value}%`, "Completion"]}
                  />
                  <Bar dataKey="completionRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {completionData.map((entry, index) => (
                      <Cell
                        key={entry.id}
                        fill={
                          entry.completionRate >= 75
                            ? "#22c55e"
                            : entry.completionRate >= 50
                            ? "#f59e0b"
                            : entry.completionRate >= 25
                            ? "#f97316"
                            : "#ef4444"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No completed tasks yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most / Least Active */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Highlights</CardTitle>
            <CardDescription>Most and least active students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {mostActive && mostActive.total > 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-green-600">
                      Most Active
                    </span>
                  </div>
                  <p className="font-semibold text-sm">{mostActive.name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {mostActive.total} tasks
                    </Badge>
                    <Badge
                      className={cn(
                        "text-[10px]",
                        mostActive.completionRate >= 75
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}
                    >
                      {mostActive.completionRate}% done
                    </Badge>
                  </div>
                </div>

                {leastActive && leastActive.id !== mostActive.id && (
                  <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                        Least Active
                      </span>
                    </div>
                    <p className="font-semibold text-sm">{leastActive.name}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {leastActive.total} tasks
                      </Badge>
                      {leastActive.total > 0 && (
                        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">
                          {leastActive.completionRate}% done
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No activity yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Performance Details</CardTitle>
          <CardDescription>Detailed breakdown per student with avg. time to complete</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">Student</th>
                  <th className="text-center py-3 px-2 font-medium">Total</th>
                  <th className="text-center py-3 px-2 font-medium">Completed</th>
                  <th className="text-center py-3 px-2 font-medium">In Progress</th>
                  <th className="text-center py-3 px-2 font-medium">New</th>
                  <th className="text-center py-3 px-2 font-medium">Completion</th>
                  <th className="text-center py-3 px-2 font-medium">Avg. Days</th>
                </tr>
              </thead>
              <tbody>
                {sortedByActivity.map((student) => (
                  <tr key={student.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2 font-medium">{student.name}</td>
                    <td className="text-center py-3 px-2">{student.total}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-600 font-medium">{student.completed}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-amber-600 font-medium">{student.inProgress}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-indigo-600 font-medium">{student.newTasks}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <Progress
                          value={student.completionRate}
                          className={cn(
                            "h-2 w-16",
                            student.completionRate >= 75
                              ? "[&>div]:bg-green-500"
                              : student.completionRate >= 50
                              ? "[&>div]:bg-amber-500"
                              : "[&>div]:bg-red-500"
                          )}
                        />
                        <span className="text-xs font-medium w-8">{student.completionRate}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">
                      {student.avgDays > 0 ? (
                        <span className="text-xs">{student.avgDays}d</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedByActivity.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No student data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
