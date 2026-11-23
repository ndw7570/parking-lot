import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { authApi } from "./api/auth";
import { ToastProvider } from "./components/ui";
import { NativeBackHandler } from "./components/NativeBackHandler";

import Login from "./pages/Login";
import Register from "./pages/Register";
import PasswordChange from "./pages/PasswordChange";
import MyPage from "./pages/MyPage";
import Home from "./pages/Home";
import Verify from "./pages/Verify";
import Vehicles from "./pages/Vehicles";
import VehicleForm from "./pages/VehicleForm";
import VehicleDetail from "./pages/VehicleDetail";
import Residents from "./pages/Residents";
import ResidentForm from "./pages/ResidentForm";
import ResidentLinkPage from "./pages/ResidentLinkPage";
import Unauthorized from "./pages/Unauthorized";
import UnauthorizedForm from "./pages/UnauthorizedForm";
import Board from "./pages/Board";
import PostDetail from "./pages/PostDetail";
import ReportForm from "./pages/ReportForm";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";

function RequireAuth({ children }) {
  if (!authApi.isAuthenticated()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <NativeBackHandler />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/password" element={<PasswordChange />} />
          <Route
            path="/mypage"
            element={
              <RequireAuth>
                <MyPage />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/verify"
            element={
              <RequireAuth>
                <Verify />
              </RequireAuth>
            }
          />
          <Route
            path="/vehicles"
            element={
              <RequireAuth>
                <Vehicles />
              </RequireAuth>
            }
          />
          <Route
            path="/vehicles/new"
            element={
              <RequireAuth>
                <VehicleForm />
              </RequireAuth>
            }
          />
          <Route
            path="/vehicles/:id"
            element={
              <RequireAuth>
                <VehicleDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/vehicles/:id/edit"
            element={
              <RequireAuth>
                <VehicleForm />
              </RequireAuth>
            }
          />
          <Route
            path="/residents"
            element={
              <RequireAuth>
                <Residents />
              </RequireAuth>
            }
          />
          <Route
            path="/residents/new"
            element={
              <RequireAuth>
                <ResidentForm />
              </RequireAuth>
            }
          />
          <Route
            path="/residents/:id/edit"
            element={
              <RequireAuth>
                <ResidentForm />
              </RequireAuth>
            }
          />
          <Route
            path="/residents/:id/link"
            element={
              <RequireAuth>
                <ResidentLinkPage />
              </RequireAuth>
            }
          />
          <Route
            path="/unauthorized"
            element={
              <RequireAuth>
                <Unauthorized />
              </RequireAuth>
            }
          />
          <Route
            path="/unauthorized/new"
            element={
              <RequireAuth>
                <UnauthorizedForm />
              </RequireAuth>
            }
          />
          <Route
            path="/board"
            element={
              <RequireAuth>
                <Board />
              </RequireAuth>
            }
          />
          <Route
            path="/board/:id"
            element={
              <RequireAuth>
                <PostDetail />
              </RequireAuth>
            }
          />
          {/* 무단주차 사진 신고(P005-025). 관리자·거주민이 같은 주소를 쓰고, 보이는 범위는 서버가 가른다. */}
          <Route
            path="/reports/new"
            element={
              <RequireAuth>
                <ReportForm />
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <Reports />
              </RequireAuth>
            }
          />
          <Route
            path="/reports/:id"
            element={
              <RequireAuth>
                <ReportDetail />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
