  import Sidebar from "../components/Sidebar";

  export default function MainPage() {
      return (
        <div className="flex min-h-screen">
          {/* 사이드바 */}
          <Sidebar />
          
          {/* 오른쪽 콘텐츠 영역 */}
          <div className="ml-40 pt-4 px-4">
            {/* 헤더 */}
            <div className="text-4xl font-bold mb-6">EekeeK</div>
    
            {/* 피드 */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow p-4">
                <div className="font-semibold">사용자 이름</div>
                <div className="text-gray-600">이것은 게시물입니다 😎</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <div className="font-semibold">또 다른 사용자</div>
                <div className="text-gray-600">두 번째 게시물 예시입니다 🎉</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
        