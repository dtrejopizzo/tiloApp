export enum TaskStatus {
  TODO = 'To Do',
  DONE = 'Done'
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum HabitFrequency {
  DAILY = 'Daily',
  WEEKLY = 'Weekly'
}

export interface ReminderConfig {
  id: string;
  label: string;
  enabled: boolean;
  time: string; // HH:mm
  frequency: 'daily' | 'hourly';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string; // base64 or URL
  age?: number;
  gender?: 'male' | 'female';
  height?: number; // in cm
  weight?: number; // in kg
  targetCalories?: number;
  targetWater?: number; // in ml
  reminders: ReminderConfig[];
}

export interface Task {
  id: string;
  title: string;
  project: string;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  userId: string;
  completedAt?: string; // date string "YYYY-MM-DD"
}

export interface Habit {
  id: string;
  name: string;
  frequency: HabitFrequency;
  completions: Record<string, boolean>; // date string "YYYY-MM-DD" -> completed
  userId: string;
}

export interface FoodEntry {
  id: string;
  date: string;
  description: string;
  calories: number;
  fat: number;
  carbs: number;
  proteins: number;
  fiber: number;
  mealType: string;
  userId: string;
}

export interface WaterEntry {
  id: string;
  date: string;
  amount: number; // in ml
  userId: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  value: number;
  userId: string;
}

export interface SportActivity {
  id: string;
  type: 'Run' | 'Swim' | 'Cycle' | 'Tennis' | 'Strength' | 'Walk' | 'Hike' | 'Other';
  name: string;
  date: string;
  duration: number; // in minutes
  distance?: number; // in km
  calories?: number;
  source: 'Strava' | 'Manual';
  notes?: string;
  userId: string;
  stravaActivityId?: number; // Strava's unique activity ID for dedup
}

export interface Connection {
  platform: 'Strava';
  isConnected: boolean;
  username?: string;
}

export interface StravaConnection {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
  athleteId: number;
  athleteName?: string;
  connectedAt: string; // ISO date string
}

export interface GoogleConnection {
  id: string; // Firestore doc ID
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
  accountName: string;
  connectedAt: string; // ISO date string
}

export interface GoogleEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string; // ISO date string
  isUnread: boolean;
  accountEmail: string; // which connected account this belongs to
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  allDay: boolean;
  description?: string;
  location?: string;
  meetingLink?: string;
  attendees?: string[];
  accountEmail: string; // which connected account this belongs to
}

export interface AppState {
  user: User | null;
  tasks: Task[];
  habits: Habit[];
  meals: FoodEntry[];
  waterIntake: WaterEntry[];
  weightEntries: WeightEntry[];
  sportActivities: SportActivity[];
  connections: Connection[];
}
