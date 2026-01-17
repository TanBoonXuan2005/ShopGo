import { createBrowserRouter } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
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
import SellerCentre from "./pages/SellerCentre";

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
                path: '/profile',
                element: <Profile />
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
                path: "/seller-centre",
                element: <SellerCentre />
            }
        ],
    },
    {
        path: "/login",
        element: <AuthPage />
    },
    {
        path: "/add",
        element: <AddProduct />
    },
    {
        path: "/seller-register",
        element: <SellerRegistration />
    }

]);

export default router;
