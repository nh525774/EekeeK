import { useNavigate } from "react-router-dom";

export default function NotificationItem({ item }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (item.data?.postId) {
      navigate(`/post/${item.data.postId}`, {
        state: { commentId: item.data.commentId },
      });
    }
  };

  return (
    <div
      onClick={handleClick}
      className="p-4 border rounded shadow-sm hover:bg-gray-50 cursor-pointer">
      <div className="flex items-center gap-2">
        <img src={item.senderId?.profileImageUrl || "/default.png"} alt="sender"
          className="w-8 h-8 rounded-full" />
        <p className="text-sm font-semibold">{item.senderId?.username || "알 수 없음"}</p>
      </div>
      <p className="text-sm mt-1">{item.message}</p>
      <p className="text-xs text-gray-400">
        {new Date(item.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
