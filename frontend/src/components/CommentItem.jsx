import React from "react";
import { theme } from "../constants/theme";
import Avatar from "./Avatar";

const CommentItem = ({ item, canDelete = false, onDelete }) => {
  const handleDelete = () => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      onDelete(item);
    }
  };

  return (
    <div style={styles.container}>
      <Avatar uri={item?.userImage || "/defaultUSer.png"} />
      <div style={styles.content}>
        <div style={styles.header}>
          <span style={styles.name}>{item?.userName || "User"}</span>
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
