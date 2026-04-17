import { TaskPriority } from '../types'

export const getPriorityColor = (p: TaskPriority): string => {
  switch (p) {
    case TaskPriority.HIGH:
      return "text-balticblue bg-limecream/30"
    case TaskPriority.MEDIUM:
      return "text-cerulean bg-cerulean/10"
    case TaskPriority.LOW:
      return "text-oceanmist bg-oceanmist/10"
    default:
      return "text-slate-600 bg-slate-50"
  }
}
