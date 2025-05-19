import ListGroup from "../components/ListGroup";
import Sidebar from "../components/Sidebar";

function MainPage() {
  let items = ["New york", "Sanfancisoco", "Tokyo"];
  let items2 = ["kim", "sim", "dds"];

  const handleSelectiedItem = (item) => {
    console.log(item);
  };

  return (
    <div className="min-h-screen bg-white">
      {" "}
      {/* ① 전체 래퍼 */}
      <main className="flex">
        {" "}
        {/* ② 메인 콘텐츠 전체 */}
        <aside className="h-screen w-24 border-r bg-blue shrink-0 ">
          {" "}
          {/* ③ 사이드바 */}
          <Sidebar />
        </aside>
        <section className="flex-1">
          {" "}
          {/* ④ 메인 영역 (사이드바 제외) */}
          <div className="border-b p-3">
            {" "}
            {/* ⑤ 상단 헤더 */}
            <h1 className="text-2xl font-bold flex justify-center">EekeeK</h1>
          </div>
          <div className="flex justify-center">
            {" "}
            {/* ⑥ 본문 전체 */}
            <div className=" w-full max-w-xl p-4 space-y-6">
              {" "}
              {/* ⑦ 피드 카드만 들어가는 중앙 박스 */}
              <div className="bg-white p-4 rounded-lg shadow">
                <div>
                  <ListGroup
                    items={items}
                    heading="Cities"
                    onSelectItem={handleSelectiedItem}
                  ></ListGroup>
                  <ListGroup
                    items={items2}
                    heading="NAmes"
                    onSelectItem={handleSelectiedItem}
                  ></ListGroup>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="font-semibold">또 다른 사용자</div>
                <div className="text-gray-600">
                  두 번째 게시물 예시입니다 🎉
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default MainPage;
