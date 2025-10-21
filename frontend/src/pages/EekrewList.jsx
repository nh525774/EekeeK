// frontend/src/pages/EekrewList.jsx
import { useEffect, useState } from "react";
import { getMyEekrewUsers, toggleEekrew } from "../services/eekrewService";
import { useNavigate } from "react-router-dom";

export default function EekrewList() {
  const [users, setUsers] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const nav = useNavigate();

  const load = async () => {
    const data = await getMyEekrewUsers();
    setUsers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
  }, []);

  const removeFromEekrew = async (uid) => {
    setBusyId(uid);
    try {
      await toggleEekrew(uid); // 토글 = 제거
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          background: "#d3f3a1",
          borderRadius: 12,
          padding: "10px 14px",
        }}
      >
        <strong style={{ fontSize: 18 }}>내 eekrew</strong>
        <button
          onClick={() => nav(-1)}
          style={{
            border: "none",
            background: "transparent",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← 뒤로
        </button>
      </div>

      {!users.length && (
        <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>
          아직 eekrew로 지정한 계정이 없어요.
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {users.map((u) => (
          <div
            key={u._id || u.id || u.username}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 10,
            }}
          >
            <div
              onClick={() => {
                if (u?.username) {
                  nav(`/profile/${encodeURIComponent(u.username)}`); // ✅ username 기준 이동
                } else if (u?._id) {
                  // 폴백(라우트가 /profile/:username만 있으면 미동작)
                  nav(`/profile/${u._id}`);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <img
                src={u.avatar || u.profileImageUrl || "/defaultUser.png"} // ✅ 기본 이미지명 통일
                alt=""
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
              <div style={{ fontWeight: 700 }}>
                {u.username || u.name || "(no name)"}
              </div>
            </div>

            <button
              onClick={() => removeFromEekrew(u._id || u.id)}
              disabled={busyId === (u._id || u.id)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#fff",
                fontWeight: 700,
                opacity: busyId === (u._id || u.id) ? 0.6 : 1,
                cursor: busyId === (u._id || u.id) ? "not-allowed" : "pointer",
              }}
            >
              제거
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
