export function Field({ label, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function TextInput(props) {
  return <input className="input" {...props} />;
}

export function TextArea(props) {
  return <textarea className="textarea" {...props} />;
}

export function ChipPicker({ options, value, onChange }) {
  return (
    <div className="chip-group">
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        return (
          <button
            type="button"
            key={val}
            className={`chip ${value === val ? "on" : ""}`}
            aria-pressed={value === val}
            onClick={() => onChange(val)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// 고르면 바로 목록이 바뀌는 토글 묶음이라 tablist 가 아니라 group + aria-pressed.
// (tablist 는 방향키 이동과 tabpanel 연결까지 약속해야 한다.)
export function Segment({ options, value, onChange, label }) {
  return (
    <div className="segment" role="group" aria-label={label}>
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        return (
          <button
            type="button"
            key={val}
            className={value === val ? "on" : ""}
            aria-pressed={value === val}
            onClick={() => onChange(val)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
