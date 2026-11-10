// 알바생 질문 문구 (11/10 회의): 반말 질문을 AI 로 바꾸지 않고 "“…”라는 질문이 왔어요" 템플릿으로 감싼다

/** “우산 빌려달라는데 여분 있어?”라는 질문이 왔어요 (max 를 주면 질문을 그 길이로 자른다) */
export function questionSentence(question: string, max?: number) {
  const text = question.trim().replace(/\s+/g, ' ')
  const cut = max && text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
  return `“${cut}”라는 질문이 왔어요`
}
