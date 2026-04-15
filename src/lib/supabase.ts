import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface TestResultRow {
  id?: string;
  user_name: string;
  book_title: string;
  unit_title: string;
  total_questions: number;
  score: number;
  time_taken: number;
  correct_answers: { word: string; meaning: string }[];
  incorrect_answers: {
    word: string;
    meaning: string;
    userAnswer: string;
    correctAnswer: string;
    sentence: string;
  }[];
  created_at?: string;
}

export async function saveTestResult(result: Omit<TestResultRow, 'id' | 'created_at'>): Promise<string | null> {
  const { data, error } = await supabase
    .from('test_results')
    .insert([result])
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save test result:', error);
    return null;
  }

  return data.id;
}

export async function getAllTestResults(): Promise<TestResultRow[]> {
  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .in('unit_title', ['1-2', '3-4', '5-6'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get test results:', error);
    return [];
  }

  return data ?? [];
}

export async function getTestResult(id: string): Promise<TestResultRow | null> {
  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to get test result:', error);
    return null;
  }

  return data;
}
