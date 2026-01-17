const fs = require('fs');
const path = "c:/Users/user/OneDrive/文档/Sigma School 2025/Capstone Project/frontend/src/pages/Orders.jsx";
try {
    let content = fs.readFileSync(path, 'utf8');
    if (content.includes('<span className="fw-bold">Free</span>')) {
        content = content.replace('<span className="fw-bold">Free</span>', '<span className="fw-bold">RM5.00</span>');
        fs.writeFileSync(path, content);
        console.log('Successfully replaced Free with RM5.00');
    } else {
        console.log('Target string not found, maybe already fixed?');
    }
} catch (e) {
    console.error('Error:', e);
}
