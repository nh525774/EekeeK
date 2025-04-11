import React from "react";

const AuthLayout = ({ children }) => {
  return (
    <div className="h-screen w-screen flex justify-center items-center bg-gray-100">
      <div className="flex w-[90%] max-w-[1400px] h-[700px] shadow-xl rounded-2xl overflow-hidden bg-white">
        {/* 왼쪽 */}
        <div className="w-1/2 bg-blue-600 text-white flex flex-col justify-center items-center p-10">
          <h1 className="text-5xl font-bold mb-4">EekeeK</h1>
          <p className="text-lg text-center">친구들과 함께 이야기를 나눠보세요.</p>
        </div>

        {/* 오른쪽 */}
        <div className="w-1/2 flex justify-center items-center p-10">
          <div className="w-full w-[420px] overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
