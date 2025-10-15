// CommentItem.jsx (업데이트: 멘션 링크화 포함)
import React from "react";
import { theme } from "../constants/theme";
import Avatar from "./Avatar";
import { useNavigate } from "react-router-dom";

const CommentItem = ({ item, canDelete = false, onDelete, displayText, scanning }) => {
  const navigate = useNavigate();
  const username = item?.user?.username || item?.username;
  const userId = item?.user?._id || item?.userId;

  const goProfile = () => {
    if (username) return navigate(`/profile/${username}`);
    if (userId)   return navigate(`/profile/${userId}`);
    navigate(`/profile`);
  };

  // ⬇️ 텍스트 속 @username을 클릭 가능한 요소로 바꿔주는 함수
  const renderMentions = (text = "") => {
    return text.split(/(@[A-Za-z0-9_\-가-힣ㄱ-ㅎㅏ-ㅣ]{1,30})/g).map((part, i) => {
      const m = part.match(/^@([A-Za-z0-9_\-가-힣ㄱ-ㅎㅏ-ㅣ]{1,30})$/);
      if (!m) return <span key={i}>{part}</span>;
      const uname = m[1];
      return (
        <button
          key={i}
          onClick={() => navigate(`/profile/${uname}`)}
          style={{
            all: "unset",
            cursor: "pointer",
            color: "#065f46",        // 링크 느낌 (딥 그린)
            fontWeight: 600,
          }}
          aria-label={`@${uname} 프로필로 이동`}
        >
          @{uname}
        </button>
      );
    });
  };
  const renderWithMaskAndMentions = () => {
    const text =
     (typeof displayText === "string" && displayText) ||
     item?.contentForViewer ||
     item?.text ||
     "";
   return renderMentions(text);
  };

  return (
    <div style={styles.container}>
      <button onClick={goProfile} style={{ all: "unset", cursor: "pointer" }}>
        <Avatar uri={item?.userImage || "/defaultUser.png"} />
      </button>

      <div style={styles.content}>
        <div style={styles.header}>
          <button onClick={goProfile} style={{ all: "unset", cursor: "pointer" }}>
            <span style={styles.name}>{item?.userName || "User"}</span>
          </button>

          <span style={styles.dateText}>
            {item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
          </span>

          {canDelete && (
            <button onClick={() => onDelete && onDelete(item)} style={styles.deleteButton}>
              삭제
            </button>
          )}
        </div>

        {/* 본문: 마스킹 처리된 HTML */}
        <div style={styles.text}>{renderWithMaskAndMentions()}</div>
        {/* 선택: 배지 */}
        {Array.isArray(item?.pieces) && item.pieces.some(p => p.masked) && (
          <div className="pii-badge" title="작성자/언급 대상만 열람 가능">
            민감정보 보호됨
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },
  content: {
    backgroundColor: "rgba(0, 0, 0, 0.06)",
    flex: 1,
    padding: "8px 12px",
    borderRadius: "12px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  name: { fontWeight: "bold" },
  dateText: { fontSize: "12px", color: theme.colors.textLight },
  text: {
    margin: "5px 0 0 0",
    color: theme.colors.text,
    whiteSpace: "pre-wrap",   // 줄바꿈 유지
    wordBreak: "break-word",  // 긴 단어 줄바꿈
  },
  deleteButton: {
    background: "none",
    border: "none",
    color: theme.colors.rose,
    cursor: "pointer",
  },
};

export default CommentItem;
