import { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../api/firebase";
import NotificationItem from "../components/NotificationItem.jsx";

export default function NotificationPage() {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        getNotifications();
    }, []);

    const getNotifications = async () => {
        try {
            const token = await auth.currentUser.getIdToken();
            const uid = auth.currentUser.uid;

            const res = await axios.get(`/api/notifications/${uid}`, {
                headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
                setNotifications(res.data.data);
            }
        } catch (err) {
            console.error("알림 불러오기 실패:", err);
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">🔔 알림</h1>
            {notifications.length === 0 ? (
                <p className="text-gray-500 text-center">아직 알림이 없습니다.</p>
            ) : (
                <div className="space-y-4">
                    {notifications.map((item) => (
                        <NotificationItem key={item._id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}