import React, { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/search?q=${query}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("검색 실패", err);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="flex">
        {/* Sidebar (왼쪽 고정) */}
        <aside className="h-screen w-24 border-r bg-blue shrink-0">
          <Sidebar />
        </aside>

        {/* 본문 영역 */}
        <section className="flex-1">
          {/* 상단 헤더 */}
          <div className="border-b p-3">
            <h1 className="text-2xl font-bold flex justify-center">검색</h1>
          </div>

          {/* 중앙 본문 */}
          <div className="flex justify-center">
            <div className="w-full max-w-xl p-4 space-y-6">
              {/* 🔍 검색창 */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  className="border px-4 py-2 rounded w-full"
                  placeholder="사용자 이름을 입력하세요"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  검색
                </button>
              </div>

              {/* 🔽 검색 결과 */}
              {results.map((user) => (
                <div
                  key={user.uid}
                  className="bg-white border p-4 rounded shadow flex justify-between items-center"
                >
                  <span>{user.username}</span>
                  <button className="text-blue-500 hover:underline">
                    프로필 보기
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
