# ShopGo E-commerce Platform

A full-stack e-commerce application built with the PERN stack (PostgreSQL, Express, React, Node.js).

## Features
-   **User Authentication**: Secure login/register with role-based access (Buyer/Seller).
-   **Product Management**: Browsing, searching, and filtering.
-   **Shopping Cart**: Persistent cart functionality.
-   **Secure Payments**: Integrated with Stripe Hosted Checkout.
-   **Order Management**: Track order status (To Pay, To Ship, To Receive, Completed).
-   **Reviews System**: Verified purchase ratings and reviews.
-   **Seller Centre**: Dedicated portal for sellers to manage products.

## Tech Stack
-   **Frontend**: React, Vite, React Bootstrap
-   **Backend**: Node.js, Express
-   **Database**: PostgreSQL (NeonDB)
-   **Payment**: Stripe API

## Getting Started
1.  Install dependencies: `npm install` in both `frontend` and `backend`.
2.  Setup `.env` in `backend` with Database URL and Stripe Keys.
3.  Run backend: `node index.js`.
4.  Run frontend: `npm run dev`.
