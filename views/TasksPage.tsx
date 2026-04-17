"use client"

import type React from "react"
import { useState } from "react"
import { type AppState, type Task, TaskStatus, TaskPriority } from "../types"
import { Icons } from "../constants"
import { getTodayDateString } from "../lib/dateUtils"
import { getPriorityColor } from "../lib/priorityUtils"

interface TasksPageProps {
  state: AppState
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void
}

type SortField = "deadline" | "project" | "priority"

const TasksPage: React.FC<TasksPageProps> = ({ state, updateState }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskProject, setNewTaskProject] = useState("")
  const [newProjectInput, setNewProjectInput] = useState("")
  const [newTaskDeadline, setNewTaskDeadline] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.MEDIUM)
  const [sortField, setSortField] = useState<SortField>("deadline")
  const [filterProject, setFilterProject] = useState<string>("")

  const todayStr = getTodayDateString()

  const allTasks = state.tasks || []
  
  // Filter tasks: show only pending tasks OR tasks completed TODAY
  const filteredTasks = allTasks.filter(task => {
    if (task.status !== TaskStatus.DONE) {
      return true
    }
    return task.completedAt === todayStr
  })

  // Apply project filter
  const projectFilteredTasks = filterProject 
    ? filteredTasks.filter(t => t.project === filterProject)
    : filteredTasks

  // Sort tasks
  const sortedTasks = [...projectFilteredTasks].sort((a, b) => {
    // Always sort by deadline first (closest first)
    const deadlineA = a.deadline || "9999-12-31"
    const deadlineB = b.deadline || "9999-12-31"
    const dateCompare = deadlineA.localeCompare(deadlineB)
    
    if (dateCompare !== 0) return dateCompare

    // Then by priority (High > Medium > Low)
    const priorityOrder: Record<TaskPriority, number> = {
      [TaskPriority.HIGH]: 0,
      [TaskPriority.MEDIUM]: 1,
      [TaskPriority.LOW]: 2,
    }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
  
  // Extract unique projects from ALL tasks (including completed) for the dropdown
  // Store all historical projects in state.projects
  const projectsFromTasks = [...new Set(allTasks.map(t => t.project).filter(Boolean))]
  const savedProjects = state.projects || []
  const allHistoricalProjects = [...new Set([...savedProjects, ...projectsFromTasks])].sort()

  const handleSaveTask = () => {
    if (!newTaskTitle) return

    const finalProject = newProjectInput || newTaskProject || "Personal"

    // Add project to historical list if it's new
    if (!allHistoricalProjects.includes(finalProject)) {
      updateState("projects", [...allHistoricalProjects, finalProject])
    }

    if (editingTask) {
      const updatedTasks = allTasks.map((t) =>
        t.id === editingTask.id
          ? { ...t, title: newTaskTitle, project: finalProject, deadline: newTaskDeadline, priority: newTaskPriority }
          : t,
      )
      updateState("tasks", updatedTasks)
    } else {
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: newTaskTitle,
        project: finalProject,
        deadline: newTaskDeadline,
        status: TaskStatus.TODO,
        priority: newTaskPriority,
        userId: state.user!.id,
      }
      updateState("tasks", [...allTasks, newTask])
    }

    resetForm()
  }

  const resetForm = () => {
    setNewTaskTitle("")
    setNewTaskProject("")
    setNewProjectInput("")
    setNewTaskDeadline("")
    setNewTaskPriority(TaskPriority.MEDIUM)
    setEditingTask(null)
    setIsModalOpen(false)
  }

  const editTask = (task: Task) => {
    setEditingTask(task)
    setNewTaskTitle(task.title)
    setNewTaskProject(task.project)
    setNewTaskDeadline(task.deadline)
    setNewTaskPriority(task.priority)
    setIsModalOpen(true)
  }

  const deleteTask = (id: string) => {
    updateState(
      "tasks",
      allTasks.filter((t) => t.id !== id),
    )
  }

  const toggleTaskStatus = (task: Task) => {
    const isNowDone = task.status !== TaskStatus.DONE
    const newStatus = isNowDone ? TaskStatus.DONE : TaskStatus.TODO
    const completedAt = isNowDone ? getTodayDateString() : null

    const updated = allTasks.map((t) => (t.id === task.id ? { ...t, status: newStatus, completedAt } : t))
    updateState("tasks", updated)
  }

  const renderTaskTitleWithLinks = (title: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = title.split(urlRegex)

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cerulean underline hover:text-balticblue hover:decoration-2 transition-colors cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-yaleblue">Tasks</h2>
          <p className="text-muted-foreground">Manage your projects and to-dos.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-cerulean text-white px-4 py-2 rounded-none hover:bg-balticblue transition-colors shadow-sm"
        >
          <Icons.Plus />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Filter by Project</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 border border-border rounded-none text-sm focus:ring-2 focus:ring-cerulean outline-none"
          >
            <option value="">All Projects</option>
            {allHistoricalProjects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Sort by</label>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-2 border border-border rounded-none text-sm focus:ring-2 focus:ring-cerulean outline-none"
          >
            <option value="deadline">Deadline (nearest first)</option>
            <option value="priority">Priority</option>
            <option value="project">Project</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-none shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-yaleblue w-12"></th>
                <th className="px-6 py-3 text-sm font-semibold text-yaleblue">Task Title</th>
                <th className="px-6 py-3 text-sm font-semibold text-yaleblue">Project</th>
                <th className="px-6 py-3 text-sm font-semibold text-yaleblue">Deadline</th>
                <th className="px-6 py-3 text-sm font-semibold text-yaleblue">Priority</th>
                <th className="px-6 py-3 text-sm font-semibold text-yaleblue text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTasks.map((task) => {
                const isDone = task.status === TaskStatus.DONE
                const isPastDue = task.deadline && task.deadline < todayStr && !isDone

                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-background transition-colors group ${isPastDue ? "bg-red-500/100/10" : ""}`}
                  >
                    <td className="px-6 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleTaskStatus(task)}
                        className="w-5 h-5 rounded border-border text-cerulean focus:ring-cerulean transition-all cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-2">
                      <div className="flex flex-col">
                        <span
                          className={`font-medium text-foreground transition-all text-sm ${isDone ? "line-through text-muted-foreground" : ""} ${isPastDue ? "text-red-400 font-bold" : ""}`}
                        >
                          {renderTaskTitleWithLinks(task.title)}
                        </span>
                        {isPastDue && (
                          <span className="text-[10px] text-red-500 font-black uppercase tracking-wider">Past Due</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-2">
                      <span className="text-xs text-bondiblue bg-bondiblue/5 px-2 py-0.5 rounded">{task.project}</span>
                    </td>
                    <td className="px-6 py-2">
                      <span
                        className={`text-xs font-medium ${isPastDue ? "text-red-500 underline decoration-red-300" : "text-muted-foreground"} ${isDone ? "opacity-50" : ""}`}
                      >
                        {task.deadline || "No date"}
                      </span>
                    </td>
                    <td className="px-6 py-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${getPriorityColor(task.priority)} ${isDone ? "opacity-50" : ""}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-2 text-right space-x-1">
                      <button
                        onClick={() => editTask(task)}
                        className="p-1.5 text-muted-foreground hover:text-cerulean transition-colors"
                      >
                        <Icons.Edit />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Icons.Delete />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                    No tasks found. Create one to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-yaleblue/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-none w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-limecream/10">
              <h3 className="text-xl font-bold text-yaleblue">{editingTask ? "Edit Task" : "Create New Task"}</h3>
              <button onClick={resetForm} className="text-muted-foreground hover:text-muted-foreground text-2xl">
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-none outline-none focus:ring-2 focus:ring-bondiblue"
                  placeholder="What needs to be done?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Project</label>
                  <select
                    value={newTaskProject}
                    onChange={(e) => setNewTaskProject(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-none outline-none focus:ring-2 focus:ring-bondiblue"
                  >
                    <option value="">Select project...</option>
                    {allHistoricalProjects.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">New Project?</label>
                  <input
                    type="text"
                    value={newProjectInput}
                    onChange={(e) => setNewProjectInput(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-none outline-none focus:ring-2 focus:ring-bondiblue"
                    placeholder="Add new project..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Deadline</label>
                  <input
                    type="date"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-none outline-none focus:ring-2 focus:ring-bondiblue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-4 py-2 border border-border rounded-none outline-none focus:ring-2 focus:ring-bondiblue"
                  >
                    {Object.values(TaskPriority).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 bg-background border-t border-border flex justify-end space-x-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-muted-foreground font-medium hover:bg-muted rounded-none transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                className="px-6 py-2 bg-cerulean text-white font-bold rounded-none hover:bg-balticblue transition-colors shadow-sm"
              >
                {editingTask ? "Update Task" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TasksPage
