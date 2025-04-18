import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";

export default function UploadPage() {
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!imageFile || !caption) {
      alert("이미지와 글을 모두 입력하세요.");
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("caption", caption);
    formData.append("userId", "test-user"); // 실제 로그인 유저로 대체

    try {
      await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("업로드 완료!");
      // 리셋
      setImageFile(null);
      setPreview(null);
      setCaption("");
    } catch (err) {
      console.error(err);
      alert("업로드 실패");
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="h-screen w-24 border-r bg-blue-100 shrink-0">
        <Sidebar />
      </aside>

      {/* Main Upload Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold mb-6">새 게시물 만들기</h2>

        {!preview ? (
          <div className="flex flex-col items-center border border-gray-300 p-10 rounded-md w-full max-w-md text-center">
            <img src="/icons/image-icon.png" className="w-16 h-16 mb-4" alt="upload" />
            <p className="mb-4 text-gray-600">사진과 동영상을 여기에 끌어다 놓으세요</p>

            <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
              컴퓨터에서 선택
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="w-full max-w-4xl flex border rounded overflow-hidden shadow">
            {/* 왼쪽: 이미지 미리보기 */}
            <div className="w-1/2 bg-black flex items-center justify-center">
                <div className="aspect-square w-full max-w-[400px]">
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* 오른쪽: 글쓰기 */}
            <div className="w-1/2 p-6 flex flex-col justify-between">
              <textarea
                placeholder="문구를 입력하세요..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full h-48 p-3 border rounded resize-none mb-4"
              />
              <button
                onClick={handleUpload}
                className="bg-blue-600 hover:bg-blue-600 text-white py-2 rounded"
              >
                공유하기
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}