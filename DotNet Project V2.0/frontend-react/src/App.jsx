import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { CatalogProvider } from "./context/CatalogContext";
import { EmcardProvider } from "./context/EmcardContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import PrivateRoute from "./components/PrivateRoute";
import ToastViewport from "./components/ui/ToastViewport";
import { LoadingBlock } from "./components/ui/Feedback";

import Home from "./pages/Home";

// Route-level code splitting. Home is not split - it is the landing page, so
// deferring it would only add a round trip before anything renders.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const JoinEmcard = lazy(() => import("./pages/JoinEmcard"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const OAuth2Redirect = lazy(() => import("./pages/OAuth2Redirect"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Payment = lazy(() => import("./pages/Payment"));
const Invoice = lazy(() => import("./pages/Invoice"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const NotFound = lazy(() => import("./pages/NotFound"));

import "./App.css";

/**
 * App.jsx
 * ------------------------------------------------------------------
 * Providers, routing, and the shared page chrome. That is all.
 *
 * This file was previously ~2,200 lines, the bulk of it a single Home()
 * component that also owned the home page's bespoke header, category strip,
 * sidebar and footer, the entire eMCard reservation layer, and the cart
 * drawer. All of that now lives where it belongs:
 *
 *   src/pages/Home.jsx            the storefront page
 *   src/context/EmcardContext.jsx the loyalty state and cart/points rules
 *   src/context/CatalogContext.jsx the category data, shared with the header
 *   src/components/Navbar.jsx     the one site header, used on every route
 *   src/components/CartDrawer.jsx mounted once here, openable from anywhere
 *
 * PROVIDER ORDER matters and is deliberate:
 *   Theme    - independent of everything.
 *   Auth     - Cart and eMCard both need to know who is signed in.
 *   Toast    - eMCard reports failures through it.
 *   Cart     - eMCard mutates cart lines when reserving points.
 *   eMCard   - depends on Auth, Cart and Toast.
 *   Catalog  - needs no auth; sits closest to the tree that renders it.
 * ------------------------------------------------------------------
 */

/** Shown while a lazily-loaded route chunk is still being fetched. */
function RouteFallback() {
  return <LoadingBlock>Loading...</LoadingBlock>;
}

// Routes that deliberately drop the full site chrome. Somebody part-way
// through signing in or paying should not be offered a category menu, a
// search box and a cart button - each is a way to abandon the task.
const FOCUSED_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/payment",
  "/oauth2/redirect",
];

function AppLayout() {
  const location = useLocation();
  const focused = FOCUSED_ROUTES.includes(location.pathname);

  return (
    <div className="app-shell">
      {/* First tab stop on every page - lets keyboard and screen-reader
          users jump past the header straight to the content. */}
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {!focused && <Navbar />}

      <main className="app-main" id="main-content" tabIndex={-1}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* ------------------------------------------------ PUBLIC */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/oauth2/redirect" element={<OAuth2Redirect />} />

            {/* The e-Mcard page serves members (balance, benefits, how it
                works), signed-in non-members (the join form) and guests
                (the pitch plus a sign-in prompt) from one component.
                /emcard is public on purpose: "how does this programme work"
                is a question a visitor should be able to answer BEFORE
                being asked to create an account. */}
            <Route path="/emcard" element={<JoinEmcard />} />
            <Route
              path="/emcard/join"
              element={
                <PrivateRoute>
                  <JoinEmcard />
                </PrivateRoute>
              }
            />

            {/* ----------------------------------------------- ACCOUNT */}
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/edit-profile"
              element={
                <PrivateRoute>
                  <EditProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/change-password"
              element={
                <PrivateRoute>
                  <ChangePassword />
                </PrivateRoute>
              }
            />

            {/* ------------------ CHECKOUT -> PAYMENT -> INVOICE ------ */}
            <Route
              path="/checkout"
              element={
                <PrivateRoute>
                  <Checkout />
                </PrivateRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <PrivateRoute>
                  <Payment />
                </PrivateRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <PrivateRoute>
                  <OrderHistory />
                </PrivateRoute>
              }
            />
            <Route
              path="/orders/:orderId"
              element={
                <PrivateRoute>
                  <Invoice />
                </PrivateRoute>
              }
            />

            {/* ------------------------------------------------- ADMIN */}
            <Route
              path="/admin"
              element={
                <PrivateRoute adminOnly>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            {/* A real 404. This used to render the home page for any
                unknown URL, which quietly hid broken links - the address
                bar said /ordres and the shop said everything was fine. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {!focused && <Footer />}

      {/* Mounted once, at the root: the cart is reachable from every route,
          not just the home page. */}
      <CartDrawer />
      <ToastViewport />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <EmcardProvider>
              <CatalogProvider>
                <BrowserRouter>
                  <AppLayout />
                </BrowserRouter>
              </CatalogProvider>
            </EmcardProvider>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
