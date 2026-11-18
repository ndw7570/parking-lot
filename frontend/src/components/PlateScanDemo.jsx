import { useEffect, useState } from "react";
import { DEMO_PLATE, demoScanTimeline } from "../lib/plateScanDemo";

// 단계 사이 시간(ms). 실제 앱에서 확정까지 걸리는 시간(1초 남짓)과 비슷하게.
const STEP_MS = 550;

/**
 * 웹 데모 전용 번호판 인식 체험(P005-019). 앱 인식 화면과 같은 배치로, 예시 번호판 그림을
 * 실제로 읽는 것처럼 보여 준 뒤 onDone(번호)를 부른다. 실제 인식은 하지 않는다 - 화면에 그렇게 적는다.
 * @param {{ onDone: (plate: string) => void, onClose: () => void }} props
 */
export function PlateScanDemo({ onDone, onClose }) {
  const steps = demoScanTimeline(DEMO_PLATE);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer =
      step < steps.length - 1
        ? setTimeout(() => setStep((s) => s + 1), STEP_MS)
        : setTimeout(() => onDone(DEMO_PLATE), STEP_MS);
    return () => clearTimeout(timer);
  }, [step, steps.length, onDone]);

  const { status, detected } = steps[step];
  return (
    <div className="scan-demo" role="dialog" aria-modal="true" aria-label="번호판 인식 체험">
      <div className="scan-demo-top">
        <button type="button" className="scan-demo-circle" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <span className="scan-demo-tag">예시 화면 · 실제 인식은 Android 앱에서</span>
      </div>

      <div className="scan-demo-stage">
        <p className="scan-demo-hint">번호판을 박스 안에 맞춰 주세요</p>
        <div className={`scan-demo-box ${detected ? "on" : ""}`}>
          <DemoPlate />
        </div>
        <p className="scan-demo-status" aria-live="polite">
          {status && <span>{status}</span>}
        </p>
      </div>

      <div className="scan-demo-bottom">
        <button type="button" className="scan-demo-pill" onClick={onClose}>
          직접 입력
        </button>
      </div>
    </div>
  );
}

// 예시 번호판 그림. 이미지 파일을 따로 두지 않으려고 SVG 로 그린다(흰 바탕·검은 글자의 신형 번호판).
function DemoPlate() {
  return (
    <svg viewBox="0 0 520 110" className="scan-demo-plate" role="img" aria-label={`예시 번호판 ${DEMO_PLATE}`}>
      <rect x="3" y="3" width="514" height="104" rx="10" fill="#fafafa" stroke="#1b1b1b" strokeWidth="5" />
      <rect x="16" y="18" width="34" height="74" rx="4" fill="#1d4e9e" />
      <text x="33" y="62" fill="#fff" fontSize="13" fontWeight="700" textAnchor="middle">KOR</text>
      <text x="285" y="80" fill="#111" fontSize="64" fontWeight="800" textAnchor="middle" letterSpacing="4">
        12가 3456
      </text>
    </svg>
  );
}
