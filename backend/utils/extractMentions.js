const MAX_LEN = 30;

// 이메일 로컬파트 직후의 @는 제외, 한글/영문/숫자/_/- 허용
const MENTION_RE =
  /(?<![A-Za-z0-9._%+-])@([A-Za-z0-9_\-가-힣ㄱ-ㅎㅏ-ㅣ]{1,30})(?![A-Za-z0-9_\-가-힣ㄱ-ㅎㅏ-ㅣ])/g;

function extractUsernames(text = "") {
  const set = new Set();
  let m;
  while ((m = MENTION_RE.exec(text))) {
    set.add(m[1].toLowerCase()); // 한글은 변화 없음, 영문은 소문자 정규화
  }
  return [...set];
}

module.exports = { extractUsernames };

