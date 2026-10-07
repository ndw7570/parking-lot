import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, AppBar, useToast } from "../components/ui";
import { Field, TextInput } from "../components/form";
import { authApi, getCurrentUserId } from "../api/auth";

export default function PasswordChange() {
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    username: getCurrentUserId() || "",
    current_password: "",
    new_password: "",
    new_password_confirm: "",
  });

  const onInput = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.username.trim()) {
      toast("아이디를 입력해 주세요.", "err");
      return;
    }
    if (!form.current_password) {
      toast("현재 비밀번호를 입력해 주세요.", "err");
      return;
    }
    if (form.new_password.length < 8) {
      toast("새 비밀번호는 8자 이상이어야 합니다.", "err");
      return;
    }
    if (form.new_password !== form.new_password_confirm) {
      toast("새 비밀번호가 일치하지 않습니다.", "err");
      return;
    }
    setBusy(true);
    try {
      // Password change needs an auth token; re-authenticate with the current
      // credentials, then change, so this works from the (pre-login) auth area.
      await authApi.login(form.username.trim(), form.current_password);
      await authApi.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast("비밀번호가 변경되었습니다. 다시 로그인해 주세요.");
      nav("/login", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 401) {
        toast("아이디 또는 현재 비밀번호가 올바르지 않습니다.", "err");
      } else {
        toast(
          data?.new_password?.[0] ||
            data?.current_password?.[0] ||
            data?.detail ||
            "변경에 실패했습니다.",
          "err"
        );
      }
    } finally {
      // Don't leave a session behind from the re-auth step.
      authApi.logout();
      setBusy(false);
    }
  }

  return (
    <Shell bar={<AppBar title="비밀번호 변경" sub="Password" back />} hideTabs>
      <form onSubmit={submit}>
        <Field label="아이디">
          <TextInput
            placeholder="아이디"
            value={form.username}
            onChange={onInput("username")}
            autoComplete="username"
          />
        </Field>

        <Field label="현재 비밀번호">
          <TextInput
            type="password"
            placeholder="현재 비밀번호"
            value={form.current_password}
            onChange={onInput("current_password")}
            autoComplete="current-password"
          />
        </Field>

        <Field label="새 비밀번호" hint="8자 이상">
          <TextInput
            type="password"
            placeholder="새 비밀번호"
            value={form.new_password}
            onChange={onInput("new_password")}
            autoComplete="new-password"
          />
        </Field>

        <Field label="새 비밀번호 확인">
          <TextInput
            type="password"
            placeholder="새 비밀번호 재입력"
            value={form.new_password_confirm}
            onChange={onInput("new_password_confirm")}
            autoComplete="new-password"
          />
        </Field>

        <button className="btn primary" disabled={busy} style={{ marginTop: 8 }}>
          {busy ? "변경 중…" : "비밀번호 변경"}
        </button>
      </form>
    </Shell>
  );
}
