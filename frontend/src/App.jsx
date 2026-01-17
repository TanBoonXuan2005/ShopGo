import { RouterProvider } from "react-router-dom";
import router from "./routes.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthProvider } from "./components/AuthProvider.jsx";
import { CartProvider } from "./components/CartContext.jsx";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </AuthProvider>
  );
}