import { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../firebase";

export default function NotificationPage() {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const fetchNotifs = async () => {
            const token = await auth.currentUser.getIdToken();
            const uid = auth.currentUser.uid;

            const res = await axios.get(`/api/notifications/${uid}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.data.success) {
                setNotifications(res.data.data);
            }
        };

        fetchNotifs();
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4"> 알림</h1>
            <ul className="space-y-2">
                {notifications.length === 0 ? (
                    <p>알림이 없습니다.</p>
                ) : (
                notifications.map(notif => (
                    <li key={notif._id} className="border p-2 rounded">
                            {notif.message}
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}