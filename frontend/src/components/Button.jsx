function Button({ children, onClick }) {
  return (
    <button
      className="btn w-full bg-blue-600 hover:bg-blue-700 text-black
          font-semibold py-3 rounded-lg transition"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button;
