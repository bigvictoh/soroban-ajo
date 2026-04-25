'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import React, { useState } from 'react';

interface ContributionData {
  date: string;
  count: number;
  status: 'completed' | 'pending' | 'missed';
}

interface ContributionCalendarProps {
  data: ContributionData[];
  onDateClick?: (date: string) => void;
}

export const ContributionCalendar: React.FC<ContributionCalendarProps> = ({
  data,
  onDateClick,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [streak, setStreak] = useState(0);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getContributionColor = (count: number, status: string) => {
    if (status === 'missed') return 'bg-red-200 dark:bg-red-900';
    if (status === 'pending') return 'bg-yellow-200 dark:bg-yellow-900';
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count < 3) return 'bg-blue-200 dark:bg-blue-900';
    if (count < 6) return 'bg-blue-400 dark:bg-blue-700';
    return 'bg-blue-600 dark:bg-blue-500';
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const exportToIcal = () => {
    const icalContent = data
      .filter((d) => d.status === 'completed')
      .map(
        (d) =>
          `BEGIN:VEVENT\nDTSTART:${d.date.replace(/-/g, '')}\nSUMMARY:Contribution\nEND:VEVENT`
      )
      .join('\n');

    const ical = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Ajo//Contribution Calendar//EN\n${icalContent}\nEND:VCALENDAR`;

    const blob = new Blob([ical], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contributions.ics';
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Current streak: <span className="font-bold text-orange-500">{streak} days</span>
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={exportToIcal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Download size={18} />
          Export
        </motion.button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ChevronLeft size={20} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ChevronRight size={20} />
        </motion.button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const contribution = data.find((d) => d.date === dateStr);

          return (
            <motion.div
              key={day}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDateClick?.(dateStr)}
              className={`
                aspect-square flex items-center justify-center rounded-lg cursor-pointer
                transition-all ${getContributionColor(contribution?.count || 0, contribution?.status || '')}
              `}
              title={`${dateStr}: ${contribution?.count || 0} contributions`}
            >
              <span className="text-sm font-medium">{day}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded" />
          <span>No contributions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-200 dark:bg-blue-900 rounded" />
          <span>1-2 contributions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 dark:bg-blue-700 rounded" />
          <span>3-5 contributions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 dark:bg-blue-500 rounded" />
          <span>6+ contributions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-900 rounded" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 dark:bg-red-900 rounded" />
          <span>Missed</span>
        </div>
      </div>
    </motion.div>
  );
};

// Streak tracker component
export const StreakTracker = ({ currentStreak, bestStreak }: any) => (
  <div className="grid grid-cols-2 gap-4">
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg p-4 text-white"
    >
      <p className="text-sm opacity-90">Current Streak</p>
      <p className="text-3xl font-bold">{currentStreak}</p>
      <p className="text-xs opacity-75">days</p>
    </motion.div>
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-4 text-white"
    >
      <p className="text-sm opacity-90">Best Streak</p>
      <p className="text-3xl font-bold">{bestStreak}</p>
      <p className="text-xs opacity-75">days</p>
    </motion.div>
  </div>
);
