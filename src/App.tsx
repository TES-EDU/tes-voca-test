import { useState, useCallback } from 'react';
import StartScreen from './components/StartScreen';
import TestScreen from './components/TestScreen';
import ResultScreen from './components/ResultScreen';
import ResultDetailScreen from './components/ResultDetailScreen';
import SharedReport from './components/SharedReport';
import AdminPage from './components/AdminPage';
import StudentHistoryScreen from './components/StudentHistoryScreen';
import { generateTest, type Question } from './lib/testGenerator';

type Screen = 'start' | 'test' | 'result' | 'result-detail';

const params = new URLSearchParams(window.location.search);
const sharedReportId = params.get('report');
const isAdmin = params.get('admin') === 'true';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [studentName, setStudentName] = useState('');
  const [levelGroup, setLevelGroup] = useState<'1-2' | '3-4' | '5-6'>('1-2');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [adminStudent, setAdminStudent] = useState<string | null>(null);

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
    if (adminStudent) {
      return (
        <StudentHistoryScreen
          studentName={adminStudent}
          onBack={() => setAdminStudent(null)}
          onReportClick={(id) => {
            window.location.href = `${window.location.pathname}?report=${id}`;
          }}
        />
      );
    }
    return <AdminPage onStudentClick={(name) => setAdminStudent(name)} />;
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

  if (screen === 'result') {
    return (
      <ResultScreen
        questions={questions}
        answers={answers}
        studentName={studentName}
        levelGroup={levelGroup}
        onRestart={handleRestart}
        onReviewDetail={() => setScreen('result-detail')}
      />
    );
  }

  if (screen === 'result-detail') {
    return (
      <ResultDetailScreen
        questions={questions}
        answers={answers}
        studentName={studentName}
        levelGroup={levelGroup}
        onBack={() => setScreen('result')}
      />
    );
  }

  return null;
}
