// src/components/RichTextEditor.jsx

const RichTextEditor = ({ editorRef, onChange }) => {
  return (
    <textarea
    className="w-full min-h-[180px] p-4 border border-gray-300 rounded-lg text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      onChange={(e) => {
        const val = e.target.value;
        onChange(val);
        if (editorRef) editorRef.current = val;
      }}
      placeholder="무슨 생각을 하고 계신가요?"
      style={{
        width: "100%",
        minHeight: "180px",
        padding: "14px",
        fontSize: "16px",
        lineHeight: "1.6",
        border: "1px solid #ccc",
        borderRadius: "12px",
        resize: "vertical",
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
      }}
    />
  );
};

export default RichTextEditor;
