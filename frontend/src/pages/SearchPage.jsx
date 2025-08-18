// pages/SearchPage.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { theme } from "../constants/theme";

export default function SearchPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const qq = q.trim();
    if (!qq) { setUsers([]); return; }
    setLoading(true);
    try {
      const { data } = await axios.get("/api/search", {
        params: { q: qq, type: "users", limit: 20 }
      });
      setUsers(data?.data?.users || []);
    } finally {
      setLoading(false);
    }
  };

  const goProfile = (u) => {
    nav(`/profile/${u.username}`); // <- 너네 규칙에 맞게 수정 가능
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontWeight: theme.fonts.bold, fontSize: 20, marginBottom: 12 }}>검색</h1>

      <form onSubmit={onSubmit} className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="사용자 아이디를 입력하세요"
          style={{
            flex: 1,
            border: `1px solid ${theme.colors.darkLight}`,
            borderRadius: theme.radius.md,
            padding: "10px 12px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            border: "none",
            borderRadius: theme.radius.md,
            padding: "10px 14px",
            background: theme.colors.primary,
            color: "white",
            cursor: "pointer",
          }}
        >
          검색
        </button>
      </form>

      {loading && <p className="text-sm text-neutral-500">검색 중…</p>}
      {!loading && users.length === 0 && q.trim() && (
        <p style={{ color: theme.colors.textLight }}>일치하는 사용자가 없어요.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {users.map((u) => (
          <li
            key={u._id}
            onClick={() => goProfile(u)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 8px",
              borderRadius: theme.radius.lg,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.gray)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <img
              src={u.profileImageUrl || "/defaultUser.png"}
              alt=""
              width={40}
              height={40}
              style={{ borderRadius: "9999px", objectFit: "cover" }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: theme.fonts.semibold,
                  color: theme.colors.textDark,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                @{u.username}
              </div>
              {u.bio && (
                <div
                  style={{
                    fontSize: 12,
                    color: theme.colors.textLight,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {u.bio}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}