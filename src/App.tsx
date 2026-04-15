import { useState, useCallback } from 'react';
import StartScreen from './components/StartScreen';
import TestScreen from './components/TestScreen';
import ResultScreen from './components/ResultScreen';
import SharedReport from './components/SharedReport';
import AdminPage from './components/AdminPage';
import { generateTest, type Question } from './lib/testGenerator';

type Screen = 'start' | 'test' | 'result';

const params = new URLSearchParams(window.location.search);
const sharedReportId = params.get('report');
const isAdmin = params.get('admin') === 'true';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [studentName, setStudentName] = useState('');
  const [levelGroup, setLevelGroup] = useState<'1-2' | '3-4' | '5-6'>('1-2');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const handleStart = useCallback((name: string, group: '1-2' | '3-4' | '5-6') => {
    const qs = generateTest(group);
    setStudentName(name);
    setLevelGroup(group);
    setQuestions(qs);
    setAnswers(Array(qs.length).fill(null));
    setScreen('test');
  }, []);

  const handleFinish = useCallback((ans: (number | null)[]) => {
    setAnswers(ans);
    setScreen('result');
  }, []);

  const handleRestart = useCallback(() => {
    setScreen('start');
    setQuestions([]);
    setAnswers([]);
  }, []);

  if (isAdmin) {
    return <AdminPage />;
  }

  if (sharedReportId) {
    return <SharedReport reportId={sharedReportId} />;
  }

  if (screen === 'start') {
    return <StartScreen onStart={handleStart} />;
  }

  if (screen === 'test') {
    return (
      <TestScreen
        questions={questions}
        studentName={studentName}
        levelGroup={levelGroup}
        onFinish={handleFinish}
      />
    );
  }

  return (
    <ResultScreen
      questions={questions}
      answers={answers}
      studentName={studentName}
      levelGroup={levelGroup}
      onRestart={handleRestart}
    />
  );
}
