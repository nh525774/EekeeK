import { getAuth } from "firebase/auth";
import { API_URL } from "./api";

//최초 사용자 등록
export async function registerUser({ username, bio, profileImageUrl }) {
    const user = getAuth().currentUser;
    if (!user) throw new Error("로그인 후 사용자 등록이 가능합니다.");
    const token = await user.getIdToken(true);

    const res = await fetch('${API_URL}/api/users', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ username, bio, profileImageUrl }),
        });
        if (!res.ok) throw new Error('등록 실패: ${res.statusText');
        return res.json();
    }

//내 프로필 조회
export async function fetchMyProfile() {
    const user = getAuth().currentUser;
    if (!user) throw new Error("로그인 후 프로필 조회 가능합니다.");
    const token = await user.getIdToken(true);

    const res = await fetch('${API_URL}/api/users/me', {
        headers: {"Authorization": 'Bearer ${token}'},
    });
    if (!res.ok) throw new Error('조회 실패: ${res.statusText}');
    return res.json();
}

//내 프로필 수정
export async function updateMyProfile({ username, bio, profileImageUrl }) {
    const user = getAuth().currentUser;
    if (!user) throw new Error("로그인 후 프로필 수정 가능합니다.");
    const token = await user.getIdToken(true);

    const res = await fetch('${API_URL}/api/users/me', {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ username, bio, profileImageUrl }),
    });
    if (!res.ok) throw new Error(`수정 실패: ${res.statusText}`);
    return res.json();
}
