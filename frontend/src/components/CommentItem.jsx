import React from "react";
import { theme } from "../constants/theme";
import Avatar from "./Avatar";
import { useNavigate } from "react-router-dom";

const CommentItem = ({ item, canDelete = false, onDelete }) => {
  const navigate = useNavigate();
  const profileId =
    item?.userObjectId || item?.user?._id || item?.userId || item?.user?.id;
  const goProfile = () => {
    if (!profileId) return;
    const isMongoId = /^[a-f\d]{24}$/i.test(String(profileId));
    navigate(isMongoId ? `/profile/${profileId}` : `/users/${profileId}`);
  };

  return (
    <div style={styles.container}>
      <button onClick={goProfile} style={{ all: "unset", cursor: "pointer" }}>
    <Avatar uri={item?.userImage || "/defaultUSer.png"} />
  </button>
      <div style={styles.content}>
        <div style={styles.header}>
          <button onClick={goProfile} style={{ all: "unset", cursor: "pointer" }}>
    <span style={styles.name}>{item?.userName || "User"}</span>
  </button>
          <span style={styles.dateText}>
            {new Date(item?.createdAt).toLocaleDateString()}
          </span>
          {canDelete && (
            <button onClick={handleDelete} style={styles.deleteButton}>
              삭제
            </button>
          )}
        </div>
        <p style={styles.text}>{item?.text}</p>
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
  },
  name: {
    fontWeight: "bold",
  },
  dateText: {
    fontSize: "12px",
    color: theme.colors.textLight,
  },
  text: {
    margin: "5px 0 0 0",
    color: theme.colors.text,
  },
  deleteButton: {
    background: "none",
    border: "none",
    color: theme.colors.rose,
    cursor: "pointer",
  },
};

export default CommentItem;
