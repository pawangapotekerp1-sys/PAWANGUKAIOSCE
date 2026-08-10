import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import FullPageLoader from "../components/ui/full-page-loader";
import {
  AdminRouteGuard,
  AppRouteGuard,
  AuthenticatedRouteGuard,
  FlashCardGeneratorRouteGuard,
  MentorAreaRouteGuard,
  QuestionGeneratorRouteGuard,
  QuestionAuthoringRouteGuard,
  ScheduledTryoutOpsRouteGuard,
} from "./route-guards";

const LoginPage = lazy(() => import("../pages/auth/login-page"));
const ResetPasswordPage = lazy(() => import("../pages/auth/reset-password-page"));
const AnalyticsPage = lazy(() => import("../pages/app/analytics-page"));
const DashboardPage = lazy(() => import("../pages/app/dashboard-page"));
const WelcomeTutorialPage = lazy(() => import("../pages/app/welcome-tutorial-page"));
const LeaderboardPage = lazy(() => import("../pages/app/leaderboard-page"));
const ReviewPage = lazy(() => import("../pages/app/review-page"));
const ScheduledTryoutCatalogPage = lazy(() => import("../pages/app/scheduled-tryout-catalog-page"));
const ScheduledTryoutLeaderboardPage = lazy(() => import("../pages/app/scheduled-tryout-leaderboard-page"));
const ScheduledTryoutResultPage = lazy(() => import("../pages/app/scheduled-tryout-result-page"));
const ScheduledTryoutSessionPage = lazy(() => import("../pages/app/scheduled-tryout-session-page"));
const TryoutSelectionPage = lazy(() => import("../pages/app/tryout-selection-page"));
const TryoutBlockSelectionPage = lazy(() => import("../pages/app/tryout-block-selection-page"));
const TryoutTopicSelectionPage = lazy(() => import("../pages/app/tryout-topic-selection-page"));
const TryoutResultPage = lazy(() => import("../pages/app/tryout-result-page"));
const TryoutSessionPage = lazy(() => import("../pages/app/tryout-session-page"));
const FlashCardsPage = lazy(() => import("../pages/app/flash-cards-page"));
const FlashCardDeckPage = lazy(() => import("../pages/app/flash-card-deck-page"));
const FlashCardGeneratorPage = lazy(() => import("../pages/app/flash-card-generator-page"));
const FlashCardGeneratorCreatePage = lazy(() => import("../pages/app/flash-card-generator-create-page"));
const FlashCardGeneratorReviewPage = lazy(() => import("../pages/app/flash-card-generator-review-page"));
const MaterialDrivePage = lazy(() => import("../pages/app/material-drive-page"));
const AdminDashboardPage = lazy(() => import("../pages/admin/admin-dashboard-page"));
const PaymentsPage = lazy(() => import("../pages/admin/payments-page"));
const AdminQuestionGeneratorPage = lazy(() => import("../pages/admin/question-generator-page"));
const AdminQuestionGeneratorReviewPage = lazy(() => import("../pages/admin/question-generator-review-page"));
const QuestionEditorPage = lazy(() => import("../pages/admin/question-editor-page"));
const QuestionsPage = lazy(() => import("../pages/admin/questions-page"));
const UsersPage = lazy(() => import("../pages/admin/users-page"));
const BlocksManagementPage = lazy(() => import("../pages/admin/blocks-management-page"));
const MentorQuestionGeneratorPage = lazy(() => import("../pages/app/question-generator-page"));
const MentorQuestionGeneratorReviewPage = lazy(() => import("../pages/app/question-generator-review-page"));
const ProfilePage = lazy(() => import("../pages/profile-page"));
const MentorAreaPage = lazy(() => import("../pages/app/mentor-area-page"));
const StudyAreaPage = lazy(() => import("../pages/app/study-area-page"));
const ScheduledEventEditorPage = lazy(() => import("../pages/scheduled-ops/scheduled-event-editor-page"));
const ScheduledOpsEventsPage = lazy(() => import("../pages/scheduled-ops/scheduled-events-page"));
const SubscriptionPage = lazy(() => import("../pages/subscription-page"));
const OsceDemoPage = lazy(() => import("../pages/app/osce-demo-page"));
const OsceListPage = lazy(() => import("../pages/app/osce-list-page"));
const OsceBuilderPage = lazy(() => import("../pages/app/osce-builder-page"));
const AiConfigPage = lazy(() => import("../pages/app/ai-config-page"));

function RouteLoadingState() {
  return <FullPageLoader />;
}

function AppRouter() {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <Routes>
        <Route path="/" element={<Navigate replace to="/auth/login" />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route element={<AuthenticatedRouteGuard />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route element={<AppRouteGuard />}>
          <Route path="/app">
            <Route index element={<DashboardPage />} />
            <Route path="welcome" element={<WelcomeTutorialPage />} />
            <Route path="area-belajar" element={<StudyAreaPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="flash-cards" element={<FlashCardsPage />} />
            <Route path="flash-cards/:subtopicId" element={<FlashCardDeckPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="review/:attemptId" element={<ReviewPage />} />
            <Route path="rekaman-kelas" element={<MaterialDrivePage driveType="rekaman" />} />
            <Route path="materi-ppt" element={<MaterialDrivePage driveType="ppt" />} />
            <Route path="tryout-selection" element={<TryoutSelectionPage />} />
            <Route path="tryout" element={<Navigate replace to="/app/tryout-selection" />} />
            <Route path="tryout/blocks" element={<TryoutBlockSelectionPage />} />
            <Route path="tryout/topics" element={<TryoutTopicSelectionPage />} />
            <Route path="tryout/session" element={<TryoutSessionPage />} />
            <Route path="tryout/result" element={<TryoutResultPage />} />
            <Route path="scheduled-tryout" element={<ScheduledTryoutCatalogPage />} />
            <Route path="scheduled-tryout/leaderboard" element={<ScheduledTryoutLeaderboardPage />} />
            <Route path="scheduled-tryout/session" element={<ScheduledTryoutSessionPage />} />
            <Route path="scheduled-tryout/result" element={<ScheduledTryoutResultPage />} />
            <Route path="osce-demo" element={<OsceDemoPage />} />
            <Route path="settings/ai-config" element={<AiConfigPage />} />
            <Route path="*" element={<Navigate replace to="/app" />} />
          </Route>
        </Route>

        <Route element={<QuestionAuthoringRouteGuard />}>
          <Route path="/app/questions">
            <Route index element={<QuestionsPage />} />
            <Route path="new" element={<QuestionEditorPage />} />
            <Route path=":questionId/edit" element={<QuestionEditorPage />} />
            <Route path="*" element={<Navigate replace to="/app/questions" />} />
          </Route>
        </Route>

        <Route element={<QuestionGeneratorRouteGuard />}>
          <Route path="/app/question-generator">
            <Route index element={<MentorQuestionGeneratorPage />} />
            <Route path=":batchId" element={<MentorQuestionGeneratorReviewPage />} />
            <Route path="*" element={<Navigate replace to="/app/question-generator" />} />
          </Route>
        </Route>

        <Route element={<FlashCardGeneratorRouteGuard />}>
          <Route path="/app/flash-card-generator">
            <Route index element={<FlashCardGeneratorPage />} />
            <Route path="new" element={<FlashCardGeneratorCreatePage />} />
            <Route path=":materialId" element={<FlashCardGeneratorReviewPage />} />
            <Route path="*" element={<Navigate replace to="/app/flash-card-generator" />} />
          </Route>
        </Route>

        <Route element={<MentorAreaRouteGuard />}>
          <Route path="/app/area-mentor" element={<MentorAreaPage />} />
          <Route path="/app/mentor/osce" element={<OsceListPage />} />
          <Route path="/app/mentor/osce-builder" element={<OsceBuilderPage />} />
        </Route>

        <Route element={<AdminRouteGuard />}>
          <Route path="/admin">
            <Route index element={<AdminDashboardPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="question-generator" element={<AdminQuestionGeneratorPage />} />
            <Route path="question-generator/:batchId" element={<AdminQuestionGeneratorReviewPage />} />
            <Route path="questions" element={<QuestionsPage />} />
            <Route path="questions/new" element={<QuestionEditorPage />} />
            <Route path="questions/:questionId/edit" element={<QuestionEditorPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="blocks" element={<BlocksManagementPage />} />
            <Route path="*" element={<Navigate replace to="/admin" />} />
          </Route>
        </Route>

        <Route element={<ScheduledTryoutOpsRouteGuard />}>
          <Route path="/scheduled-ops">
            <Route index element={<Navigate replace to="/scheduled-ops/events" />} />
            <Route path="events" element={<ScheduledOpsEventsPage />} />
            <Route path="events/new" element={<ScheduledEventEditorPage />} />
            <Route path="events/:eventId/edit" element={<ScheduledEventEditorPage />} />
            <Route path="*" element={<Navigate replace to="/scheduled-ops/events" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate replace to="/auth/login" />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
