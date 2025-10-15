import { useEffect, useRef, useState } from "react";
import axios from "axios";

/** commentId + updatedAt 기반의 간단 캐시키 */
const keyOf = (c) => `${c._id}:${new Date(c.createdAt).getTime()}:${c.text?.length || 0}`;

/**
 * 댓글 배열을 받아 자동으로 PII 스캔을 돌리고 결과를 반환하는 훅
 * - 동시성 제한(concurrency)
 * - 중복요청 방지(캐시)
 * - 언마운트 시 안전 중단
 */
export default function usePiiScanQueue(comments, { concurrency = 2 } = {}) {
  const [results, setResults] = useState(() => new Map()); // key -> { hits, maskedText, ... }
  const queueRef = useRef([]);
  const runningRef = useRef(0);
  const abortsRef = useRef(new Map());
  const cacheRef = useRef(new Map()); // key -> result

  // 마스킹 함수(클라이언트에서 가볍게 처리)
  const maskText = (text, hits) => {
  if (!text || !hits?.length) return text;

  const sorted = [...hits].sort((a, b) => a.start - b.start);
  let out = "";
  let prev = 0;

  for (const h of sorted) {
    const s = Math.max(0, h.start | 0);
    const e = Math.min(text.length, h.end | 0);
    if (s >= e || s < prev) continue;

    out += text.slice(prev, s);

    // ★ 구조 유지형: 숫자/영문만 *로 치환(하이픈/골뱅이/점은 유지)
    const seg = text.slice(s, e);
    const masked = seg.replace(/[A-Za-z0-9]/g, "*");

    out += masked;
    prev = e;
  }

  out += text.slice(prev);
  return out;
};

  // 큐 진행기
  const pump = async () => {
    if (runningRef.current >= concurrency) return;
    const task = queueRef.current.shift();
    if (!task) return;

    runningRef.current += 1;
    const { key, text, resolve } = task;

    // AbortController 설정
    const ctrl = new AbortController();
    abortsRef.current.set(key, ctrl);

    try {
      const { data } = await axios.post(
        "/api/pii/scan-text",
        { text, mode: "auto" },
        { signal: ctrl.signal }
      );
      console.log("[PII] hits:", data?.hits?.length, "| text:", text);
      const hits = data?.hits || [];
      const maskedText = maskText(text, hits);
      const result = { hits, maskedText, ok: !!data?.ok, fallback: data?.fallback, skipped: data?.skipped };
      cacheRef.current.set(key, result);
      setResults((m) => {
        const next = new Map(m);
        next.set(key, result);
        return next;
      });
      resolve();
    } catch (e) {
      // 실패 시에도 최소한 원문 제공
      const result = { hits: [], maskedText: text, ok: false, error: String(e) };
      cacheRef.current.set(key, result);
      setResults((m) => {
        const next = new Map(m);
        next.set(key, result);
        return next;
      });
    } finally {
      abortsRef.current.delete(key);
      runningRef.current -= 1;
      // 다음 작업
      pump();
    }
  };

  // 댓글 변경 시 큐 채우기
  useEffect(() => {
    if (!Array.isArray(comments)) return;
    const tasks = [];
    for (const c of comments) {
      const key = keyOf(c);
      if (cacheRef.current.has(key)) {
        // 캐시 반영
        setResults((m) => {
          const next = new Map(m);
          next.set(key, cacheRef.current.get(key));
          return next;
        });
        continue;
      }
      tasks.push(
        new Promise((resolve) => {
          queueRef.current.push({ key, text: c.text || "", resolve });
        })
      );
    }
    // 펌프 시작
    for (let i = 0; i < concurrency; i++) pump();

    return () => {
      // 언마운트/리스트 변경 시 진행 중 요청 중단
      for (const [, ctrl] of abortsRef.current) {
        try { ctrl.abort(); } catch {}
      }
      abortsRef.current.clear();
      // queueRef는 비워둠(다음 렌더에서 재구성)
      queueRef.current = [];
      runningRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(comments.map((c) => ({ id: c._id, t: c.text, at: c.createdAt })))]);

  return {
    /** key: keyOf(comment) => { hits, maskedText, ok, ... } */
    results,
    /** 유틸: 특정 댓글에 대한 결과 가져오기 */
    getResultFor: (comment) => results.get(keyOf(comment)),
  };
}
