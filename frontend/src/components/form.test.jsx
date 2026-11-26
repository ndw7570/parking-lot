import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChipPicker, Segment } from "./form";

// 선택 상태가 색으로만 보이면 화면 읽기 프로그램이 무엇이 골라졌는지 말하지 못한다(WCAG 4.1.2, 감사 P2).
const noop = () => {};

function pressed(html) {
  return [...html.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>([^<]*)</g)].map(
    (m) => [m[2], m[1]],
  );
}

describe("ChipPicker", () => {
  it("고른 칩만 aria-pressed=true", () => {
    const html = renderToStaticMarkup(
      <ChipPicker options={["승용", "SUV", "기타"]} value="SUV" onChange={noop} />,
    );
    expect(pressed(html)).toEqual([
      ["승용", "false"],
      ["SUV", "true"],
      ["기타", "false"],
    ]);
  });

  it("값/라벨 객체 옵션도 값으로 비교한다", () => {
    const html = renderToStaticMarkup(
      <ChipPicker options={[{ value: 6, label: "6시간" }, { value: 12, label: "12시간" }]} value={12} onChange={noop} />,
    );
    expect(pressed(html)).toEqual([
      ["6시간", "false"],
      ["12시간", "true"],
    ]);
  });
});

describe("Segment", () => {
  it("고른 칸만 aria-pressed=true, 묶음에 이름이 붙는다", () => {
    const html = renderToStaticMarkup(
      <Segment options={["전체", "방문"]} value="전체" onChange={noop} label="차량 걸러보기" />,
    );
    expect(pressed(html)).toEqual([
      ["전체", "true"],
      ["방문", "false"],
    ]);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="차량 걸러보기"');
  });

  it("폼 안에서 눌러도 제출되지 않게 type=button", () => {
    const html = renderToStaticMarkup(<Segment options={["전체"]} value="전체" onChange={noop} />);
    expect(html).toContain('type="button"');
  });
});
