import { createHashRouter } from 'react-router-dom'
import { AppLayout } from '@shell/layout/app-layout'
import { lazy } from 'react'

// 懒加载页面组件
const DashboardPage = lazy(() => import('@plugins/dashboard/views/dashboard-page'))
const ChatPage = lazy(() => import('@plugins/chat/views/chat-page'))
const CalendarPage = lazy(() => import('@plugins/calendar/views/calendar-page'))
const TodoPage = lazy(() => import('@plugins/todo/views/todo-page'))
const FitnessPage = lazy(() => import('@plugins/fitness/views/fitness-page'))
const DietPage = lazy(() => import('@plugins/diet/views/diet-page'))
const MemoPage = lazy(() => import('@plugins/memo/views/memo-page'))
const WeatherPage = lazy(() => import('@plugins/weather/views/weather-page'))
const StatisticsPage = lazy(() => import('@plugins/statistics/views/statistics-page'))
const SettingsPage = lazy(() => import('@plugins/settings/views/settings-page'))

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'chat/:sessionId', element: <ChatPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'todo', element: <TodoPage /> },
      { path: 'fitness', element: <FitnessPage /> },
      { path: 'diet', element: <DietPage /> },
      { path: 'memo', element: <MemoPage /> },
      { path: 'weather', element: <WeatherPage /> },
      { path: 'statistics', element: <StatisticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
