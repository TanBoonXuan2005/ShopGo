import { createBrowserRouter } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import ProfilePage from "./pages/ProfilePage";
import WalletPage from "./pages/WalletPage";
import ErrorPage from "./pages/ErrorPage";
import AuthPage from "./pages/AuthPage";
import Cart from "./pages/Cart";
import AddProduct from "./pages/AddProduct";
import ProductDetails from "./pages/ProductDetails";
import Categories from "./pages/Categories";
import Checkout from "./pages/Checkout";
import StaticPage from "./pages/StaticPage";
import Sales from "./pages/Sales";
import SellerRegistration from "./pages/SellerRegistration";
import Orders from "./pages/Orders";
import Success from "./pages/Success";
import StorePage from "./pages/StorePage";
import PaymentCancel from "./pages/PaymentCancel";
import ChatPage from "./pages/ChatPage";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Header />,
        children: [
            {
                index: true,
                element: <Home />
            },
            {
                path: "/chat",
                element: <ChatPage />
            },
            {
                path: "/chat/:chatId",
                element: <ChatPage />
            },
            {
                path: '/profile',
                element: <ProfilePage />
            },
            {
                path: '/wallet',
                element: <WalletPage />
            },
            {
                path: "/cart",
                element: <Cart />
            },
            {
                path: "/categories",
                element: <Categories />
            },
            {
                path: "/c/:category",
                element: <Home />
            },
            {
                path: "/sales",
                element: <Sales />
            },
            {
                path: "/products/:id",
                element: <ProductDetails />
            },
            {
                path: "/store/:sellerId",
                element: <StorePage />
            },
            {
                path: "/checkout",
                element: <Checkout />
            },
            {
                path: '*',
                element: <ErrorPage />
            },
            {
                path: "/about",
                element: <StaticPage />
            },
            {
                path: "/careers",
                element: <StaticPage />
            },
            {
                path: "/terms",
                element: <StaticPage />
            },
            {
                path: "/faq",
                element: <StaticPage />
            },
            {
                path: "/contact",
                element: <StaticPage />
            },
            {
                path: "/orders",
                element: <Orders />
            },
            {
                path: "/success",
                element: <Success />
            },
            {
                path: "/payment-cancel",
                element: <PaymentCancel />
            },
        ],
    },
    {
        path: "/login",
        element: <AuthPage />
    },
    {
        path: "/add-product",
        element: <AddProduct />,
    },
    {
        path: "/edit-product/:id",
        element: <AddProduct />,
    },
    {
        path: "/seller-register",
        element: <SellerRegistration />
    }

]);

export default router;
