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
            onClick={() => onChange(val)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Segment({ options, value, onChange }) {
  return (
    <div className="segment">
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        return (
          <button
            key={val}
            className={value === val ? "on" : ""}
            onClick={() => onChange(val)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
