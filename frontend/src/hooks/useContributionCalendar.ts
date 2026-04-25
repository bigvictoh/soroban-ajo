import { useState, useEffect } from 'react';

interface ContributionData {
  date: string;
  count: number;
  status: 'completed' | 'pending' | 'missed';
}

export const useContributionCalendar = (groupId: string) => {
  const [data, setData] = useState<ContributionData[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch contribution data
    const fetchData = async () => {
      try {
        // Replace with actual API call
        const mockData = generateMockData();
        setData(mockData);
        calculateStreak(mockData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch contribution data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId]);

  const generateMockData = (): ContributionData[] => {
    const data: ContributionData[] = [];
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      data.push({
        date: dateStr,
        count: Math.floor(Math.random() * 8),
        status: Math.random() > 0.9 ? 'missed' : Math.random() > 0.8 ? 'pending' : 'completed',
      });
    }

    return data;
  };

  const calculateStreak = (contributions: ContributionData[]) => {
    let currentStreak = 0;
    let maxStreak = 0;
    const sorted = contributions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const contrib of sorted) {
      if (contrib.status === 'completed') {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    setStreak(currentStreak);
    setBestStreak(maxStreak);
  };

  return { data, streak, bestStreak, loading };
};
