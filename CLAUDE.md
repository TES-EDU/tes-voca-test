# TES VOCA 종합테스트 — Claude Code 인수인계 문서

## 프로젝트 개요

TES 영어학원 보카 종합테스트 웹앱. 태블릿(iPad) 기준 최적화.  
React + Vite + TypeScript + Tailwind CSS + Supabase.  
배포: Vercel (`/tes-voca-test/` 베이스 경로).

---

## 파일 구조

```
tes-voca-test/
├── src/
│   ├── App.tsx                    # 라우팅 (query param 기반)
│   ├── lib/
│   │   ├── supabase.ts            # Supabase 클라이언트 + CRUD
│   │   └── testGenerator.ts       # 시험 생성 로직
│   ├── data/
│   │   └── vocaData.json          # 전체 단어 데이터 (레벨 1~6)
│   └── components/
│       ├── StartScreen.tsx        # 시작 화면 (이름 입력 + 테스트 선택)
│       ├── TestScreen.tsx         # 시험 화면 (1문제씩)
│       ├── ResultScreen.tsx       # 결과/성적표 화면
│       ├── SharedReport.tsx       # 공유 링크 성적표 (?report=uuid)
│       ├── AdminPage.tsx          # 선생님 성적 관리 (?admin=true)
│       └── TeacherLogin.tsx       # 선생님 로그인
```

---

## 라우팅 (App.tsx — query param 방식)

```
/tes-voca-test/              → StartScreen
/tes-voca-test/?admin=true   → AdminPage (선생님 페이지)
/tes-voca-test/?report=UUID  → SharedReport (공유 성적표)
```

화면 전환은 React state(`screen: 'start' | 'test' | 'result'`)로 관리.  
React Router 없음. URL hash/history 변경 없음.

---

## 시험 생성 로직 (testGenerator.ts)

- `generateTest(levelGroup: '1-2' | '3-4' | '5-6'): Question[]`
- 2개 레벨 × 30 unit × **unit당 1문제** = **총 60문제**
- 오답 보기: 같은 품사(pos) 단어 우선, 3개 선택
- 예문에서 정답 단어 → `--------` 치환 (정규식, 대소문자 무시)
- `valid: false` 단어(예문에 단어 없음) 자동 제외

### 데이터 구조

```typescript
interface Question {
  id: number;
  level: number;       // 1~6
  unit: number;        // 1~30
  word: string;
  meaning: string;     // "n. 아이, 어린이"
  sentence: string;    // 빈칸 처리된 영문 예문
  translation: string; // 한국어 해석
  options: string[];   // 보기 4개 (셔플)
  answerIndex: number; // 정답 인덱스 (0~3)
}
```

---

## Supabase (supabase.ts)

- URL: `https://pujiailalhhytbxvsrxj.supabase.co`
- 테이블: `test_results`
- RLS: 누구나 읽기/쓰기 (로그인 없음)

```typescript
// 결과 저장 → UUID 반환
saveTestResult(result): Promise<string | null>

// UUID로 단건 조회 (공유 링크용)
getTestResult(id: string): Promise<TestResultRow | null>

// 전체 조회 (선생님 페이지)
getAllTestResults(): Promise<TestResultRow[]>
```

```typescript
interface TestResultRow {
  id?: string;
  user_name: string;
  book_title: string;       // "TES VOCA LV 1-2"
  unit_title: string;       // levelGroup: "1-2" | "3-4" | "5-6"
  total_questions: number;  // 60
  score: number;            // 정답률 0~100
  time_taken: number;       // 0 (미사용)
  correct_answers: { word: string; meaning: string }[];
  incorrect_answers: {
    word: string; meaning: string;
    userAnswer: string; correctAnswer: string; sentence: string;
  }[];
  created_at?: string;
}
```

---

## 현재 디자인 토큰 (Tailwind)

### 색상 팔레트
| 역할 | 클래스 |
|------|--------|
| 배경 | `bg-slate-50` |
| 카드/패널 | `bg-white` |
| 테두리 | `border-slate-100` / `border-slate-200` |
| 메인 강조 | `indigo-600` |
| 선택된 보기 | `bg-indigo-50 border-indigo-400 text-indigo-700` |
| 정답 피드백 | `bg-emerald-50 border-emerald-400 text-emerald-700` |
| 오답 피드백 | `bg-red-50 border-red-400 text-red-700` |
| 점수 카드 | `bg-gradient-to-r from-indigo-500 to-purple-500` |
| 정답 태그 | `bg-emerald-50 text-emerald-700` |
| 오답 행 | `bg-red-50` |

### LV별 테스트 카드 색상
| LV | 그라디언트 | 테두리 호버 |
|----|-----------|------------|
| 1-2 | `from-blue-500 to-indigo-600` | `hover:border-blue-400` |
| 3-4 | `from-emerald-500 to-teal-600` | `hover:border-emerald-400` |
| 5-6 | `from-red-500 to-rose-600` | `hover:border-red-400` |

### 주요 치수
| 요소 | 값 |
|------|----|
| 최대 너비 | `max-w-2xl` (672px) |
| 보기 버튼 높이 | `min-h-[64px]` |
| 보기 그리드 | `grid grid-cols-2 gap-4` |
| 카드 모서리 | `rounded-2xl` |
| 버튼 모서리 | `rounded-xl` |
| 진행바 높이 | `h-2.5` (10px) |
| 예문 폰트 | `text-xl font-medium` |
| 번호 뱃지 | `w-6 h-6 rounded-full` |

---

## 화면별 현재 구현 상태

### StartScreen.tsx
- 📚 아이콘 + "TES VOCA" 타이틀
- 학생 이름 입력 → 비어있으면 버튼 `disabled` + `opacity-50`
- 테스트 카드 3개 (LV별 색상 다름)
- 카드 우측에 "60 / 문제" 표시
- 하단 "선생님 페이지" 링크 (`?admin=true`)

### TestScreen.tsx
- 상단 sticky 진행바 (indigo→purple 그라디언트)
- 진행 상황: `현재번호 / 전체` + `✓ 답변완료수`
- Q번호 → 예문카드(흰 카드) → 보기 2×2 그리드 → 이전/다음 버튼
- 보기 선택 시 300ms 딜레이 후 자동 다음 문제 이동
- 선택 직후 애니메이션 중 정오답 색상 피드백
- 마지막 문제에서 "다음" → "제출하기" 버튼으로 전환
- 하단 학생 이름 표시

### ResultScreen.tsx
- sticky 헤더 "성적표"
- 리포트 카드: TES VOCA 로고 | 학원명
- 정답률 그라디언트 카드 (점수 크게, indigo→purple)
- 통계 테이블 (총문제/정답/오답)
- 오답 목록 (접이식, 기본 펼침) — 틀린 답 → 정답 표시
- 정답 목록 (접이식, 기본 접힘) — 태그로 나열
- "성적표 공유하기" 버튼 → Supabase 저장 → URL 클립보드 복사
- "처음으로 돌아가기" 버튼

### SharedReport.tsx
- ResultScreen과 동일한 UI (읽기 전용)
- Supabase에서 UUID로 데이터 로드
- 로딩/에러 상태 처리

### AdminPage.tsx
- TeacherLogin 통과 후 접근 (sessionStorage 기반)
- LV 필터 탭 (전체/1-2/3-4/5-6)
- 학생별 결과 카드: 점수% | 이름 | LV 뱃지 | 날짜 | 링크복사 버튼
- 점수 색상: ≥90 emerald / ≥70 indigo / ≥50 amber / <50 red

---

## 개선 요청 사항

### TestScreen 디자인 개선 (주요 목표)
현재 TestScreen은 기능은 완성되어 있으나 시각적으로 단조로움.  
아래 방향으로 개선 요청:

- **보기 버튼**: 더 크고 입체감 있게 (shadow, 선택 시 scale 애니메이션)
- **예문 카드**: 더 눈에 띄게 (배경 색상, 폰트 크기 조정)
- **진행바**: 현재 심플한 바 → 더 정보가 풍부하게 (답변 완료 수 시각화)
- **전체 레이아웃**: 태블릿 가로모드 최적화
- **색상**: indigo 계열 유지하되 더 생동감 있게

### 태블릿 최적화 조건
- 최소 터치 영역: 48px × 48px
- 보기 버튼 최소 높이: 64px 이상
- 예문 폰트: 18px 이상 (`text-xl` = 20px, 현재 적절)
- 가로모드(landscape) 우선

---

## 개발 명령어

```bash
npm run dev     # 개발 서버 (http://localhost:5173/tes-voca-test/)
npm run build   # 빌드
npm run preview # 빌드 미리보기
```

## 의존성 주요 패키지

```json
{
  "react": "^19",
  "typescript": "~5.8",
  "vite": "^6",
  "tailwindcss": "^4",
  "@supabase/supabase-js": "^2",
  "lucide-react": "^0.511"
}
```
