import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pujiailalhhytbxvsrxj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1amlhaWxhbGhoeXRieHZzcnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzQ0MDcsImV4cCI6MjA4NDU1MDQwN30.Xvg5hXg_dINFkps4yoSJ0LEIxDLXMhDPSOVheIPpgHk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// Types
// ============================================

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
  student_id?: string | null;
  academy_id?: string | null;
  created_at?: string;
}

export interface StudentRow {
  id: string;
  name: string;
  grade: string | null;
  academy_id: string | null;
  created_at?: string;
}

export interface AcademyRow {
  id: string;
  name: string;
  code: string;
}

export interface ClassRow {
  id: string;
  name: string;
  student_ids: string[];
  test_code: string | null;
  academy_id?: string;
}

// ============================================
// Academy / Session Storage
// ============================================

export function setCurrentAcademy(academy: AcademyRow) {
  sessionStorage.setItem('currentAcademy', JSON.stringify(academy));
}

export function getCurrentAcademy(): AcademyRow | null {
  const stored = sessionStorage.getItem('currentAcademy');
  return stored ? JSON.parse(stored) : null;
}

export function getCurrentAcademyId(): string | null {
  return getCurrentAcademy()?.id ?? null;
}

// ============================================
// Teacher Auth (Google OAuth)
// ============================================

export async function teacherLoginWithGoogle() {
  const redirectUrl = window.location.origin + window.location.pathname + '?admin=true';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl },
  });
  return { data, error };
}

export async function teacherLogout() {
  sessionStorage.removeItem('currentAcademy');
  sessionStorage.removeItem('teacher_auth');
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getTeacherSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

/** Get academies that the current logged-in teacher belongs to */
export async function getMyAcademies(): Promise<(AcademyRow & { role: string })[]> {
  const { session } = await getTeacherSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('academy_teachers')
    .select('academy_id, role, academies(id, name, code)')
    .eq('user_id', session.user.id);

  if (error || !data) return [];

  return data
    .filter((d: Record<string, unknown>) => d.academies)
    .map((d: Record<string, unknown>) => {
      const academy = d.academies as Record<string, unknown>;
      return {
        id: academy.id as string,
        name: academy.name as string,
        code: academy.code as string,
        role: d.role as string,
      };
    });
}

// ============================================
// Academy Code Lookup (Student-side)
// ============================================

export interface CodeLookupResult {
  type: 'academy' | 'class';
  academy: AcademyRow;
  classData?: ClassRow;
}

/** Look up a code: first check classes.test_code, then academies.code */
export async function lookupCode(code: string): Promise<CodeLookupResult | null> {
  const upperCode = code.trim().toUpperCase();

  // 1. Check classes.test_code
  const { data: classRow } = await supabase
    .from('classes')
    .select('id, name, student_ids, test_code')
    .eq('test_code', upperCode)
    .maybeSingle();

  if (classRow) {
    // Get the academy this class belongs to
    // classes table has an implicit academy link via student_ids or we need academy_id
    // For now, look up the academy separately if needed
    const { data: academyData } = await supabase
      .from('academies')
      .select('id, name, code')
      .limit(1)
      .single();

    if (academyData) {
      return {
        type: 'class',
        academy: academyData,
        classData: classRow,
      };
    }
  }

  // 2. Check academies.code
  const { data: academyRow } = await supabase
    .from('academies')
    .select('id, name, code')
    .eq('code', upperCode)
    .maybeSingle();

  if (academyRow) {
    return { type: 'academy', academy: academyRow };
  }

  return null;
}

// ============================================
// Student Functions (shared with Speaking App)
// ============================================

/** Find a student by name within a specific academy */
export async function findStudent(name: string, academyId: string): Promise<StudentRow | null> {
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('name', name.trim())
    .eq('academy_id', academyId)
    .order('created_at', { ascending: true })
    .limit(1);

  return data && data.length > 0 ? data[0] : null;
}

/** Create a new student in the given academy */
export async function createStudentProfile(name: string, academyId: string): Promise<StudentRow | null> {
  const { data, error } = await supabase
    .from('students')
    .insert([{ name: name.trim(), academy_id: academyId }])
    .select()
    .single();

  if (error) {
    console.error('Failed to create student:', error);
    return null;
  }
  return data;
}

/** Add a student to a class's student_ids array */
export async function addStudentToClass(classId: string, studentId: string) {
  const { data: classRow } = await supabase
    .from('classes')
    .select('student_ids')
    .eq('id', classId)
    .single();

  if (!classRow) return;

  const ids: string[] = classRow.student_ids || [];
  if (!ids.includes(studentId)) {
    await supabase
      .from('classes')
      .update({ student_ids: [...ids, studentId] })
      .eq('id', classId);
  }
}

// ============================================
// Test Results
// ============================================

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

export async function getAllTestResults(academyId?: string | null): Promise<TestResultRow[]> {
  let query = supabase
    .from('test_results')
    .select('*')
    .in('unit_title', ['1-2', '3-4', '5-6'])
    .order('created_at', { ascending: false });

  if (academyId) {
    // Show results for this academy + legacy results (no academy_id)
    query = query.or(`academy_id.eq.${academyId},academy_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get test results:', error);
    return [];
  }

  return data ?? [];
}

export async function deleteStudentResults(userName: string): Promise<boolean> {
  const { error } = await supabase
    .from('test_results')
    .delete()
    .eq('user_name', userName);
  if (error) { console.error('Failed to delete student results:', error); return false; }
  return true;
}

export async function getStudentResults(userName: string): Promise<TestResultRow[]> {
  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_name', userName)
    .order('created_at', { ascending: false });
  if (error) { console.error('Failed to get student results:', error); return []; }
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

// ============================================
// Class Management (for admin)
// ============================================

export async function getClasses(academyId?: string | null): Promise<ClassRow[]> {
  let query = supabase.from('classes').select('*').order('name');
  // If we have an academy filter, use it. Otherwise get all.
  // Note: classes table may not have academy_id column yet in all setups
  if (academyId) {
    // For now, get all classes (shared DB)
  }
  const { data, error } = await query;
  if (error) { console.error('Failed to get classes:', error); return []; }
  return data ?? [];
}

export async function createClass(name: string, studentIds: string[] = []): Promise<ClassRow | null> {
  // Generate a random test_code
  const testCode = generateTestCode();
  const { data, error } = await supabase
    .from('classes')
    .insert([{ name, student_ids: studentIds, type: 'group', test_code: testCode }])
    .select()
    .single();
  if (error) { console.error('Failed to create class:', error); return null; }
  return data;
}

export async function updateClassStudents(classId: string, studentIds: string[]) {
  const { error } = await supabase
    .from('classes')
    .update({ student_ids: studentIds })
    .eq('id', classId);
  if (error) console.error('Failed to update class:', error);
  return !error;
}

export async function deleteClass(classId: string) {
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) console.error('Failed to delete class:', error);
  return !error;
}

function generateTestCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'T';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// Student Management (for admin)
// ============================================

export async function getStudents(academyId?: string | null): Promise<StudentRow[]> {
  let query = supabase.from('students').select('*').order('created_at', { ascending: false });
  if (academyId) {
    query = query.eq('academy_id', academyId);
  }
  const { data, error } = await query;
  if (error) { console.error('Failed to get students:', error); return []; }
  return data ?? [];
}
