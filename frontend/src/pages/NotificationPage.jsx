import { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../api/firebase";
import NotificationItem from "../components/NotificationItem.jsx";
import Sidebar from "../components/Sidebar";

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
        <div className="min-h-screen bg-white">
            <main className="flex">
                <aside className="h-screen w-24 border-r bg-blue shrink-0">
                    <Sidebar />
                </aside>
                <section className="flex-1">
                    <div className="border-b p-3">
                        <h1 className="text-2xl font-bold flex justify-center">EekeeK</h1>
                    </div>
                    <div className="flex justify-center">
                        <div className="w-full max-w-xl p-4 space-y-6">
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
        </div>
        </section>
        </main>
        </div>
    );
}