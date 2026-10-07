import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, AppBar, useToast } from "../components/ui";
import { Field, TextInput } from "../components/form";
import { authApi } from "../api/auth";
import { userProfileApi } from "../api/resources";
import { formatPhoneNumber, normalizeId } from "../lib/domain";

export default function Register() {
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    password_confirm: "",
    user_name: "",
    phone_number: "",
  });

  const onInput = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onPhoneInput = (e) =>
    setForm((f) => ({ ...f, phone_number: formatPhoneNumber(e.target.value) }));

  async function submit(e) {
    e.preventDefault();
    if (!form.username.trim()) return toast("아이디를 입력해 주세요.", "err");
    if (form.password.length < 8) return toast("비밀번호는 8자 이상이어야 합니다.", "err");
    if (form.password !== form.password_confirm) return toast("비밀번호가 일치하지 않습니다.", "err");
    if (!form.user_name.trim()) return toast("이름을 입력해 주세요.", "err");
    if (!form.phone_number.trim()) return toast("연락처를 입력해 주세요.", "err");

    setBusy(true);
    const username = form.username.trim();
    try {
      // 1) create the auth account (returns tokens → we're now logged in)
      await authApi.register({ username, password: form.password });
    } catch (err) {
      setBusy(false);
      const data = err.response?.data;
      return toast(data?.username?.[0] || data?.password?.[0] || data?.detail || "가입에 실패했습니다.", "err");
    }
    try {
      // 2) create the matching resident profile (user_id === 아이디)
      await userProfileApi.create({
        user_id: username,
        user_name: form.user_name.trim(),
        phone_number: form.phone_number,
      });
    } catch {
      toast("가입은 되었으나 프로필 저장에 실패했습니다. 마이페이지에서 정보를 확인해 주세요.", "err");
    }
    setBusy(false);
    toast("가입이 완료되었습니다.");
    nav(authApi.isAuthenticated() ? "/" : "/login", { replace: true });
  }

  return (
    <Shell bar={<AppBar title="회원가입" sub="Sign up" back />} hideTabs>
      <form onSubmit={submit}>
        <Field label="아이디" hint="로그인·거주민 식별에 함께 쓰입니다.">
          <TextInput
            placeholder="아이디"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: normalizeId(e.target.value) }))}
            autoComplete="username"
            autoFocus
          />
        </Field>

        <Field label="비밀번호" hint="8자 이상">
          <TextInput
            type="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={onInput("password")}
            autoComplete="new-password"
          />
        </Field>

        <Field label="비밀번호 확인">
          <TextInput
            type="password"
            placeholder="비밀번호 재입력"
            value={form.password_confirm}
            onChange={onInput("password_confirm")}
            autoComplete="new-password"
          />
        </Field>

        <Field label="이름">
          <TextInput
            placeholder="이름"
            value={form.user_name}
            onChange={onInput("user_name")}
          />
        </Field>

        <Field label="연락처">
          <TextInput
            placeholder="010-0000-0000"
            inputMode="tel"
            maxLength={13}
            value={form.phone_number}
            onChange={onPhoneInput}
          />
        </Field>

        <button className="btn primary" disabled={busy} style={{ marginTop: 8 }}>
          {busy ? "가입 중…" : "회원가입"}
        </button>
      </form>
    </Shell>
  );
}
