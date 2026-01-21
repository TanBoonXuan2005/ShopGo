/**
 * HTML Templates for Emails
 */
const getWelcomeEmailHtml = () => `
<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
    <h2 style="color: #000;">Welcome to ShopGo!</h2>
    <p>Hi there,</p>
    <p>Thank you for subscribing to our newsletter. You're now on the list to receive:</p>
    <ul>
        <li>Exclusive flash sale alerts ⚡</li>
        <li>New arrival notifications 📦</li>
        <li>Members-only vouchers 🎟️</li>
    </ul>
    <p>Stay tuned!</p>
    <hr>
    <p style="font-size: 12px; color: #777;">&copy; ${new Date().getFullYear()} ShopGo. All rights reserved.</p>
</div>
`;

module.exports = { getWelcomeEmailHtml };
